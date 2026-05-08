import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Code2,
  Copy,
  ExternalLink,
  Loader2,
  Pencil,
  RefreshCw,
  X,
} from "lucide-react";
import {
  useGetCe,
  useRegenerateCe,
  useEditChart,
  getGetCeQueryKey,
  getListCesQueryKey,
  type Chart,
} from "@workspace/api-client-react";
import { BRAND } from "@/lib/brand";
import { HeadoutLogo } from "@/components/HeadoutLogo";
import { ChartRenderer } from "@/components/charts";
import { CHART_TYPE_META } from "@/components/charts/meta";
import { FeedbackButton } from "@/components/FeedbackButton";
import { type ChartSpec } from "@/lib/chart-spec";
import { toSentenceCase } from "@/lib/text";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

const LOCKED_SLUGS = new Set(["galleria-dellaccademia"]);

/**
 * Per-chart-type frame proportions. Chosen so the visualization gets a canvas
 * that fits its content rather than every chart being squeezed into a single
 * 16:10 box. Wide-and-shallow for line/area patterns, less-tall for bar charts,
 * a square-ish frame for grids/calendars.
 */
const CHART_FRAME: Record<
  ChartSpec["type"],
  { aspectRatio: string; minHeight?: number; maxHeight?: number }
> = {
  // Wide line/area charts so the curve breathes horizontally
  tribune_density: { aspectRatio: "5 / 2", minHeight: 320, maxHeight: 440 },
  daily_pattern: { aspectRatio: "12 / 5", minHeight: 300, maxHeight: 400 },
  seasonal_curve: { aspectRatio: "12 / 5", minHeight: 280, maxHeight: 380 },
  booking_window: { aspectRatio: "16 / 7", minHeight: 280, maxHeight: 380 },
  // Less tall — bars feel grounded instead of stretched
  weekly_pattern: { aspectRatio: "16 / 6", minHeight: 240, maxHeight: 320 },
  hourly_heatmap: { aspectRatio: "16 / 8", minHeight: 280, maxHeight: 380 },
  // More square — content needs vertical room
  month_calendar: { aspectRatio: "5 / 4", minHeight: 360, maxHeight: 520 },
  ticket_ladder: { aspectRatio: "16 / 9", minHeight: 320, maxHeight: 420 },
  duration_profiles: { aspectRatio: "16 / 8", minHeight: 280, maxHeight: 380 },
  entrance_lanes: { aspectRatio: "16 / 8", minHeight: 280, maxHeight: 380 },
  compare_zones: { aspectRatio: "16 / 8", minHeight: 280, maxHeight: 380 },
  donut_breakdown: { aspectRatio: "16 / 9", minHeight: 280, maxHeight: 360 },
  stat_grid: { aspectRatio: "16 / 6", minHeight: 200, maxHeight: 280 },
  co_bookings: { aspectRatio: "16 / 9", minHeight: 280, maxHeight: 360 },
};

export default function CeDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { data, isLoading, error } = useGetCe(slug);
  const regenMut = useRegenerateCe();
  const qc = useQueryClient();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" color={BRAND.purps} size={28} />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p style={{ color: BRAND.slate700, fontWeight: 600 }}>
          CE not found.
        </p>
        <Link
          href="/"
          style={{
            color: BRAND.purps,
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          ← Back to library
        </Link>
      </div>
    );
  }

  const { ce, charts } = data;
  const isLocked = LOCKED_SLUGS.has(ce.slug);
  // Triage rows deep-link here as `/ce/:slug?edit=<chartId>`. We pop the
  // editor open inline once per navigation, then strip the query so a hard
  // refresh doesn't re-open it.
  const editId = useEditQueryParam();

  return (
    <div className="min-h-screen" style={{ background: BRAND.bgShell }}>
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{
          background: "rgba(250, 247, 255, 0.85)",
          borderBottom: `1px solid ${BRAND.slate100}`,
        }}
      >
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center gap-3">
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
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span style={{ fontSize: 22 }}>{ce.emoji}</span>
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
                  fontWeight: 600,
                  color: BRAND.slate700,
                }}
              >
                {ce.city}, {ce.country} · {charts.length} charts
              </div>
            </div>
          </div>
          {isLocked ? (
            <span
              title="This deck is hand-curated and locked from regeneration."
              style={{
                background: BRAND.purps,
                color: "white",
                border: `1px solid ${BRAND.purps}`,
                padding: "8px 14px",
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                letterSpacing: "0.02em",
              }}
            >
              ✦ Curated deck
            </span>
          ) : (
            <button
              type="button"
              onClick={async () => {
                if (
                  !confirm(
                    "Replace these charts with a freshly generated set? The current ones will be discarded.",
                  )
                )
                  return;
                await regenMut.mutateAsync({ slug });
                qc.invalidateQueries({ queryKey: getGetCeQueryKey(slug) });
                qc.invalidateQueries({ queryKey: getListCesQueryKey() });
              }}
              disabled={regenMut.isPending}
              style={{
                background: regenMut.isPending ? BRAND.slate100 : "white",
                color: BRAND.slate950,
                border: `1px solid ${BRAND.slate200}`,
                padding: "8px 14px",
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 12,
                cursor: regenMut.isPending ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {regenMut.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Regenerate
            </button>
          )}
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {ce.summary && (
          <p
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: BRAND.slate700,
              maxWidth: 820,
              lineHeight: 1.5,
              marginBottom: 28,
            }}
          >
            {ce.summary}
          </p>
        )}

        <div className="flex flex-col gap-12">
          {charts.map((chart) => (
            <ChartRow
              key={chart.id}
              chart={chart}
              ceName={ce.name}
              ceSlug={ce.slug}
              autoEdit={editId === chart.id}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function useEditQueryParam(): number | null {
  const [id, setId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const v = new URLSearchParams(window.location.search).get("edit");
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  });
  useEffect(() => {
    if (id == null) return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("edit")) {
      url.searchParams.delete("edit");
      window.history.replaceState({}, "", url.toString());
    }
  }, [id]);
  return id;
}

function ChartRow({
  chart,
  ceName,
  ceSlug,
  autoEdit,
}: {
  chart: Chart;
  ceName: string;
  ceSlug: string;
  autoEdit?: boolean;
}) {
  const [editing, setEditing] = useState(!!autoEdit);
  useEffect(() => {
    if (autoEdit) setEditing(true);
  }, [autoEdit]);
  const spec = chart.spec as unknown as ChartSpec;
  const meta = CHART_TYPE_META[spec.type] ?? {
    label: spec.type,
    emoji: "📈",
  };
  const opts = { preserve: ceName };
  const headline = toSentenceCase(chart.question || chart.title, opts);
  const insightText = chart.insight ? toSentenceCase(chart.insight, opts) : null;
  const frame =
    CHART_FRAME[spec.type] ?? { aspectRatio: "16 / 10", minHeight: 320 };

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div className="flex flex-col gap-1">
          <div
            className="inline-flex items-center gap-1.5"
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: BRAND.purps,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <span>{meta.emoji}</span>
            {meta.label}
          </div>
          <h3
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: BRAND.slate950,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              maxWidth: 720,
            }}
          >
            {headline}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            style={{
              background: editing ? BRAND.purps : "white",
              color: editing ? "white" : BRAND.slate950,
              border: `1px solid ${editing ? BRAND.purps : BRAND.slate200}`,
              padding: "8px 12px",
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 12,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
            title="Edit copy"
          >
            <Pencil size={14} />
            Edit
          </button>
          <FeedbackButton
            chartId={chart.id}
            ceSlug={ceSlug}
            openCount={chart.openFeedbackCount ?? 0}
            topSeverity={
              (chart.topFeedbackSeverity as
                | "high"
                | "medium"
                | "low"
                | null
                | undefined) ?? null
            }
          />
          <EmbedActions chartId={chart.id} />
        </div>
      </div>

      {editing && (
        <ChartEditor
          chart={chart}
          ceSlug={ceSlug}
          onClose={() => setEditing(false)}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] items-start">
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: BRAND.slate100,
            padding: 0,
          }}
        >
          <div
            className="w-full"
            style={{
              aspectRatio: frame.aspectRatio,
              minHeight: frame.minHeight,
              maxHeight: frame.maxHeight,
            }}
          >
            <ChartRenderer
              spec={spec}
              preserve={ceName}
              header={{
                title: chart.title,
                subtitle: chart.subtitle || undefined,
                question: chart.question,
                insight: chart.insight || undefined,
              }}
            />
          </div>
        </div>
        <aside className="flex flex-col gap-3">
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: BRAND.slate500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            CMS preview
          </div>
          {insightText && (
            <div className="flex items-start gap-2">
              <span
                style={{
                  width: 6,
                  height: 6,
                  minWidth: 6,
                  borderRadius: 999,
                  background: BRAND.purps,
                  marginTop: 7,
                }}
              />
              <p
                style={{
                  color: BRAND.slate900,
                  fontSize: 13,
                  fontWeight: 600,
                  lineHeight: 1.5,
                }}
              >
                {insightText}
              </p>
            </div>
          )}
          {chart.subtitle && (
            <p
              style={{
                color: BRAND.slate500,
                fontSize: 11,
                fontWeight: 600,
                lineHeight: 1.4,
                marginTop: 2,
              }}
            >
              Block subtitle: {toSentenceCase(chart.subtitle, opts)}
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}

function ChartEditor({
  chart,
  ceSlug,
  onClose,
}: {
  chart: Chart;
  ceSlug: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const editMut = useEditChart();
  const [title, setTitle] = useState(chart.title);
  const [subtitle, setSubtitle] = useState(chart.subtitle ?? "");
  const [insight, setInsight] = useState(chart.insight ?? "");
  const [editor, setEditor] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function save() {
    await editMut.mutateAsync({
      id: chart.id,
      data: {
        title,
        subtitle,
        insight,
        editorName: editor.trim() || undefined,
      },
    });
    qc.invalidateQueries({ queryKey: getGetCeQueryKey(ceSlug) });
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 1600);
  }

  return (
    <div
      style={{
        marginTop: 12,
        background: "white",
        border: `1px solid ${BRAND.purpsSoft}`,
        borderLeft: `4px solid ${BRAND.purps}`,
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <strong style={{ fontSize: 13, color: BRAND.purps }}>
          Edit copy — counts as writer feedback
        </strong>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: BRAND.slate500,
            cursor: "pointer",
          }}
          aria-label="Close editor"
        >
          <X size={16} />
        </button>
      </div>
      <EditField label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={editorInputStyle}
        />
      </EditField>
      <EditField label="Subtitle">
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          style={editorInputStyle}
        />
      </EditField>
      <EditField label="Insight">
        <textarea
          value={insight}
          onChange={(e) => setInsight(e.target.value)}
          rows={3}
          style={{ ...editorInputStyle, fontFamily: "inherit", resize: "vertical" }}
        />
      </EditField>
      <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
        <input
          value={editor}
          onChange={(e) => setEditor(e.target.value)}
          placeholder="Your name (optional)"
          style={{ ...editorInputStyle, flex: 1 }}
        />
        <button
          type="button"
          onClick={save}
          disabled={editMut.isPending}
          style={{
            background: savedAt ? BRAND.bgMint : BRAND.purps,
            color: savedAt ? "#0E8F4E" : "white",
            border: "none",
            padding: "10px 16px",
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 13,
            cursor: editMut.isPending ? "wait" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {editMut.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : savedAt ? (
            <Check size={14} />
          ) : null}
          {savedAt ? "Saved" : "Save edit"}
        </button>
      </div>
    </div>
  );
}

const editorInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: `1px solid ${BRAND.slate200}`,
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 8,
};

function EditField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "block",
        marginBottom: 8,
      }}
    >
      <span
        style={{
          display: "block",
          fontSize: 10,
          fontWeight: 800,
          color: BRAND.slate500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function EmbedActions({ chartId }: { chartId: number }) {
  const embedPath = `${BASE}/embed/${chartId}`;
  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${embedPath}`
      : embedPath;
  const iframe = `<iframe src="${fullUrl}" width="800" height="500" style="border:0;border-radius:24px" loading="lazy" allowfullscreen></iframe>`;

  const [copied, setCopied] = useState<"url" | "iframe" | null>(null);
  function copy(text: string, kind: "url" | "iframe") {
    navigator.clipboard?.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => copy(fullUrl, "url")}
        style={{
          background: copied === "url" ? BRAND.bgMint : "white",
          color: copied === "url" ? "#0E8F4E" : BRAND.slate950,
          border: `1px solid ${BRAND.slate200}`,
          padding: "8px 12px",
          borderRadius: 10,
          fontWeight: 800,
          fontSize: 12,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {copied === "url" ? <Check size={14} /> : <Copy size={14} />}
        {copied === "url" ? "Copied" : "Copy URL"}
      </button>
      <button
        type="button"
        onClick={() => copy(iframe, "iframe")}
        style={{
          background: copied === "iframe" ? BRAND.bgMint : "white",
          color: copied === "iframe" ? "#0E8F4E" : BRAND.slate950,
          border: `1px solid ${BRAND.slate200}`,
          padding: "8px 12px",
          borderRadius: 10,
          fontWeight: 800,
          fontSize: 12,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {copied === "iframe" ? <Check size={14} /> : <Code2 size={14} />}
        {copied === "iframe" ? "Copied" : "Copy iframe"}
      </button>
      <a
        href={embedPath}
        target="_blank"
        rel="noreferrer"
        style={{
          background: BRAND.purps,
          color: "white",
          border: "none",
          padding: "8px 12px",
          borderRadius: 10,
          fontWeight: 800,
          fontSize: 12,
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <ExternalLink size={14} />
        Open
      </a>
    </div>
  );
}
