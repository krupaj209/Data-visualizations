import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
  Plus,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
} from "lucide-react";
import {
  useGetCeIntelligence,
  useRefreshCeIntelligence,
  useDeleteCeIntelligenceSource,
  getGetCeIntelligenceQueryKey,
  type CeIntelligence,
  type CeIntelligenceFact,
  type CeIntelligenceSource,
} from "@workspace/api-client-react";
import { BRAND } from "@/lib/brand";

const SOURCE_LABELS: Record<string, string> = {
  official_site: "Official site",
  tripadvisor: "TripAdvisor",
  getyourguide: "GetYourGuide",
  viator: "Viator",
  reddit: "Reddit",
  headout: "Headout (stub)",
};

const BUCKET_LABELS: Record<string, string> = {
  hours_programme: "Opening hours & programme",
  tickets: "Ticket types & prices",
  crowd_patterns: "Crowd patterns",
  wait_times: "Wait times",
  zones: "Popular zones & highlights",
  co_bookings: "Nearby & co-booked venues",
  sentiment: "Sentiment themes",
  ops_notes: "Operational notes",
};

interface VisualizationPlan {
  summary: string;
  generatedAt: string;
  recommended_visualizations: {
    question: string;
    archetype: string;
    why_it_matters: string;
    data_needed?: string[];
    evidence_refs?: string[];
    priority: number;
  }[];
  rejected_visualizations: {
    question: string;
    archetype?: string;
    reason: string;
  }[];
  traveler_questions: {
    question: string;
    recommended_archetype: string;
    chartable: boolean;
    evidence_status: string;
    confidence: number;
  }[];
}

export function IntelPanel({
  slug,
  onClose,
  onChartCreated,
}: {
  slug: string;
  onClose: () => void;
  onChartCreated?: () => void;
}) {
  const { data, isLoading, error } = useGetCeIntelligence(slug);
  const refreshMut = useRefreshCeIntelligence();
  const deleteSourceMut = useDeleteCeIntelligenceSource();
  const qc = useQueryClient();
  const [refreshingSource, setRefreshingSource] = useState<string | null>(null);
  const [plan, setPlan] = useState<VisualizationPlan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [creatingQuestion, setCreatingQuestion] = useState<string | null>(null);
  const [createdQuestions, setCreatedQuestions] = useState<Set<string>>(
    () => new Set(),
  );

  const intel = (data ?? null) as CeIntelligence | null;

  async function handleRefreshAll() {
    setRefreshingSource("__all__");
    try {
      await refreshMut.mutateAsync({ ceSlug: slug, data: {} });
      qc.invalidateQueries({ queryKey: getGetCeIntelligenceQueryKey(slug) });
    } finally {
      setRefreshingSource(null);
    }
  }

  async function handleRefreshOne(source: string) {
    setRefreshingSource(source);
    try {
      await refreshMut.mutateAsync({
        ceSlug: slug,
        data: { sources: [source] },
      });
      qc.invalidateQueries({ queryKey: getGetCeIntelligenceQueryKey(slug) });
    } finally {
      setRefreshingSource(null);
    }
  }

  async function handleDeleteSource(source: string) {
    if (
      !confirm(
        `Drop all facts from ${SOURCE_LABELS[source] ?? source}? You can re-fetch them later.`,
      )
    )
      return;
    await deleteSourceMut.mutateAsync({ ceSlug: slug, source });
    qc.invalidateQueries({ queryKey: getGetCeIntelligenceQueryKey(slug) });
  }

  async function handlePlanVisualizations() {
    setIsPlanning(true);
    setPlanError(null);
    try {
      const res = await fetch(`/api/ce-intelligence/${slug}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeLiveSearch: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "Visualization planning failed");
      }
      setPlan(json as VisualizationPlan);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Visualization planning failed");
    } finally {
      setIsPlanning(false);
    }
  }

  async function handleCreateFromPlan(
    item: VisualizationPlan["recommended_visualizations"][number],
  ) {
    setCreatingQuestion(item.question);
    setPlanError(null);
    try {
      const plannerContext = [
        item.why_it_matters ? `Why it matters: ${item.why_it_matters}` : "",
        item.data_needed?.length
          ? `Data needed: ${item.data_needed.join("; ")}`
          : "",
        item.evidence_refs?.length
          ? `Evidence refs: ${item.evidence_refs.join("; ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      const res = await fetch(`/api/ces/${slug}/charts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: item.question,
          archetype: item.archetype,
          plannerContext: plannerContext || undefined,
          origin: "planner_recommendation",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "Chart generation failed");
      }
      setCreatedQuestions((prev) => {
        const next = new Set(prev);
        next.add(item.question);
        return next;
      });
      onChartCreated?.();
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Chart generation failed");
    } finally {
      setCreatingQuestion(null);
    }
  }

  // Source rows always render the canonical 6 even if the profile is empty,
  // so writers can kick off any single adapter from a never-built CE.
  const ALL_SOURCES = [
    "official_site",
    "tripadvisor",
    "getyourguide",
    "viator",
    "reddit",
    "headout",
  ] as const;
  const sourceMap = new Map<string, CeIntelligenceSource>();
  for (const s of intel?.sources ?? []) sourceMap.set(s.source, s);

  const facts: CeIntelligenceFact[] = intel?.facts ?? [];
  const factsByBucket = new Map<string, CeIntelligenceFact[]>();
  for (const f of facts) {
    const arr = factsByBucket.get(f.bucket) ?? [];
    arr.push(f);
    factsByBucket.set(f.bucket, arr);
  }

  return (
    <aside
      style={{
        position: "sticky",
        top: 80,
        background: "white",
        border: `1px solid ${BRAND.slate200}`,
        borderRadius: 16,
        padding: 16,
        height: "calc(100vh - 110px)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        overflow: "hidden",
      }}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: BRAND.bgLilac,
              color: BRAND.purps,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            i
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: BRAND.slate950 }}>
              CE Intelligence
            </div>
            <div style={{ fontSize: 11, color: BRAND.slate500, fontWeight: 600 }}>
              {facts.length} fact{facts.length === 1 ? "" : "s"} ·{" "}
              {intel?.updatedAt
                ? `updated ${new Date(intel.updatedAt).toLocaleString()}`
                : "never refreshed"}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={iconBtn()}
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </header>

      <button
        type="button"
        onClick={handleRefreshAll}
        disabled={refreshingSource !== null}
        style={{
          background: BRAND.purps,
          color: "white",
          border: "none",
          padding: "8px 12px",
          borderRadius: 10,
          fontWeight: 800,
          fontSize: 12,
          cursor: refreshingSource ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          opacity: refreshingSource ? 0.7 : 1,
        }}
      >
        {refreshingSource === "__all__" ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <RefreshCw size={14} />
        )}
        Refresh all sources
      </button>

      <button
        type="button"
        onClick={handlePlanVisualizations}
        disabled={isPlanning}
        style={{
          background: "white",
          color: BRAND.slate950,
          border: `1px solid ${BRAND.slate200}`,
          padding: "8px 12px",
          borderRadius: 10,
          fontWeight: 800,
          fontSize: 12,
          cursor: isPlanning ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          opacity: isPlanning ? 0.7 : 1,
        }}
      >
        {isPlanning ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Sparkles size={14} />
        )}
        Plan visualizations
      </button>

      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        {planError && (
          <div
            style={{
              color: BRAND.candy,
              fontSize: 12,
              fontWeight: 700,
              padding: 10,
              border: `1px solid ${BRAND.slate200}`,
              borderRadius: 10,
              background: "#fff7f7",
            }}
          >
            {planError}
          </div>
        )}

        {plan && (
          <section>
            <h4 style={sectionLabel()}>Visualization plan</h4>
            <div
              style={{
                padding: 10,
                borderRadius: 12,
                border: `1px solid ${BRAND.slate200}`,
                background: BRAND.slate50,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 12, color: BRAND.slate700, fontWeight: 650, lineHeight: 1.45 }}>
                {plan.summary}
              </div>
              <PlanList
                title={`Recommended (${plan.recommended_visualizations.length})`}
                items={plan.recommended_visualizations.map((item) => ({
                  key: `${item.priority}-${item.question}`,
                  title: item.question,
                  meta: item.archetype,
                  body: item.why_it_matters,
                  tone: "good" as const,
                  actionLabel: createdQuestions.has(item.question)
                    ? "Created"
                    : "Create chart",
                  actionDisabled:
                    createdQuestions.has(item.question) ||
                    creatingQuestion !== null,
                  actionBusy: creatingQuestion === item.question,
                  onAction: () => handleCreateFromPlan(item),
                }))}
              />
              <PlanList
                title={`Rejected (${plan.rejected_visualizations.length})`}
                items={plan.rejected_visualizations.slice(0, 4).map((item) => ({
                  key: item.question,
                  title: item.question,
                  meta: item.archetype ?? "no chart",
                  body: item.reason,
                  tone: "warn" as const,
                }))}
              />
            </div>
          </section>
        )}

        {/* Sources strip */}
        <section>
          <h4 style={sectionLabel()}>Sources</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ALL_SOURCES.map((id) => {
              const s =
                sourceMap.get(id) ??
                ({
                  source: id,
                  status: "pending",
                  fact_count: 0,
                  last_tried_at: null,
                  last_success_at: null,
                  error: null,
                } as CeIntelligenceSource);
              const isRefreshing = refreshingSource === id;
              return (
                <div
                  key={id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto auto",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 10,
                    background: BRAND.slate50,
                  }}
                >
                  <SourceStatusDot status={s.status} />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: BRAND.slate950,
                      }}
                    >
                      {SOURCE_LABELS[id] ?? id}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: BRAND.slate500,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={s.error ?? undefined}
                    >
                      {s.fact_count} fact{s.fact_count === 1 ? "" : "s"} ·{" "}
                      {s.last_tried_at
                        ? `tried ${relativeTime(s.last_tried_at)}`
                        : "never tried"}
                      {s.error ? ` · error` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRefreshOne(id)}
                    disabled={refreshingSource !== null}
                    style={iconBtn()}
                    aria-label={`Refresh ${id}`}
                  >
                    {isRefreshing ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSource(id)}
                    disabled={s.fact_count === 0 || deleteSourceMut.isPending}
                    style={{
                      ...iconBtn(),
                      opacity: s.fact_count === 0 ? 0.4 : 1,
                    }}
                    aria-label={`Drop ${id} facts`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Loading / error */}
        {isLoading && (
          <div style={{ color: BRAND.slate500, fontSize: 12 }}>
            <Loader2 size={14} className="animate-spin inline-block mr-1" />
            Loading profile…
          </div>
        )}
        {error && !intel && (
          <div
            style={{
              color: BRAND.slate700,
              fontSize: 12,
              padding: 10,
              border: `1px dashed ${BRAND.slate200}`,
              borderRadius: 10,
            }}
          >
            No profile yet. Hit "Refresh all sources" to build one.
          </div>
        )}

        {/* Buckets */}
        {Object.keys(BUCKET_LABELS).map((bucket) => {
          const items = factsByBucket.get(bucket) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={bucket}>
              <h4 style={sectionLabel()}>
                {BUCKET_LABELS[bucket]}{" "}
                <span style={{ color: BRAND.slate500 }}>· {items.length}</span>
              </h4>
              <ul
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                }}
              >
                {items.map((f) => (
                  <li
                    key={f.id}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: "white",
                      border: `1px solid ${BRAND.slate100}`,
                    }}
                  >
                    <div style={{ fontSize: 12, color: BRAND.slate950, fontWeight: 600, lineHeight: 1.4 }}>
                      {f.value}
                    </div>
                    <div
                      className="flex items-center gap-2"
                      style={{ marginTop: 4, fontSize: 10, fontWeight: 700, color: BRAND.slate500 }}
                    >
                      <span
                        style={{
                          background: BRAND.bgLilac,
                          color: BRAND.purps,
                          padding: "1px 6px",
                          borderRadius: 999,
                        }}
                      >
                        {SOURCE_LABELS[f.source] ?? f.source}
                      </span>
                      <span>conf {f.confidence}</span>
                      {f.source_url && (
                        <a
                          href={f.source_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          style={{
                            color: BRAND.slate700,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          source <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {intel && facts.length === 0 && !isLoading && (
          <div
            style={{
              color: BRAND.slate700,
              fontSize: 12,
              padding: 10,
              border: `1px dashed ${BRAND.slate200}`,
              borderRadius: 10,
            }}
          >
            No facts yet — refresh sources above to populate.
          </div>
        )}
      </div>
    </aside>
  );
}

function SourceStatusDot({ status }: { status: string }) {
  if (status === "ok")
    return <CheckCircle2 size={14} color={BRAND.okayInk} />;
  if (status === "error")
    return <AlertTriangle size={14} color={BRAND.candy} />;
  if (status === "empty")
    return <CircleDot size={14} color={BRAND.slate500} />;
  return <CircleDot size={14} color={BRAND.slate300} />;
}

function PlanList({
  title,
  items,
}: {
  title: string;
  items: {
    key: string;
    title: string;
    meta: string;
    body: string;
    tone: "good" | "warn";
    actionLabel?: string;
    actionDisabled?: boolean;
    actionBusy?: boolean;
    onAction?: () => void;
  }[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 900,
          color: BRAND.slate500,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {items.map((item) => (
          <li
            key={item.key}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              background: "white",
              border: `1px solid ${
                item.tone === "good" ? BRAND.bgMint : BRAND.holaSoft
              }`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: BRAND.slate950,
                  fontWeight: 750,
                  lineHeight: 1.35,
                }}
              >
                {item.title}
              </div>
              <span
                style={{
                  flex: "0 0 auto",
                  borderRadius: 999,
                  padding: "2px 6px",
                  fontSize: 9,
                  fontWeight: 900,
                  color: item.tone === "good" ? BRAND.okayInk : BRAND.hola,
                  background:
                    item.tone === "good" ? BRAND.bgMint : BRAND.holaSoft,
                }}
              >
                {item.meta}
              </span>
            </div>
            {item.body && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  color: BRAND.slate700,
                  fontWeight: 600,
                  lineHeight: 1.35,
                }}
              >
                {item.body}
              </div>
            )}
            {item.onAction && (
              <button
                type="button"
                onClick={item.onAction}
                disabled={item.actionDisabled}
                style={{
                  marginTop: 8,
                  border: "none",
                  borderRadius: 9,
                  padding: "6px 9px",
                  background: item.actionDisabled
                    ? BRAND.slate100
                    : BRAND.purps,
                  color: item.actionDisabled ? BRAND.slate500 : "white",
                  fontSize: 11,
                  fontWeight: 850,
                  cursor: item.actionDisabled ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {item.actionBusy ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Plus size={12} />
                )}
                {item.actionLabel ?? "Create chart"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: BRAND.slate500,
    margin: "0 0 8px 0",
  };
}

function iconBtn(): React.CSSProperties {
  return {
    background: "white",
    color: BRAND.slate700,
    border: `1px solid ${BRAND.slate200}`,
    width: 26,
    height: 26,
    borderRadius: 8,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  };
}

/* -------------------------------------------------------------------------- */
/* Chart citations popover                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Small affordance shown on each chart card when the chart's provenance has
 * `intelligence_refs`. Resolves them against the CE intelligence profile and
 * lists the cited facts in a popover. Hidden in compact embed mode by virtue
 * of being mounted only in CeDetail (the embed view does not include it).
 */
export function ChartCitations({
  ceSlug,
  refs,
}: {
  ceSlug: string;
  refs: string[];
}) {
  const [open, setOpen] = useState(false);
  // Lazy-load only when opened so we don't pile API calls onto the CE page.
  const { data } = useGetCeIntelligence(ceSlug, {
    query: {
      enabled: open,
      queryKey: getGetCeIntelligenceQueryKey(ceSlug),
    },
  });
  const intel = (data ?? null) as CeIntelligence | null;
  const cited =
    intel?.facts.filter((f) => refs.includes(f.id)) ?? [];

  if (refs.length === 0) return null;

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: open ? BRAND.bgLilac : "white",
          color: open ? BRAND.purps : BRAND.slate700,
          border: `1px solid ${open ? BRAND.purps : BRAND.slate200}`,
          padding: "5px 10px",
          borderRadius: 999,
          fontWeight: 800,
          fontSize: 10,
          letterSpacing: "0.04em",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        Cites {refs.length} fact{refs.length === 1 ? "" : "s"}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 30,
            width: 320,
            maxHeight: 360,
            overflow: "auto",
            background: "white",
            border: `1px solid ${BRAND.slate200}`,
            borderRadius: 12,
            padding: 10,
            boxShadow: "0 12px 32px rgba(15,15,16,0.12)",
          }}
        >
          {cited.length === 0 ? (
            <div style={{ fontSize: 11, color: BRAND.slate500, fontWeight: 600 }}>
              Cited facts no longer in the profile (may have been refreshed).
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {cited.map((f) => (
                <li
                  key={f.id}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    background: BRAND.slate50,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.slate950, lineHeight: 1.35 }}>
                    {f.value}
                  </div>
                  <div
                    className="flex items-center gap-2"
                    style={{ marginTop: 3, fontSize: 10, fontWeight: 700, color: BRAND.slate500 }}
                  >
                    <span
                      style={{
                        background: BRAND.bgLilac,
                        color: BRAND.purps,
                        padding: "1px 6px",
                        borderRadius: 999,
                      }}
                    >
                      {SOURCE_LABELS[f.source] ?? f.source}
                    </span>
                    {f.source_url && (
                      <a
                        href={f.source_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        style={{
                          color: BRAND.slate700,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        source <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
