import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertOctagon,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Pencil,
  RefreshCw,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  useListAllFeedback,
  useUpdateFeedback,
  useRegenerateChart,
  getListAllFeedbackQueryKey,
  getGetCeQueryKey,
  type TriageFeedback,
} from "@workspace/api-client-react";
import { BRAND } from "@/lib/brand";
import { HeadoutLogo } from "@/components/HeadoutLogo";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

const SEVERITY_STYLE: Record<
  string,
  { bg: string; fg: string; label: string }
> = {
  high: { bg: BRAND.candySoft, fg: BRAND.candy, label: "High" },
  medium: { bg: "#FEF3C7", fg: "#92400E", label: "Medium" },
  low: { bg: BRAND.purpsSoft, fg: BRAND.purps, label: "Low" },
  none: { bg: BRAND.slate100, fg: BRAND.slate500, label: "—" },
};

export default function Triage() {
  const [statusFilter, setStatusFilter] = useState<
    "open" | "escalated" | "resolved" | "dismissed"
  >("open");
  const { data, isLoading, error } = useListAllFeedback({
    status: statusFilter,
  });

  return (
    <div className="min-h-screen" style={{ background: BRAND.bgShell }}>
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{
          background: "rgba(250, 247, 255, 0.85)",
          borderBottom: `1px solid ${BRAND.slate100}`,
        }}
      >
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link
            href="/"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
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
          <strong style={{ color: BRAND.slate950, fontSize: 15 }}>
            Triage
          </strong>
          <div style={{ flex: 1 }} />
          <Link
            href="/triage/questions"
            style={{
              color: BRAND.purps,
              fontWeight: 800,
              fontSize: 12,
              textDecoration: "none",
              padding: "8px 12px",
              border: `1px solid ${BRAND.purpsSoft}`,
              borderRadius: 10,
            }}
          >
            Trouble-score view →
          </Link>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-6 py-8">
        <div
          className="flex items-center gap-2"
          style={{ marginBottom: 24 }}
          role="tablist"
        >
          {(["open", "escalated", "resolved", "dismissed"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: `1px solid ${
                  statusFilter === s ? BRAND.purps : BRAND.slate200
                }`,
                background: statusFilter === s ? BRAND.purps : "white",
                color: statusFilter === s ? "white" : BRAND.slate950,
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center gap-2" style={{ color: BRAND.slate500 }}>
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        )}
        {error && (
          <div style={{ color: BRAND.candy, fontWeight: 700 }}>
            Failed to load feedback.
          </div>
        )}
        {!isLoading && !error && data && data.length === 0 && (
          <div
            style={{
              padding: 28,
              border: `1px dashed ${BRAND.slate200}`,
              borderRadius: 16,
              color: BRAND.slate500,
              fontWeight: 600,
            }}
          >
            Nothing to triage. Tag something with the Feedback button on a
            chart and it will show up here.
          </div>
        )}

        {data && data.length > 0 && <TriageGroups items={data} />}
      </main>
    </div>
  );
}

function TriageGroups({ items }: { items: TriageFeedback[] }) {
  // Group by CE → chart
  const byCe = new Map<
    string,
    {
      ce: TriageFeedback["ce"];
      charts: Map<number, { chart: TriageFeedback["chart"]; items: TriageFeedback[] }>;
    }
  >();
  for (const t of items) {
    const ceKey = t.ce.slug;
    let g = byCe.get(ceKey);
    if (!g) {
      g = { ce: t.ce, charts: new Map() };
      byCe.set(ceKey, g);
    }
    let c = g.charts.get(t.chart.id);
    if (!c) {
      c = { chart: t.chart, items: [] };
      g.charts.set(t.chart.id, c);
    }
    c.items.push(t);
  }

  return (
    <div className="flex flex-col gap-6">
      {Array.from(byCe.values()).map((g) => (
        <section
          key={g.ce.slug}
          style={{
            background: "white",
            borderRadius: 16,
            border: `1px solid ${BRAND.slate100}`,
            padding: 18,
          }}
        >
          <header
            className="flex items-center gap-3"
            style={{ marginBottom: 12 }}
          >
            <span style={{ fontSize: 22 }}>{g.ce.emoji}</span>
            <div>
              <Link
                href={`/ce/${g.ce.slug}`}
                style={{
                  fontWeight: 800,
                  fontSize: 16,
                  color: BRAND.slate950,
                  textDecoration: "none",
                }}
              >
                {g.ce.name}
              </Link>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: BRAND.slate500,
                }}
              >
                {g.ce.city}, {g.ce.country}
              </div>
            </div>
          </header>

          <div className="flex flex-col gap-4">
            {Array.from(g.charts.values()).map((c) => (
              <ChartTriageRow key={c.chart.id} chart={c.chart} ceSlug={g.ce.slug} items={c.items} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ChartTriageRow({
  chart,
  ceSlug,
  items,
}: {
  chart: TriageFeedback["chart"];
  ceSlug: string;
  items: TriageFeedback[];
}) {
  const qc = useQueryClient();
  const updateMut = useUpdateFeedback();
  const regenMut = useRegenerateChart();
  const editCount = items[0]?.chartEditCount ?? 0;

  async function setStatus(
    id: number,
    status: "escalated" | "resolved" | "dismissed",
  ) {
    await updateMut.mutateAsync({ id, data: { status } });
    qc.invalidateQueries({ queryKey: getListAllFeedbackQueryKey() });
    for (const s of ["open", "escalated", "resolved", "dismissed"] as const) {
      qc.invalidateQueries({
        queryKey: getListAllFeedbackQueryKey({ status: s }),
      });
    }
    qc.invalidateQueries({ queryKey: getGetCeQueryKey(ceSlug) });
  }

  async function regenerate() {
    const feedback = prompt(
      `What should improve when regenerating "${chart.title}"?\n\nThe visual will be replaced and the current DRD will be used.`,
      items
        .map((item) => item.feedback.note || item.feedback.category)
        .filter(Boolean)
        .slice(0, 3)
        .join("\n"),
    );
    if (feedback === null)
      return;
    if (feedback.trim().length < 8) {
      alert("Add a short note on what should improve before regenerating.");
      return;
    }
    try {
      await regenMut.mutateAsync({
        id: chart.id,
        data: { feedback: feedback.trim() },
      });
      qc.invalidateQueries({ queryKey: getGetCeQueryKey(ceSlug) });
      qc.invalidateQueries({ queryKey: getListAllFeedbackQueryKey() });
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Regeneration failed. Check the server logs.",
      );
    }
  }

  return (
    <div
      style={{
        border: `1px solid ${BRAND.slate100}`,
        borderRadius: 12,
        padding: 14,
        background: BRAND.bgShell,
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: BRAND.slate500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {chart.chartType}
            {editCount > 0 && (
              <span style={{ marginLeft: 8, color: BRAND.purps }}>
                · {editCount} writer edit{editCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <h4
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: BRAND.slate950,
              marginTop: 2,
            }}
          >
            {chart.title}
          </h4>
          <div style={{ fontSize: 12, color: BRAND.slate700, marginTop: 2 }}>
            {chart.question}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/ce/${ceSlug}?edit=${chart.id}`}
            style={{
              background: "white",
              color: BRAND.purps,
              border: `1px solid ${BRAND.purpsSoft}`,
              padding: "6px 10px",
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 12,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
            title="Open editor for this chart"
          >
            <Pencil size={13} />
            Edit
          </Link>
          <a
            href={`${BASE}/embed/${chart.id}?studio=1`}
            target="_blank"
            rel="noreferrer"
            style={{
              background: "white",
              color: BRAND.slate950,
              border: `1px solid ${BRAND.slate200}`,
              padding: "6px 10px",
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 12,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <ExternalLink size={13} />
            Preview
          </a>
          <button
            type="button"
            onClick={regenerate}
            disabled={regenMut.isPending}
            style={{
              background: BRAND.purps,
              color: "white",
              border: "none",
              padding: "6px 10px",
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 12,
              cursor: regenMut.isPending ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {regenMut.isPending ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            Regenerate
          </button>
        </div>
      </div>

      <ul
        style={{
          listStyle: "none",
          margin: "12px 0 0 0",
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {items.map((t) => {
          const sev = SEVERITY_STYLE[t.feedback.severity] ?? SEVERITY_STYLE.none;
          return (
            <li
              key={t.feedback.id}
              className="flex items-start gap-3"
              style={{
                background: "white",
                border: `1px solid ${BRAND.slate100}`,
                borderRadius: 10,
                padding: 10,
              }}
            >
              <span
                style={{
                  background: sev.bg,
                  color: sev.fg,
                  fontWeight: 800,
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  whiteSpace: "nowrap",
                }}
              >
                <AlertTriangle size={10} />
                {sev.label}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: BRAND.slate950,
                    fontWeight: 700,
                  }}
                >
                  {t.feedback.issueCategory ?? "note"}
                  {t.feedback.rating != null && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontWeight: 600,
                        color: BRAND.slate500,
                      }}
                    >
                      · {t.feedback.rating}/5
                    </span>
                  )}
                </div>
                {t.feedback.note && (
                  <div
                    style={{
                      fontSize: 12,
                      color: BRAND.slate700,
                      marginTop: 2,
                      lineHeight: 1.4,
                    }}
                  >
                    {t.feedback.note}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 10,
                    color: BRAND.slate500,
                    marginTop: 4,
                  }}
                >
                  {t.feedback.reporterName || "anon"} ·{" "}
                  {new Date(t.feedback.createdAt).toLocaleString()}
                </div>
              </div>
              {(t.feedback.status === "open" ||
                t.feedback.status === "escalated") && (
                <div className="flex items-center gap-1">
                  {t.feedback.status === "open" && (
                    <button
                      type="button"
                      onClick={() => setStatus(t.feedback.id, "escalated")}
                      title="Escalate to team attention"
                      style={iconBtn(BRAND.candySoft, BRAND.candy)}
                    >
                      <AlertOctagon size={14} />
                    </button>
                  )}
                  {t.feedback.status === "escalated" && (
                    <span
                      style={{
                        background: BRAND.candy,
                        color: "white",
                        fontWeight: 800,
                        fontSize: 10,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        padding: "3px 8px",
                        borderRadius: 999,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Escalated
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setStatus(t.feedback.id, "resolved")}
                    title="Mark resolved"
                    style={iconBtn(BRAND.bgMint, "#0E8F4E")}
                  >
                    <CheckCircle2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(t.feedback.id, "dismissed")}
                    title="Dismiss"
                    style={iconBtn(BRAND.slate100, BRAND.slate700)}
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function iconBtn(bg: string, fg: string): React.CSSProperties {
  return {
    background: bg,
    color: fg,
    border: "none",
    padding: 6,
    borderRadius: 8,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}
