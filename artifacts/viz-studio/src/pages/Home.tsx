import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  BookOpen,
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  LifeBuoy,
  Loader2,
  Palette,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  useListCes,
  useCreateCe,
  useDeleteCe,
  useRestoreCe,
  usePermanentDeleteCe,
  getListCesQueryKey,
  type Ce,
} from "@workspace/api-client-react";
import { BRAND } from "@/lib/brand";
import { HeadoutLogo } from "@/components/HeadoutLogo";
import { SpotlightTour } from "@/components/SpotlightTour";

const QUICK_PICKS = [
  { name: "Vatican Museums", city: "Vatican City", country: "Vatican City" },
  { name: "Eiffel Tower", city: "Paris", country: "France" },
  { name: "Galleria dell'Accademia", city: "Florence", country: "Italy" },
  { name: "Seine River Cruise", city: "Paris", country: "France" },
  { name: "Sagrada Família", city: "Barcelona", country: "Spain" },
  { name: "Statue of Liberty", city: "New York", country: "USA" },
];

/**
 * Mirror of the api-server's LOCKED_CE_SLUGS (artifacts/api-server/src/lib/
 * locked-ces.ts). Curated CEs have hand-built chart decks and are immune to
 * regeneration; we show them as a separate breakdown pill in the library
 * header. Keep this list in sync if the server-side list changes.
 */
const CURATED_CE_SLUGS = new Set([
  "galleria-dellaccademia",
  "galleria-degli-uffizi",
  "duomo-di-firenze",
  "colosseum",
  "vatican-museums",
]);

type CeStatusKind = "locked" | "drafts_waiting" | "stale" | "published" | "empty";

interface CeStatusInfo {
  kind: CeStatusKind;
  label: string;
  bg: string;
  color: string;
}

/**
 * Derive the status badge for a CE. Priority:
 *   1. LOCKED — curated decks (immune to regen), always wins.
 *   2. DRAFTS — any draft chart pending review.
 *   3. STALE — DRD older than 30 days (research likely outdated).
 *   4. PUBLISHED — at least one published chart and a fresh-enough DRD.
 *   5. EMPTY — fallback for CEs with no charts at all.
 * DRD freshness intentionally does not block PUBLISHED for curated CEs;
 * curated decks don't depend on DRDs.
 */
function deriveCeStatus(
  ce: Ce,
  isCurated: boolean,
  drdAgeDays: number | null,
): CeStatusInfo {
  if (isCurated) {
    return {
      kind: "locked",
      label: "LOCKED",
      bg: "#EFE2FF",
      color: "#6B00CC",
    };
  }
  if ((ce.draftCount ?? 0) > 0) {
    return {
      kind: "drafts_waiting",
      label: "DRAFTS",
      bg: "#DCEBFF",
      color: "#1255B3",
    };
  }
  if (drdAgeDays !== null && drdAgeDays > 30) {
    return {
      kind: "stale",
      label: "STALE",
      bg: "#FFF1D9",
      color: "#946100",
    };
  }
  if ((ce.publishedCount ?? ce.chartCount ?? 0) > 0) {
    return {
      kind: "published",
      label: "PUBLISHED",
      bg: "#D2FDEB",
      color: "#0E8F4E",
    };
  }
  return {
    kind: "empty",
    label: "EMPTY",
    bg: "#F2F2F2",
    color: "#5A5A5A",
  };
}

function drdAgeDaysOf(ce: Ce): number | null {
  if (!ce.drdUpdatedAt) return null;
  const then = new Date(ce.drdUpdatedAt).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24)));
}

function drdAgeColor(days: number | null): string {
  if (days === null) return "#A6A6A6";
  if (days < 7) return "#0E8F4E";
  if (days < 30) return "#946100";
  return "#B3001F";
}

function formatTimeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return "just now";
  const m = Math.floor(diffSec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export default function Home() {
  const { data: ces, isLoading } = useListCes();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const createMut = useCreateCe();
  const deleteMut = useDeleteCe();
  const permanentDeleteMut = usePermanentDeleteCe();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showDrd, setShowDrd] = useState(false);
  const [drdMarkdown, setDrdMarkdown] = useState("");
  const [drdPdf, setDrdPdf] = useState<File | null>(null);
  const [drdUploading, setDrdUploading] = useState(false);

  const apiBase = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

  const [progressTick, setProgressTick] = useState(0);
  useEffect(() => {
    if (!createMut.isPending) return;
    setProgressTick(0);
    const id = setInterval(() => setProgressTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [createMut.isPending]);

  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "draft" | "archive"
  >("all");

  // Separate query for the Archive tab — soft-deleted CEs only. The
  // server splits live vs archived rows by `?archived=true`, so the
  // default `useListCes()` above never returns archived rows and we
  // can keep both buckets in independently-cached queries.
  const { data: archivedCes } = useListCes({ archived: true });
  const restoreMut = useRestoreCe();

  const sortedCes = useMemo(
    () => [...(ces ?? [])].sort((a, b) => b.id - a.id),
    [ces],
  );
  const sortedArchivedCes = useMemo(
    () => [...(archivedCes ?? [])],
    [archivedCes],
  );
  const archivedCount = sortedArchivedCes.length;

  // CE-level filter buckets are derived from the per-CE chart status counts
  // returned by GET /ces (draftCount / publishedCount). `ce.status` is the
  // CE workflow state ("ready" / "draft" / etc.) — NOT a chart-publication
  // signal — so it can't be used here.
  // - "draft" bucket: any CE with at least one draft chart.
  // - "published" bucket: any CE with at least one published chart.
  // (A CE with both will show in both buckets, matching writer intent.)
  const filteredCes = useMemo(() => {
    if (statusFilter === "archive") return sortedArchivedCes;
    if (statusFilter === "all") return sortedCes;
    if (statusFilter === "draft") {
      return sortedCes.filter((c) => (c.draftCount ?? 0) > 0);
    }
    return sortedCes.filter((c) => (c.publishedCount ?? c.chartCount ?? 0) > 0);
  }, [sortedCes, sortedArchivedCes, statusFilter]);

  const draftCesCount = sortedCes.filter((c) => (c.draftCount ?? 0) > 0).length;
  const publishedCesCount = sortedCes.filter(
    (c) => (c.publishedCount ?? c.chartCount ?? 0) > 0,
  ).length;
  const curatedCesCount = sortedCes.filter((c) =>
    CURATED_CE_SLUGS.has(c.slug),
  ).length;

  // City clusters — group every CE by city, then sort by member count
  // descending so the most-populous city (Florence, etc.) leads the row.
  // Each cluster carries its own draft/published roll-up.
  const cityClusters = useMemo(() => {
    const byCity = new Map<
      string,
      { city: string; ces: Ce[]; published: number; drafts: number }
    >();
    for (const c of sortedCes) {
      const key = c.city || "Unknown";
      let bucket = byCity.get(key);
      if (!bucket) {
        bucket = { city: key, ces: [], published: 0, drafts: 0 };
        byCity.set(key, bucket);
      }
      bucket.ces.push(c);
      if ((c.publishedCount ?? c.chartCount ?? 0) > 0) bucket.published += 1;
      if ((c.draftCount ?? 0) > 0) bucket.drafts += 1;
    }
    return Array.from(byCity.values()).sort(
      (a, b) => b.ces.length - a.ces.length || a.city.localeCompare(b.city),
    );
  }, [sortedCes]);

  // "Recently opened" = the four most-recently-touched CEs by `updatedAt`,
  // which the api-server bumps on every CE / chart edit. Falls back to
  // `createdAt` if `updatedAt` is missing (defensive — the API always
  // returns both today).
  const recentCes = useMemo(() => {
    const tsOf = (c: Ce) =>
      new Date(c.updatedAt ?? c.createdAt ?? 0).getTime() || 0;
    return [...sortedCes].sort((a, b) => tsOf(b) - tsOf(a)).slice(0, 4);
  }, [sortedCes]);

  function applyQuickPick(p: (typeof QUICK_PICKS)[number]) {
    setName(p.name);
    setCity(p.city);
    setCountry(p.country);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !city.trim() || !country.trim()) {
      setError("Name, city, and country are required.");
      return;
    }
    // CE Intel is always the first step for a NEW CE: create the CE without an
    // auto-generated starter deck and route to the review step, where the deck
    // is assembled from the plan (DRD-grounded when a DRD is attached, or a
    // deterministic page-template deck when it isn't). A DRD is optional here.
    const hasDrdMd = drdMarkdown.trim().length > 0;
    try {
      const result = await createMut.mutateAsync({
        data: {
          name: name.trim(),
          city: city.trim(),
          country: country.trim(),
        },
      });
      qc.invalidateQueries({ queryKey: getListCesQueryKey() });

      // Optional DRD upload — runs after CE creation succeeds. We don't
      // block navigation on its outcome: if the upload fails we surface
      // the error and the writer can retry from the CE detail page.
      if (drdPdf || hasDrdMd) {
        setDrdUploading(true);
        try {
          const fd = new FormData();
          fd.append("ceSlug", result.ce.slug);
          if (drdPdf) {
            fd.append("file", drdPdf);
          } else if (hasDrdMd) {
            fd.append("markdown", drdMarkdown.trim());
          }
          const drdRes = await fetch(`${apiBase}/api/drds`, {
            method: "POST",
            body: fd,
          });
          if (!drdRes.ok) {
            let msg = `DRD upload failed (${drdRes.status})`;
            try {
              const body = (await drdRes.json()) as { error?: string };
              if (body.error) msg = body.error;
            } catch {
              /* keep default */
            }
            // CE was created — surface the DRD error but don't roll back.
            setError(`CE created, but ${msg}. You can re-upload the DRD on the CE page.`);
            setDrdUploading(false);
            return;
          }
        } catch (err) {
          setError(
            `CE created, but DRD upload failed (${
              err instanceof Error ? err.message : "unknown"
            }). You can re-upload from the CE page.`,
          );
          setDrdUploading(false);
          return;
        }
        setDrdUploading(false);
      }

      setName("");
      setCity("");
      setCountry("");
      setDrdMarkdown("");
      setDrdPdf(null);
      setShowDrd(false);
      navigate(`/ce/${result.ce.slug}/review`);
    } catch (err) {
      const msg =
        err && typeof err === "object" && "data" in err
          ? (err as { data?: { error?: string } }).data?.error ??
            "Generation failed"
          : "Generation failed";
      setError(msg);
    }
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: BRAND.bgShell }}
    >
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{
          background: "rgba(250, 247, 255, 0.85)",
          borderBottom: `1px solid ${BRAND.slate100}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <HeadoutLogo height={22} />
          <div
            style={{
              width: 1,
              height: 26,
              background: BRAND.slate200,
            }}
          />
          <div className="flex-1 min-w-0">
            <div
              style={{
                fontWeight: 800,
                color: BRAND.slate950,
                letterSpacing: "-0.01em",
                fontSize: 16,
                lineHeight: 1.1,
              }}
            >
              Viz Studio
            </div>
            <div
              style={{
                fontSize: 11,
                color: BRAND.slate700,
                fontWeight: 600,
                marginTop: 2,
              }}
            >
              AI-generated visuals for listing pages
            </div>
          </div>
          <div className="flex items-center gap-2" data-tour="main-nav">
            <Link
              href="/guide"
              className="inline-flex items-center gap-1.5"
              style={{
                background: BRAND.purpsSoft,
                color: BRAND.purps,
                padding: "6px 11px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "-0.005em",
                textDecoration: "none",
              }}
            >
              <LifeBuoy size={13} strokeWidth={2.5} />
              Guide
            </Link>
            <Link
              href="/question-bank"
              className="inline-flex items-center gap-1.5"
              style={{
                background: BRAND.purpsSoft,
                color: BRAND.purps,
                padding: "6px 11px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "-0.005em",
                textDecoration: "none",
              }}
            >
              <BookOpen size={13} strokeWidth={2.5} />
              Question bank
            </Link>
            <Link
              href="/style"
              className="inline-flex items-center gap-1.5"
              style={{
                background: BRAND.purpsSoft,
                color: BRAND.purps,
                padding: "6px 11px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "-0.005em",
                textDecoration: "none",
              }}
            >
              <Palette size={13} strokeWidth={2.5} />
              Style guide
            </Link>
            <span
              style={{
                background: BRAND.purpsSoft,
                color: BRAND.purps,
                padding: "5px 10px",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Internal
            </span>
          </div>
        </div>
      </header>

      <AttentionBanner ces={ces} />

      <main className="max-w-7xl mx-auto px-6 py-10 grid lg:grid-cols-[420px_1fr] gap-10">
        {/* CREATE PANEL */}
        <section
          data-tour="create-panel"
          className="lg:sticky lg:top-24 self-start"
          style={{ height: "fit-content" }}
        >
          <div
            className="rounded-3xl p-7"
            style={{
              background: "white",
              boxShadow: "var(--shadow-card)",
              border: `1px solid ${BRAND.slate100}`,
            }}
          >
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: BRAND.purpsSoft,
                color: BRAND.purps,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <Sparkles size={12} strokeWidth={2.5} />
              New CE
            </div>
            <h1
              className="mt-3"
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: BRAND.slate950,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              Generate visuals for a new attraction
            </h1>
            <p
              className="mt-2"
              style={{
                color: BRAND.slate700,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Pick any attraction or experience. We'll identify the most
              important questions visitors ask and generate 4–6 tailored,
              embeddable visualizations.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
              <Field
                label="Attraction / experience"
                value={name}
                onChange={setName}
                placeholder="e.g. Vatican Museums"
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="City"
                  value={city}
                  onChange={setCity}
                  placeholder="Vatican City"
                />
                <Field
                  label="Country"
                  value={country}
                  onChange={setCountry}
                  placeholder="Vatican City"
                />
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setShowDrd((v) => !v)}
                  style={{
                    alignSelf: "flex-start",
                    background: showDrd ? BRAND.purpsSoft : "transparent",
                    color: BRAND.purps,
                    border: `1px solid ${
                      showDrd ? BRAND.purps : BRAND.slate200
                    }`,
                    borderRadius: 999,
                    padding: "5px 12px",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.02em",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <FileText size={12} strokeWidth={2.5} />
                  {showDrd ? "Hide DRD" : "Attach DRD (optional)"}
                  {(drdPdf || drdMarkdown.trim()) && !showDrd && " · 1"}
                </button>
                {showDrd && (
                  <div
                    style={{
                      background: BRAND.slate50,
                      border: `1px solid ${BRAND.slate200}`,
                      borderRadius: 14,
                      padding: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: BRAND.slate700,
                        fontWeight: 600,
                        lineHeight: 1.5,
                      }}
                    >
                      DRD optional — improves accuracy. Paste the Deep
                      Research Doc (markdown) or upload it as a PDF to ground
                      chart numbers in primary research. Without a DRD the
                      pipeline uses live web search instead.
                    </div>
                    <textarea
                      value={drdMarkdown}
                      onChange={(e) => setDrdMarkdown(e.target.value)}
                      placeholder="Paste DRD markdown here…"
                      rows={5}
                      disabled={!!drdPdf}
                      style={{
                        background: drdPdf ? BRAND.slate100 : "white",
                        border: `1px solid ${BRAND.slate200}`,
                        borderRadius: 10,
                        padding: "8px 10px",
                        fontSize: 12,
                        fontWeight: 500,
                        color: BRAND.slate950,
                        outline: "none",
                        fontFamily: "inherit",
                        resize: "vertical",
                        minHeight: 90,
                        opacity: drdPdf ? 0.6 : 1,
                      }}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <label
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: BRAND.purps,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <input
                          type="file"
                          accept="application/pdf"
                          style={{ display: "none" }}
                          onChange={(e) =>
                            setDrdPdf(e.target.files?.[0] ?? null)
                          }
                        />
                        {drdPdf ? "Replace PDF" : "Or attach PDF"}
                      </label>
                      {drdPdf && (
                        <div
                          className="flex items-center gap-2 min-w-0"
                          style={{
                            fontSize: 11,
                            color: BRAND.slate700,
                            fontWeight: 600,
                          }}
                        >
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 180,
                            }}
                            title={drdPdf.name}
                          >
                            {drdPdf.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setDrdPdf(null)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: BRAND.slate500,
                              cursor: "pointer",
                              padding: 0,
                            }}
                            aria-label="Remove PDF"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: BRAND.slate500,
                        fontWeight: 600,
                      }}
                    >
                      PDFs ≤ 20 MB. If you attach both, the PDF wins.
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div
                  className="text-sm rounded-xl px-3 py-2"
                  style={{
                    background: BRAND.candySoft,
                    color: BRAND.candy,
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={createMut.isPending || drdUploading}
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 transition active:scale-[.98]"
                style={{
                  background: createMut.isPending ? BRAND.purpsHover : BRAND.purps,
                  color: "white",
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: "-0.005em",
                  border: "none",
                  cursor: createMut.isPending ? "wait" : "pointer",
                  opacity: createMut.isPending ? 0.95 : 1,
                }}
              >
                {createMut.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating · {progressTick}s
                  </>
                ) : drdUploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Uploading DRD…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} strokeWidth={2.5} />
                    Generate visualization set
                  </>
                )}
              </button>
              {createMut.isPending && (
                <p
                  style={{
                    color: BRAND.slate700,
                    fontSize: 11,
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  Identifying CE-specific questions and designing charts. This
                  usually takes 15–45 seconds.
                </p>
              )}
            </form>

            <div className="mt-6">
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: BRAND.slate700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Quick picks
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PICKS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyQuickPick(p)}
                    style={{
                      background: BRAND.bgLilac,
                      color: BRAND.purps,
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "none",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Right column of the 2-col main grid — wraps Recently opened +
            library list so they share a single grid cell. Without this
            wrapper they'd become separate grid children and break the
            `[420px_1fr]` layout on large screens. */}
        <div className="flex flex-col gap-8 min-w-0">
        {/* RECENTLY OPENED — surfaces the 4 most-recently-touched CEs as a
            quick re-entry strip above the full library grid. Hidden until
            data loads and until there are at least 2 CEs, so it doesn't
            show up empty on a fresh install. */}
        {!isLoading && recentCes.length >= 2 && (
          <section>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: BRAND.slate950,
                  letterSpacing: "-0.01em",
                  textTransform: "uppercase",
                }}
              >
                Recently opened
              </h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {recentCes.map((ce) => (
                <Link
                  key={ce.id}
                  href={`/ce/${ce.slug}`}
                  className="block rounded-2xl p-3 transition hover:-translate-y-0.5"
                  style={{
                    background: "white",
                    border: `1px solid ${BRAND.slate100}`,
                    boxShadow: "var(--shadow-soft)",
                    textDecoration: "none",
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: BRAND.bgLilac,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      {ce.emoji}
                    </div>
                    <div className="min-w-0">
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: BRAND.slate950,
                          letterSpacing: "-0.01em",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {ce.name}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: BRAND.slate700,
                          fontWeight: 600,
                          marginTop: 1,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {ce.city} ·{" "}
                        {formatTimeAgo(ce.updatedAt ?? ce.createdAt ?? "")}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CE LIST */}
        <section>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <h2
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: BRAND.slate950,
                letterSpacing: "-0.015em",
              }}
            >
              Your library
              <span
                style={{
                  marginLeft: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  color: BRAND.slate700,
                }}
              >
                {sortedCes.length} {sortedCes.length === 1 ? "CE" : "CEs"}
              </span>
            </h2>
            <div className="flex items-center gap-2">
              {(
                [
                  ["all", `All (${sortedCes.length})`],
                  ["published", `Published (${publishedCesCount})`],
                  ["draft", `Drafts (${draftCesCount})`],
                  ["archive", `Archive (${archivedCount})`],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  style={{
                    background:
                      statusFilter === value ? BRAND.purps : "white",
                    color: statusFilter === value ? "white" : BRAND.slate700,
                    border: `1px solid ${
                      statusFilter === value ? BRAND.purps : BRAND.slate200
                    }`,
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Breakdown pills — curated/published/drafts roll-up shown as a
              read-only summary strip under the header. The filter buttons
              above remain the interactive control. */}
          {!isLoading && sortedCes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              <BreakdownPill
                label="Curated"
                count={curatedCesCount}
                bg={BRAND.purpsSoft}
                color={BRAND.purps}
              />
              <span style={{ color: BRAND.slate500, fontWeight: 700 }}>·</span>
              <BreakdownPill
                label="Published"
                count={publishedCesCount}
                bg={BRAND.bgMint}
                color="#0E8F4E"
              />
              <span style={{ color: BRAND.slate500, fontWeight: 700 }}>·</span>
              <BreakdownPill
                label="Drafts"
                count={draftCesCount}
                bg={BRAND.holaSoft}
                color={BRAND.slate950}
              />
            </div>
          )}

          {/* City clusters — at-a-glance roll-up of every city represented
              in the library, with per-cluster draft/published counts. */}
          {!isLoading && cityClusters.length > 0 && (
            <div
              className="rounded-2xl p-3 mb-4 flex flex-wrap gap-2"
              style={{
                background: "white",
                border: `1px solid ${BRAND.slate100}`,
              }}
            >
              {cityClusters.map((cluster) => (
                <div
                  key={cluster.city}
                  style={{
                    background: BRAND.slate50,
                    border: `1px solid ${BRAND.slate100}`,
                    borderRadius: 12,
                    padding: "6px 10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: BRAND.slate950,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {cluster.city}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: BRAND.slate700,
                    }}
                  >
                    {cluster.ces.length} CE
                    {cluster.ces.length === 1 ? "" : "s"}
                  </span>
                  {cluster.published > 0 && (
                    <span
                      title="Published"
                      style={{
                        background: BRAND.bgMint,
                        color: "#0E8F4E",
                        padding: "1px 6px",
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      {cluster.published}P
                    </span>
                  )}
                  {cluster.drafts > 0 && (
                    <span
                      title="Drafts"
                      style={{
                        background: BRAND.holaSoft,
                        color: BRAND.slate950,
                        padding: "1px 6px",
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      {cluster.drafts}D
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {isLoading ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: "white", border: `1px solid ${BRAND.slate100}` }}
            >
              <Loader2
                size={20}
                className="animate-spin inline"
                color={BRAND.purps}
              />
            </div>
          ) : filteredCes.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4" data-tour="ce-library">
              {filteredCes.map((ce) => (
                <CeCard
                  key={ce.id}
                  ce={ce}
                  isArchived={statusFilter === "archive"}
                  onRestore={async () => {
                    await restoreMut.mutateAsync({ slug: ce.slug });
                    // Invalidate both live + archived lists since the row
                    // moves between buckets.
                    qc.invalidateQueries({
                      queryKey: getListCesQueryKey(),
                    });
                    qc.invalidateQueries({
                      queryKey: getListCesQueryKey({ archived: true }),
                    });
                  }}
                  onPermanentDelete={async () => {
                    if (
                      !confirm(
                        `Permanently delete "${ce.name}"? This cannot be undone — the slug will be freed and all charts, DRDs, and intelligence data will be erased.`,
                      )
                    )
                      return;
                    await permanentDeleteMut.mutateAsync({ slug: ce.slug });
                    qc.invalidateQueries({ queryKey: getListCesQueryKey() });
                    qc.invalidateQueries({
                      queryKey: getListCesQueryKey({ archived: true }),
                    });
                  }}
                  onDelete={async () => {
                    if (!confirm(`Archive "${ce.name}"? You can restore it from the Archive tab.`)) return;
                    await deleteMut.mutateAsync({ slug: ce.slug });
                    qc.invalidateQueries({ queryKey: getListCesQueryKey() });
                    qc.invalidateQueries({
                      queryKey: getListCesQueryKey({ archived: true }),
                    });
                  }}
                  onCopyLink={async () => {
                    // Copy the absolute studio link for the CE so writers
                    // can paste it into tickets / chat. Uses window.origin
                    // + BASE_URL (the artifact's mounted path prefix).
                    const url = `${window.location.origin}${apiBase}/ce/${ce.slug}`;
                    try {
                      await navigator.clipboard.writeText(url);
                    } catch {
                      // Older browsers / non-secure contexts: fall back to
                      // a no-op prompt so the writer still sees the value.
                      window.prompt("Copy CE link", url);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>
        </div>
      </main>
      <SpotlightTour />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: BRAND.slate700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: BRAND.slate50,
          border: `1px solid ${BRAND.slate200}`,
          borderRadius: 12,
          padding: "12px 14px",
          fontSize: 14,
          fontWeight: 600,
          color: BRAND.slate950,
          outline: "none",
          fontFamily: "inherit",
        }}
      />
    </label>
  );
}

function BreakdownPill({
  label,
  count,
  bg,
  color,
}: {
  label: string;
  count: number;
  bg: string;
  color: string;
}) {
  return (
    <span
      style={{
        background: bg,
        color,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.01em",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span style={{ fontSize: 12 }}>{count}</span>
      {label}
    </span>
  );
}

/**
 * AttentionBanner — a single skim-line above the main grid that surfaces
 * the two things that block writers from shipping: charts pending review
 * (status='draft') and DRDs older than 30 days (research likely stale).
 * Hidden entirely when there's nothing to do, so the page doesn't carry
 * a permanent "nag" strip.
 */
function AttentionBanner({ ces }: { ces: Ce[] | undefined }) {
  const stats = useMemo(() => {
    if (!ces || ces.length === 0)
      return { draftCharts: 0, draftCes: 0, staleCes: 0 };
    let draftCharts = 0;
    let draftCes = 0;
    let staleCes = 0;
    for (const ce of ces) {
      const drafts = ce.draftCount ?? 0;
      if (drafts > 0) {
        draftCharts += drafts;
        draftCes += 1;
      }
      // STALE excludes curated decks (they don't depend on DRDs) and
      // excludes CEs without a DRD at all (those need an upload, not a
      // freshness nag).
      if (!CURATED_CE_SLUGS.has(ce.slug)) {
        const days = drdAgeDaysOf(ce);
        if (days !== null && days > 30) staleCes += 1;
      }
    }
    return { draftCharts, draftCes, staleCes };
  }, [ces]);

  if (stats.draftCharts === 0 && stats.staleCes === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 pt-6">
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap"
        style={{
          background: "#FFF7E6",
          border: "1px solid #F5D793",
          color: "#7A4F00",
        }}
      >
        <AlertTriangle size={16} strokeWidth={2.5} />
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.01em" }}>
          Needs attention
        </span>
        <div className="flex items-center gap-3 flex-wrap" style={{ fontSize: 12, fontWeight: 600 }}>
          {stats.draftCharts > 0 && (
            <span>
              <b>{stats.draftCharts}</b> draft chart
              {stats.draftCharts === 1 ? "" : "s"} pending review across{" "}
              <b>{stats.draftCes}</b> CE{stats.draftCes === 1 ? "" : "s"}
            </span>
          )}
          {stats.draftCharts > 0 && stats.staleCes > 0 && (
            <span style={{ color: "#C19A3D" }}>•</span>
          )}
          {stats.staleCes > 0 && (
            <span>
              <b>{stats.staleCes}</b> CE{stats.staleCes === 1 ? "" : "s"} with DRD
              older than 30 days
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CeCard({
  ce,
  onDelete,
  onRestore,
  onPermanentDelete,
  onCopyLink,
  isArchived = false,
}: {
  ce: Ce;
  onDelete: () => void;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
  onCopyLink: () => void;
  /**
   * When true the card represents a soft-deleted CE in the Archive
   * tab. We swap the Delete affordance for a Restore button and
   * surface an "Archived" pill instead of the live status badge.
   */
  isArchived?: boolean;
}) {
  const isCurated = CURATED_CE_SLUGS.has(ce.slug);
  const drdDays = drdAgeDaysOf(ce);
  const status = deriveCeStatus(ce, isCurated, drdDays);
  const drdColor = drdAgeColor(drdDays);
  return (
    <Link
      href={`/ce/${ce.slug}`}
      className="ce-card block rounded-2xl p-5 transition hover:-translate-y-0.5"
      style={{
        background: "white",
        border: `1px solid ${BRAND.slate100}`,
        boxShadow: "var(--shadow-soft)",
        textDecoration: "none",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: BRAND.bgLilac,
              display: "grid",
              placeItems: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            {ce.emoji}
          </div>
          <div className="min-w-0">
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: BRAND.slate950,
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {ce.name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: BRAND.slate700,
                fontWeight: 600,
                marginTop: 1,
              }}
            >
              {ce.city}, {ce.country}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isArchived ? (
            <span
              title={
                ce.archivedAt
                  ? `Archived ${new Date(ce.archivedAt).toLocaleString()}`
                  : "Archived"
              }
              style={{
                background: BRAND.slate100,
                color: BRAND.slate700,
                padding: "3px 8px",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.04em",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Archive size={11} />
              ARCHIVED
            </span>
          ) : (
            <span
              title={`Status: ${status.label}`}
              style={{
                background: status.bg,
                color: status.color,
                padding: "3px 8px",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.04em",
              }}
            >
              {status.label}
            </span>
          )}
          {isArchived && onRestore ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRestore();
                }}
                style={{
                  background: BRAND.purpsSoft,
                  border: `1px solid ${BRAND.purpsSoft}`,
                  color: BRAND.purps,
                  cursor: "pointer",
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
                title="Restore this CE"
              >
                <RotateCcw size={12} />
                Restore
              </button>
              {onPermanentDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onPermanentDelete();
                  }}
                  style={{
                    background: "transparent",
                    border: `1px solid #FFCDD4`,
                    color: "#B3001F",
                    cursor: "pointer",
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  title="Permanently delete — frees the slug"
                >
                  <Trash2 size={12} />
                  Delete forever
                </button>
              )}
            </>
          ) : (
            // Locked / curated CEs are guarded server-side (409). Hiding
            // the Delete button here keeps the UI consistent with that
            // contract instead of inviting a guaranteed-to-fail action.
            !isCurated && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: BRAND.slate500,
                  cursor: "pointer",
                  padding: 6,
                  borderRadius: 8,
                }}
                title="Archive"
              >
                <Trash2 size={16} />
              </button>
            )
          )}
        </div>
      </div>
      {ce.summary && (
        <p
          style={{
            color: BRAND.slate700,
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 1.4,
            marginTop: 12,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {ce.summary}
        </p>
      )}
      <div
        className="mt-4 flex items-center justify-between flex-wrap gap-2"
        style={{ borderTop: `1px solid ${BRAND.slate100}`, paddingTop: 10 }}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            style={{
              background: BRAND.bgMint,
              color: "#0E8F4E",
              padding: "3px 8px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {ce.chartCount} chart{ce.chartCount === 1 ? "" : "s"}
          </span>
          {(ce.draftCount ?? 0) > 0 && (
            <span
              style={{
                background: "#DCEBFF",
                color: "#1255B3",
                padding: "3px 8px",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              +{ce.draftCount} draft
            </span>
          )}
          <span
            title={
              drdDays === null
                ? "No DRD uploaded"
                : `DRD updated ${drdDays} day${drdDays === 1 ? "" : "s"} ago`
            }
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: drdColor,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            ◐ DRD {drdDays === null ? "—" : `${drdDays}d`}
          </span>
        </div>
        {/* Quick actions row — always visible (keyboard- and touch-friendly).
            Earlier iteration tried hover-only reveal but it hid useful CTAs
            on touch devices and was redundant with the parent card hover. */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCopyLink();
            }}
            className="ce-action"
            title="Copy CE detail link"
            style={{
              background: BRAND.slate50,
              border: `1px solid ${BRAND.slate100}`,
              color: BRAND.slate700,
              padding: "4px 8px",
              borderRadius: 8,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.02em",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Copy size={11} strokeWidth={2.5} />
            Copy
          </button>
          <span
            className="ce-action"
            style={{
              background: BRAND.purpsSoft,
              color: BRAND.purps,
              padding: "4px 8px",
              borderRadius: 8,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.02em",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Edit3 size={11} strokeWidth={2.5} />
            Edit
          </span>
          <span
            style={{
              color: BRAND.purps,
              fontSize: 12,
              fontWeight: 800,
              marginLeft: 4,
            }}
          >
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div
      className="rounded-3xl p-10 flex flex-col items-center text-center"
      style={{
        background: "white",
        border: `2px dashed ${BRAND.slate200}`,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: BRAND.purpsSoft,
          color: BRAND.purps,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Plus size={26} strokeWidth={2.5} />
      </div>
      <h3
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: BRAND.slate950,
          letterSpacing: "-0.01em",
          marginTop: 14,
        }}
      >
        No CEs yet
      </h3>
      <p
        style={{
          color: BRAND.slate700,
          fontSize: 13,
          fontWeight: 500,
          marginTop: 4,
          maxWidth: 320,
        }}
      >
        Try one of the quick picks or enter your own attraction. Each CE gets
        4–6 tailored, embeddable charts.
      </p>
    </div>
  );
}
