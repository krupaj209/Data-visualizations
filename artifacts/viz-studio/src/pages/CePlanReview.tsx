import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useGetCe, getGetCeQueryKey } from "@workspace/api-client-react";
import { BRAND } from "@/lib/brand";
import { CHART_TYPE_META } from "@/components/charts/meta";
import { HeadoutLogo } from "@/components/HeadoutLogo";
import { ChartRenderer } from "@/components/charts";
import { ARCHETYPE_SAMPLES } from "@/lib/archetype-samples";
import { ArchetypeGalleryModal } from "@/components/ArchetypeGalleryModal";
import type { ChartArchetypeId } from "@workspace/question-bank";

/* -------------------------------------------------------------------------- */
/* Plan shape (loose — fetched as raw JSON, mirrors CeVisualizationPlan)        */
/* -------------------------------------------------------------------------- */

interface PlanVisualization {
  question: string;
  archetype: string;
  why_it_matters?: string;
  data_needed?: string[];
  evidence_refs?: string[];
  quality_score?: {
    traveler_usefulness?: number;
    evidence_strength?: number;
    uniqueness?: number;
    visual_fit?: number;
    ce_specificity?: number;
    cms_value?: number;
    verifier_risk?: number;
    overall?: number;
    label?: string;
    rationale?: string;
  };
  priority?: number;
  mandatory?: boolean;
}

interface ReviewPlan {
  summary?: string;
  generatedAt?: string;
  evidence_inventory_detailed?: {
    categories?: {
      id: string;
      label: string;
      strength?: string;
      items?: {
        id: string;
        claim: string;
        confidence: number;
        source_type?: string;
        source_ref?: string;
      }[];
    }[];
  };
  recommended_visualizations: PlanVisualization[];
  live_search_notes?: { finding: string; source_url?: string }[];
}

/* -------------------------------------------------------------------------- */
/* Evidence snippet selection (mirrors IntelPanel.relevantEvidenceForVisualization)*/
/* -------------------------------------------------------------------------- */

const CATEGORIES_FOR_ARCHETYPE: Record<string, string[]> = {
  ticket_ladder: ["tickets", "prices", "restrictions"],
  route_profile: ["routes_stops", "durations", "opening_hours"],
  history_timeline: ["historical_events", "restrictions"],
  duration_profiles: ["durations", "routes_stops"],
  duration_stat: ["durations"],
  entrance_lanes: ["wait_times", "opening_hours", "tickets"],
  queue_compare: ["wait_times", "tickets"],
  weekly_pattern: ["crowd_claims", "opening_hours"],
  hourly_heatmap: ["crowd_claims", "opening_hours"],
  daily_pattern: ["crowd_claims", "opening_hours"],
  seasonal_curve: ["seasonality", "crowd_claims"],
  month_calendar: ["seasonality", "restrictions"],
  compare_zones: ["routes_stops", "crowd_claims", "wait_times"],
  stat_grid: ["tickets", "opening_hours", "durations"],
  co_bookings: ["nearby_pairings"],
  donut_breakdown: ["tickets", "nearby_pairings"],
};

function relevantEvidence(plan: ReviewPlan, item: PlanVisualization): string[] {
  const categories = plan.evidence_inventory_detailed?.categories ?? [];
  const evidenceRefs = new Set(
    (item.evidence_refs ?? []).map((ref) => ref.toLowerCase()),
  );
  const allowed = new Set(CATEGORIES_FOR_ARCHETYPE[item.archetype] ?? []);
  const selected: string[] = [];
  for (const category of categories) {
    for (const evidence of category.items ?? []) {
      const haystack = [
        evidence.id,
        evidence.source_ref ?? "",
        evidence.claim,
        category.id,
        category.label,
      ]
        .join(" ")
        .toLowerCase();
      const directlyReferenced =
        evidenceRefs.size > 0 &&
        Array.from(evidenceRefs).some((ref) => haystack.includes(ref));
      const categoryMatch = allowed.has(category.id);
      if (!directlyReferenced && !categoryMatch) continue;
      selected.push(
        `- [${evidence.id}] ${evidence.claim} (${evidence.source_type ?? "evidence"}, conf ${evidence.confidence}${
          evidence.source_ref ? `, ${evidence.source_ref}` : ""
        })`,
      );
    }
  }
  return Array.from(new Set(selected)).slice(0, 10);
}

/* -------------------------------------------------------------------------- */
/* Quality pill (mirrors IntelPanel.QualityScorePill)                          */
/* -------------------------------------------------------------------------- */

function qualityLabel(label: string | undefined): string {
  if (label === "needs_evidence") return "Needs evidence";
  if (label === "not_worth_charting") return "Not worth charting";
  if (label === "good_but_duplicate") return "Good but duplicate";
  return "Recommended";
}

function qualityTone(label: string | undefined): { bg: string; fg: string } {
  if (label === "needs_evidence") return { bg: BRAND.holaSoft, fg: BRAND.hola };
  if (label === "not_worth_charting") {
    return { bg: BRAND.candySoft, fg: BRAND.candy };
  }
  if (label === "good_but_duplicate") {
    return { bg: BRAND.slate100, fg: BRAND.slate700 };
  }
  return { bg: BRAND.bgMint, fg: BRAND.okayInk };
}

function QualityScorePill({
  score,
}: {
  score: NonNullable<PlanVisualization["quality_score"]>;
}) {
  const tone = qualityTone(score.label);
  return (
    <span
      style={{
        borderRadius: 999,
        padding: "3px 7px",
        background: tone.bg,
        color: tone.fg,
        fontSize: 10,
        fontWeight: 850,
      }}
    >
      {qualityLabel(score.label)} · {Math.round(score.overall ?? 0)}
    </span>
  );
}

function archetypeLabel(archetype: string): string {
  const meta = CHART_TYPE_META[archetype as keyof typeof CHART_TYPE_META];
  if (meta) return `${meta.emoji} ${meta.label}`;
  return archetype;
}

/* -------------------------------------------------------------------------- */
/* Archetype thumbnail (compact live render + click-to-gallery)               */
/* -------------------------------------------------------------------------- */

class ChartErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

function ArchetypeThumbnail({
  archetype,
  onClick,
}: {
  archetype: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  const sample = ARCHETYPE_SAMPLES[archetype as ChartArchetypeId] ?? null;
  if (!sample) return null;

  return (
    <button
      type="button"
      title="Click to explore this chart type"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
      }}
      style={{
        flexShrink: 0,
        width: 200,
        height: 120,
        borderRadius: 10,
        border: `1px solid ${BRAND.slate200}`,
        overflow: "hidden",
        background: BRAND.slate50,
        padding: 0,
        cursor: "pointer",
        position: "relative",
        display: "block",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          `0 0 0 2px ${BRAND.purps}44`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <ChartErrorBoundary
          fallback={
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: BRAND.slate500,
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              Preview unavailable
            </div>
          }
        >
          <ChartRenderer spec={sample} compact />
        </ChartErrorBoundary>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "3px 7px",
          background: "rgba(255,255,255,0.82)",
          borderTop: `1px solid ${BRAND.slate100}`,
          fontSize: 9,
          fontWeight: 800,
          color: BRAND.purps,
          textAlign: "center",
          letterSpacing: 0.3,
        }}
      >
        Click to explore ↗
      </div>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Generation progress                                                         */
/* -------------------------------------------------------------------------- */

type GenProgress = { total: number; done: number; failed: number };

export default function CePlanReview() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: ceData } = useGetCe(slug);
  const ce = ceData?.ce;

  const [plan, setPlan] = useState<ReviewPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<GenProgress | null>(null);
  const startedRef = useRef(false);

  const runPlan = useCallback(async () => {
    if (!slug) return;
    setPlanLoading(true);
    setPlanError(null);
    try {
      const res = await fetch(`/api/ce-intelligence/${slug}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          includeLiveSearch: true,
          // A brand-new CE may have no DRD yet — fall back to a deterministic
          // page-template deck instead of failing, so the writer can still
          // review and generate.
          allowDeterministic: true,
        }),
      });
      const json = (await res.json()) as ReviewPlan & { error?: string };
      if (!res.ok) {
        throw new Error(json?.error ?? `Planner failed (${res.status})`);
      }
      setPlan(json);
      // Default selection: mandatory locked on, dynamic on (planner's
      // recommended selection).
      const next: Record<string, boolean> = {};
      for (const v of json.recommended_visualizations ?? []) {
        next[v.question] = true;
      }
      setSelected(next);
    } catch (err) {
      setPlanError(
        err instanceof Error ? err.message : "Could not build the plan.",
      );
    } finally {
      setPlanLoading(false);
    }
  }, [slug]);

  // Auto-trigger the plan once on mount.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void runPlan();
  }, [runPlan]);

  const recommended = plan?.recommended_visualizations ?? [];
  const mandatory = useMemo(
    () => recommended.filter((v) => v.mandatory),
    [recommended],
  );
  const dynamic = useMemo(
    () => recommended.filter((v) => !v.mandatory),
    [recommended],
  );

  const selectedCount = useMemo(() => {
    let n = mandatory.length;
    for (const v of dynamic) if (selected[v.question]) n += 1;
    return n;
  }, [mandatory, dynamic, selected]);

  function toggle(question: string) {
    setSelected((prev) => ({ ...prev, [question]: !prev[question] }));
  }

  async function createOne(
    item: PlanVisualization,
  ): Promise<{ ok: boolean }> {
    if (!plan) return { ok: false };
    const evidenceSnippets = relevantEvidence(plan, item);
    const plannerContext = [
      item.why_it_matters ? `Why it matters: ${item.why_it_matters}` : "",
      item.data_needed?.length
        ? `Data needed: ${item.data_needed.join("; ")}`
        : "",
      item.evidence_refs?.length
        ? `Evidence refs: ${item.evidence_refs.join("; ")}`
        : "",
      evidenceSnippets.length
        ? `Evidence snippets passed into generation: ${evidenceSnippets.length}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
    const pastedData = [
      evidenceSnippets.length
        ? `--- PLANNER-SELECTED EVIDENCE SNIPPETS ---\n${evidenceSnippets.join("\n")}`
        : "",
      plan.live_search_notes?.length
        ? `--- LIVE SEARCH FINDINGS ---\n${plan.live_search_notes
            .slice(0, 8)
            .map(
              (note) =>
                `- ${note.finding}${note.source_url ? ` (${note.source_url})` : ""}`,
            )
            .join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const res = await fetch(`/api/ces/${slug}/charts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: item.question,
          archetype: item.archetype,
          plannerContext: plannerContext || undefined,
          pastedData: pastedData || undefined,
          origin: "planner_recommendation",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Chart generation failed");
      const chartId = Number(json?.id);
      if (!Number.isFinite(chartId)) throw new Error("Missing chart id");
      // Best-effort verify; do not fail generation if verify errors.
      try {
        await fetch(`/api/charts/${chartId}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        /* verify is non-blocking */
      }
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  async function handleGenerate() {
    if (!plan) return;
    const toCreate = [
      ...mandatory,
      ...dynamic.filter((v) => selected[v.question]),
    ];
    if (toCreate.length === 0) {
      setPlanError("Select at least one chart to generate.");
      return;
    }
    setGenerating(true);
    setPlanError(null);
    setProgress({ total: toCreate.length, done: 0, failed: 0 });

    const CONCURRENCY = 2;
    const queue = [...toCreate];
    let failed = 0;
    async function worker() {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) return;
        const result = await createOne(item);
        if (!result.ok) failed += 1;
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                done: prev.done + 1,
                failed: prev.failed + (result.ok ? 0 : 1),
              }
            : prev,
        );
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, toCreate.length) }, () =>
        worker(),
      ),
    );

    setGenerating(false);
    qc.invalidateQueries({ queryKey: getGetCeQueryKey(slug ?? "") });
    if (failed > 0 && failed === toCreate.length) {
      setPlanError(
        "Every chart failed to generate. You can retry from the CE page.",
      );
      return;
    }
    navigate(`/ce/${slug}`);
  }

  return (
    <div className="min-h-screen w-full" style={{ background: BRAND.bgShell }}>
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{
          background: "rgba(250, 247, 255, 0.85)",
          borderBottom: `1px solid ${BRAND.slate100}`,
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link
            href="/"
            style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
          >
            <HeadoutLogo height={20} />
          </Link>
          <span style={{ color: BRAND.slate300 }}>/</span>
          <Link
            href="/"
            style={{
              color: BRAND.slate700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            <ArrowLeft size={16} />
            Library
          </Link>
          <span style={{ color: BRAND.slate300 }}>/</span>
          <div className="flex items-center gap-2 min-w-0">
            {ce?.emoji && <span style={{ fontSize: 20 }}>{ce.emoji}</span>}
            <span
              style={{
                fontWeight: 850,
                color: BRAND.slate950,
                fontSize: 15,
              }}
            >
              {ce?.name ?? slug}
            </span>
            <span
              style={{
                borderRadius: 999,
                padding: "2px 9px",
                background: BRAND.purpsSoft,
                color: BRAND.purps,
                fontSize: 10,
                fontWeight: 850,
              }}
            >
              CE Intel — Step 1
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div style={{ marginBottom: 20 }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: BRAND.slate950,
              margin: 0,
            }}
          >
            Review the planned chart deck
          </h1>
          <p
            style={{
              color: BRAND.slate700,
              fontSize: 14,
              marginTop: 6,
              maxWidth: 640,
            }}
          >
            Built from this CE&apos;s research and the page template. Mandatory
            charts are always included; toggle the optional ones, then generate.
            You can add a research doc and refine everything on the next screen.
          </p>
        </div>

        {planLoading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "28px 0",
              color: BRAND.slate700,
              fontWeight: 700,
            }}
          >
            <Loader2 size={18} className="animate-spin" />
            Reading the research doc and assembling the deck…
          </div>
        )}

        {planError && !planLoading && (
          <div
            style={{
              border: `1px solid ${BRAND.candySoft}`,
              background: BRAND.candySoft,
              color: BRAND.candy,
              borderRadius: 12,
              padding: "12px 14px",
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span>{planError}</span>
            <button
              onClick={() => void runPlan()}
              disabled={planLoading}
              style={{
                border: "none",
                borderRadius: 8,
                padding: "6px 10px",
                background: "white",
                color: BRAND.candy,
                fontSize: 12,
                fontWeight: 850,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <RefreshCw size={13} />
              Retry
            </button>
          </div>
        )}

        {!planLoading && plan && (
          <>
            {mandatory.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <SectionHeading
                  title="Always included"
                  caption="Required by this page template — can't be turned off."
                  count={mandatory.length}
                />
                <div style={{ display: "grid", gap: 10 }}>
                  {mandatory.map((item) => (
                    <PlanCard
                      key={item.question}
                      item={item}
                      plan={plan}
                      mandatory
                      checked
                      disabled
                    />
                  ))}
                </div>
              </section>
            )}

            {dynamic.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <SectionHeading
                  title="Optional charts"
                  caption="Recommended for this CE — toggle any you don't want."
                  count={dynamic.length}
                />
                <div style={{ display: "grid", gap: 10 }}>
                  {dynamic.map((item) => (
                    <PlanCard
                      key={item.question}
                      item={item}
                      plan={plan}
                      checked={!!selected[item.question]}
                      onToggle={() => toggle(item.question)}
                    />
                  ))}
                </div>
              </section>
            )}

            {recommended.length === 0 && (
              <div
                style={{
                  border: `1px dashed ${BRAND.slate200}`,
                  borderRadius: 12,
                  padding: 24,
                  textAlign: "center",
                  color: BRAND.slate700,
                  fontSize: 13,
                }}
              >
                The planner didn&apos;t recommend any charts for this CE. You can
                still go to the CE and build charts manually.
              </div>
            )}
          </>
        )}
      </main>

      {!planLoading && plan && (
        <div
          className="sticky bottom-0 z-40 backdrop-blur"
          style={{
            background: "rgba(255,255,255,0.9)",
            borderTop: `1px solid ${BRAND.slate100}`,
          }}
        >
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div style={{ fontSize: 13, color: BRAND.slate700, fontWeight: 700 }}>
              {progress ? (
                <span>
                  Generating {progress.done}/{progress.total}
                  {progress.failed > 0 ? ` · ${progress.failed} failed` : ""}…
                </span>
              ) : (
                <span>
                  {selectedCount} chart{selectedCount === 1 ? "" : "s"} selected
                  {" "}
                  <span style={{ color: BRAND.slate500 }}>
                    ({mandatory.length} required
                    {dynamic.length > 0
                      ? ` · ${selectedCount - mandatory.length} optional`
                      : ""}
                    )
                  </span>
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => navigate(`/ce/${slug}`)}
                disabled={generating}
                style={{
                  border: `1px solid ${BRAND.slate200}`,
                  borderRadius: 10,
                  padding: "9px 14px",
                  background: "white",
                  color: BRAND.slate700,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: generating ? "not-allowed" : "pointer",
                }}
              >
                Skip
              </button>
              <button
                onClick={() => void handleGenerate()}
                disabled={generating || selectedCount === 0}
                style={{
                  border: "none",
                  borderRadius: 10,
                  padding: "9px 16px",
                  background:
                    generating || selectedCount === 0
                      ? BRAND.slate300
                      : BRAND.purps,
                  color: "white",
                  fontSize: 13,
                  fontWeight: 850,
                  cursor:
                    generating || selectedCount === 0
                      ? "not-allowed"
                      : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                {generating ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Sparkles size={15} />
                )}
                {generating
                  ? "Generating…"
                  : `Generate ${selectedCount} chart${selectedCount === 1 ? "" : "s"}`}
                {!generating && <ArrowRight size={15} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeading({
  title,
  caption,
  count,
}: {
  title: string;
  caption: string;
  count: number;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 900,
            color: BRAND.slate950,
            margin: 0,
          }}
        >
          {title}
        </h2>
        <span
          style={{
            borderRadius: 999,
            padding: "2px 8px",
            background: BRAND.slate100,
            color: BRAND.slate700,
            fontSize: 11,
            fontWeight: 850,
          }}
        >
          {count}
        </span>
      </div>
      <p style={{ color: BRAND.slate500, fontSize: 12, margin: "3px 0 0" }}>
        {caption}
      </p>
    </div>
  );
}

function PlanCard({
  item,
  plan,
  mandatory = false,
  checked,
  disabled = false,
  onToggle,
}: {
  item: PlanVisualization;
  plan: ReviewPlan;
  mandatory?: boolean;
  checked: boolean;
  disabled?: boolean;
  onToggle?: () => void;
}) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const evidenceSnippets = relevantEvidence(plan, item);
  const evidenceCount = evidenceSnippets.length;
  const sourceRefs = item.evidence_refs ?? [];
  const dataNeeded = item.data_needed ?? [];
  const hasDetails =
    evidenceCount > 0 ||
    sourceRefs.length > 0 ||
    dataNeeded.length > 0 ||
    Boolean(item.quality_score?.rationale);
  return (
    <>
      {galleryOpen && (
        <ArchetypeGalleryModal
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          onPick={() => setGalleryOpen(false)}
          options={[item.archetype]}
        />
      )}
      <label
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          border: `1px solid ${checked ? BRAND.purpsSoft : BRAND.slate200}`,
          background: checked ? "white" : BRAND.slate50,
          borderRadius: 12,
          padding: 14,
          cursor: disabled ? "default" : "pointer",
          opacity: checked ? 1 : 0.85,
        }}
      >
        <div style={{ paddingTop: 2 }}>
        {mandatory ? (
          <span
            title="Always included"
            style={{
              display: "inline-flex",
              width: 18,
              height: 18,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 5,
              background: BRAND.purps,
              color: "white",
            }}
          >
            <Lock size={11} />
          </span>
        ) : (
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            disabled={disabled}
            style={{ width: 16, height: 16, accentColor: BRAND.purps }}
          />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              borderRadius: 999,
              padding: "3px 8px",
              background: BRAND.bgCool,
              color: BRAND.purps,
              fontSize: 10,
              fontWeight: 850,
            }}
          >
            {archetypeLabel(item.archetype)}
          </span>
          {mandatory && (
            <span
              style={{
                borderRadius: 999,
                padding: "3px 8px",
                background: BRAND.purpsSoft,
                color: BRAND.purps,
                fontSize: 10,
                fontWeight: 850,
              }}
            >
              Always included
            </span>
          )}
          {item.quality_score && <QualityScorePill score={item.quality_score} />}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: BRAND.slate950,
            marginTop: 7,
          }}
        >
          {item.question}
        </div>
        {item.why_it_matters && (
          <div
            style={{
              fontSize: 12,
              color: BRAND.slate700,
              marginTop: 4,
              lineHeight: 1.45,
            }}
          >
            {item.why_it_matters}
          </div>
        )}
        {hasDetails && (
          <details style={{ marginTop: 9 }}>
            <summary
              style={{
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 800,
                color: BRAND.purps,
                listStyle: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              Evidence &amp; sources
              <span style={{ color: BRAND.slate500, fontWeight: 700 }}>
                ({evidenceCount} snippet{evidenceCount === 1 ? "" : "s"}
                {sourceRefs.length > 0
                  ? ` · ${sourceRefs.length} source ref${sourceRefs.length === 1 ? "" : "s"}`
                  : ""}
                )
              </span>
            </summary>
            <div
              style={{
                marginTop: 8,
                padding: "10px 12px",
                background: BRAND.slate50,
                border: `1px solid ${BRAND.slate100}`,
                borderRadius: 9,
                display: "grid",
                gap: 10,
              }}
              onClick={(e) => e.preventDefault()}
            >
              {item.quality_score?.rationale && (
                <DetailBlock label="Why this score">
                  <span
                    style={{
                      fontSize: 12,
                      color: BRAND.slate700,
                      lineHeight: 1.45,
                    }}
                  >
                    {item.quality_score.rationale}
                  </span>
                </DetailBlock>
              )}
              {dataNeeded.length > 0 && (
                <DetailBlock label="Data needed">
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {dataNeeded.map((d, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: 12,
                          color: BRAND.slate700,
                          lineHeight: 1.5,
                        }}
                      >
                        {d}
                      </li>
                    ))}
                  </ul>
                </DetailBlock>
              )}
              {evidenceCount > 0 && (
                <DetailBlock label={`Backing evidence (${evidenceCount})`}>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {evidenceSnippets.map((snippet, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: 12,
                          color: BRAND.slate700,
                          lineHeight: 1.5,
                        }}
                      >
                        {snippet.replace(/^- /, "")}
                      </li>
                    ))}
                  </ul>
                </DetailBlock>
              )}
              {sourceRefs.length > 0 && (
                <DetailBlock label="Source references">
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                  >
                    {sourceRefs.map((ref, i) => (
                      <span
                        key={i}
                        style={{
                          borderRadius: 999,
                          padding: "3px 8px",
                          background: "white",
                          border: `1px solid ${BRAND.slate200}`,
                          color: BRAND.slate700,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {ref}
                      </span>
                    ))}
                  </div>
                </DetailBlock>
              )}
              {evidenceCount === 0 && sourceRefs.length === 0 && (
                <span
                  style={{
                    fontSize: 12,
                    color: BRAND.slate500,
                    lineHeight: 1.45,
                  }}
                >
                  No grounded evidence yet — add a Deep Research Doc to back this
                  chart with sources.
                </span>
              )}
            </div>
          </details>
        )}
      </div>
      <ArchetypeThumbnail
        archetype={item.archetype}
        onClick={() => setGalleryOpen(true)}
      />
    </label>
    </>
  );
}

function DetailBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 850,
          color: BRAND.slate500,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
