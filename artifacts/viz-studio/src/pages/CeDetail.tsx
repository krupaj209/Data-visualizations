import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  useGetCe,
  useRegenerateCe,
  useUpdateChart,
  usePublishChart,
  usePublishAllDrafts,
  useVerifyChart,
  useCreateChartFromTopic,
  useGetIdeation,
  useClearIdeation,
  getGetCeQueryKey,
  getListCesQueryKey,
  getGetIdeationQueryKey,
  type Ce,
  type Chart,
  type ChartVerification,
  type IdeationMessage,
} from "@workspace/api-client-react";
import { BRAND } from "@/lib/brand";
import { HeadoutLogo } from "@/components/HeadoutLogo";
import { ChartRenderer } from "@/components/charts";
import { CHART_TYPE_META } from "@/components/charts/meta";
import { FeedbackButton } from "@/components/FeedbackButton";
import {
  type ChartProvenanceLite,
  type ChartSpec,
} from "@/lib/chart-spec";
import { toSentenceCase } from "@/lib/text";
import { SpecEditor } from "@/components/SpecEditor";
import { IntelPanel, ChartCitations } from "@/components/IntelPanel";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

const LOCKED_SLUGS = new Set(["galleria-dellaccademia"]);

const CHART_FRAME: Record<
  ChartSpec["type"],
  { aspectRatio: string; minHeight?: number; maxHeight?: number }
> = {
  tribune_density: { aspectRatio: "5 / 2", minHeight: 320, maxHeight: 440 },
  daily_pattern: { aspectRatio: "12 / 5", minHeight: 300, maxHeight: 400 },
  seasonal_curve: { aspectRatio: "12 / 5", minHeight: 280, maxHeight: 380 },
  booking_window: { aspectRatio: "16 / 7", minHeight: 280, maxHeight: 380 },
  weekly_pattern: { aspectRatio: "16 / 6", minHeight: 240, maxHeight: 320 },
  hourly_heatmap: { aspectRatio: "16 / 8", minHeight: 280, maxHeight: 380 },
  month_calendar: { aspectRatio: "5 / 4", minHeight: 360, maxHeight: 520 },
  ticket_ladder: { aspectRatio: "16 / 9", minHeight: 320, maxHeight: 420 },
  duration_profiles: { aspectRatio: "16 / 8", minHeight: 280, maxHeight: 380 },
  entrance_lanes: { aspectRatio: "16 / 8", minHeight: 280, maxHeight: 380 },
  compare_zones: { aspectRatio: "16 / 8", minHeight: 280, maxHeight: 380 },
  donut_breakdown: { aspectRatio: "16 / 9", minHeight: 280, maxHeight: 360 },
  stat_grid: { aspectRatio: "16 / 6", minHeight: 200, maxHeight: 280 },
  co_bookings: { aspectRatio: "16 / 9", minHeight: 280, maxHeight: 360 },
  zone_crowd_heatmap: { aspectRatio: "16 / 8", minHeight: 300, maxHeight: 440 },
  zone_wait_heatmap: { aspectRatio: "16 / 8", minHeight: 300, maxHeight: 440 },
  golden_hour_match: { aspectRatio: "5 / 4", minHeight: 360, maxHeight: 520 },
  savings_breakdown: { aspectRatio: "16 / 9", minHeight: 300, maxHeight: 400 },
  return_buffer_rank: { aspectRatio: "16 / 9", minHeight: 280, maxHeight: 380 },
  seat_value_map: { aspectRatio: "16 / 9", minHeight: 280, maxHeight: 380 },
  optimal_departure: { aspectRatio: "16 / 8", minHeight: 280, maxHeight: 360 },
  stop_frequency: { aspectRatio: "16 / 7", minHeight: 260, maxHeight: 360 },
  route_profile: { aspectRatio: "16 / 7", minHeight: 260, maxHeight: 380 },
  conditions_calendar: {
    aspectRatio: "12 / 5",
    minHeight: 280,
    maxHeight: 380,
  },
  sighting_probability: {
    aspectRatio: "12 / 5",
    minHeight: 280,
    maxHeight: 380,
  },
  departure_reliability: {
    aspectRatio: "12 / 5",
    minHeight: 280,
    maxHeight: 380,
  },
  price_curve: { aspectRatio: "12 / 5", minHeight: 280, maxHeight: 380 },
  queue_compare: { aspectRatio: "16 / 8", minHeight: 280, maxHeight: 380 },
  duration_stat: { aspectRatio: "16 / 8", minHeight: 280, maxHeight: 380 },
  ride_wait_curve: { aspectRatio: "12 / 5", minHeight: 300, maxHeight: 400 },
  activity_window: { aspectRatio: "12 / 5", minHeight: 300, maxHeight: 400 },
  opening_hour_rank: { aspectRatio: "16 / 9", minHeight: 280, maxHeight: 380 },
  daily_programme: { aspectRatio: "16 / 7", minHeight: 280, maxHeight: 380 },
  time_split: { aspectRatio: "16 / 7", minHeight: 240, maxHeight: 340 },
  history_timeline: { aspectRatio: "16 / 7", minHeight: 300, maxHeight: 440 },
  slot_compare: { aspectRatio: "5 / 4", minHeight: 320, maxHeight: 460 },
};

type StatusFilter = "all" | "published" | "draft";

export default function CeDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { data, isLoading, error } = useGetCe(slug);
  const regenMut = useRegenerateCe();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showNewChart, setShowNewChart] = useState(false);
  const [showIdeation, setShowIdeation] = useState(false);
  const [showIntel, setShowIntel] = useState(false);

  // Deep-link from triage: `/ce/:slug?edit=<id>` — read once on mount.
  const searchParams = useMemo(
    () => new URLSearchParams(window.location.search),
    [],
  );
  const editIdParam = searchParams.get("edit");
  const editId = editIdParam ? parseInt(editIdParam, 10) : null;

  // Clear query param after reading it
  useEffect(() => {
    if (editIdParam) {
      const url = new URL(window.location.href);
      url.searchParams.delete("edit");
      window.history.replaceState({}, "", url.toString());
    }
  }, [editIdParam]);

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
        <p style={{ color: BRAND.slate700, fontWeight: 600 }}>CE not found.</p>
        <Link
          href="/"
          style={{ color: BRAND.purps, fontWeight: 800, textDecoration: "none" }}
        >
          ← Back to library
        </Link>
      </div>
    );
  }

  const { ce, charts } = data;
  const isLocked = LOCKED_SLUGS.has(ce.slug);

  const draftCount = charts.filter((c) => (c.status ?? "published") === "draft")
    .length;
  const publishedCount = charts.length - draftCount;

  return (
    <CeDetailInner
      slug={slug}
      ce={ce}
      charts={charts}
      draftCount={draftCount}
      publishedCount={publishedCount}
      isLocked={isLocked}
      regenMut={regenMut}
      qc={qc}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      showNewChart={showNewChart}
      setShowNewChart={setShowNewChart}
      showIdeation={showIdeation}
      setShowIdeation={setShowIdeation}
      showIntel={showIntel}
      setShowIntel={setShowIntel}
      editId={editId}
    />
  );
}

type CeDetailInnerProps = {
  slug: string;
  ce: Ce;
  charts: Chart[];
  draftCount: number;
  publishedCount: number;
  isLocked: boolean;
  regenMut: ReturnType<typeof useRegenerateCe>;
  qc: ReturnType<typeof useQueryClient>;
  statusFilter: StatusFilter;
  setStatusFilter: (s: StatusFilter) => void;
  showNewChart: boolean;
  setShowNewChart: (v: boolean | ((prev: boolean) => boolean)) => void;
  showIdeation: boolean;
  setShowIdeation: (v: boolean | ((prev: boolean) => boolean)) => void;
  showIntel: boolean;
  setShowIntel: (v: boolean | ((prev: boolean) => boolean)) => void;
  editId: number | null;
};

function CeDetailInner({
  slug,
  ce,
  charts,
  draftCount,
  publishedCount,
  isLocked,
  regenMut,
  qc,
  statusFilter,
  setStatusFilter,
  showNewChart,
  setShowNewChart,
  showIdeation,
  setShowIdeation,
  showIntel,
  setShowIntel,
  editId,
}: CeDetailInnerProps) {
  const publishAllMut = usePublishAllDrafts();
  // Lifted up so the ideation panel's "Use this idea" button can prefill the
  // new-chart form. The panel writes into this seed; the form reads it on
  // mount and clears it when the user submits or closes.
  const [topicSeed, setTopicSeed] = useState<{
    topic: string;
    archetype?: string;
  } | null>(null);

  async function handlePublishAll() {
    if (
      !confirm(
        `Publish all ${draftCount} draft chart${draftCount === 1 ? "" : "s"} for this CE?`,
      )
    )
      return;
    await publishAllMut.mutateAsync({ slug, data: {} });
    qc.invalidateQueries({ queryKey: getGetCeQueryKey(slug) });
    qc.invalidateQueries({ queryKey: getListCesQueryKey() });
  }

  const visibleCharts = charts.filter((c) => {
    const s = c.status ?? "published";
    if (statusFilter === "all") return true;
    return s === statusFilter;
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
                {ce.city}, {ce.country} · {publishedCount} published
                {draftCount > 0 ? ` · ${draftCount} draft` : ""}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowIntel((v) => !v);
              if (!showIntel) setShowIdeation(false);
            }}
            style={{
              background: showIntel ? BRAND.purps : "white",
              color: showIntel ? "white" : BRAND.slate950,
              border: `1px solid ${showIntel ? BRAND.purps : BRAND.slate200}`,
              padding: "8px 12px",
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 12,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Sparkles size={14} />
            CE Intel
          </button>

          <button
            type="button"
            onClick={() => {
              setShowIdeation((v) => !v);
              if (!showIdeation) setShowIntel(false);
            }}
            style={{
              background: showIdeation ? BRAND.purps : "white",
              color: showIdeation ? "white" : BRAND.slate950,
              border: `1px solid ${showIdeation ? BRAND.purps : BRAND.slate200}`,
              padding: "8px 12px",
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 12,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <MessageSquare size={14} />
            Ideate
          </button>

          <button
            type="button"
            onClick={() => setShowNewChart((v) => !v)}
            style={{
              background: showNewChart ? BRAND.purps : "white",
              color: showNewChart ? "white" : BRAND.slate950,
              border: `1px solid ${showNewChart ? BRAND.purps : BRAND.slate200}`,
              padding: "8px 12px",
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 12,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Plus size={14} />
            New chart
          </button>

          {draftCount > 0 && (
            <button
              type="button"
              onClick={handlePublishAll}
              disabled={publishAllMut.isPending}
              title={`Move all ${draftCount} draft chart(s) to published in one go`}
              style={{
                background: publishAllMut.isPending ? BRAND.slate100 : BRAND.bgMint,
                color: "#0E8F4E",
                border: `1px solid #7AD2A6`,
                padding: "8px 14px",
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 12,
                cursor: publishAllMut.isPending ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {publishAllMut.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Eye size={14} />
              )}
              Publish all drafts ({draftCount})
            </button>
          )}

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

      <main
        className="max-w-[1400px] mx-auto px-6 py-8"
        style={{
          display: "grid",
          gridTemplateColumns:
            showIdeation || showIntel ? "minmax(0, 1fr) 400px" : "1fr",
          gap: 28,
        }}
      >
        <div>
          {ce.summary && (
            <p
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: BRAND.slate700,
                maxWidth: 820,
                lineHeight: 1.5,
                marginBottom: 20,
              }}
            >
              {ce.summary}
            </p>
          )}

          <div className="flex items-center gap-2 mb-6">
            <FilterPill
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
              label={`All (${charts.length})`}
            />
            <FilterPill
              active={statusFilter === "published"}
              onClick={() => setStatusFilter("published")}
              label={`Published (${publishedCount})`}
            />
            <FilterPill
              active={statusFilter === "draft"}
              onClick={() => setStatusFilter("draft")}
              label={`Drafts (${draftCount})`}
            />
          </div>

          {showNewChart && (
            <NewChartForm
              ceSlug={slug}
              seed={topicSeed}
              onClose={() => {
                setShowNewChart(false);
                setTopicSeed(null);
              }}
              onCreated={() => {
                qc.invalidateQueries({ queryKey: getGetCeQueryKey(slug) });
                setShowNewChart(false);
                setTopicSeed(null);
              }}
            />
          )}

          <div className="flex flex-col gap-12">
            {visibleCharts.map((chart) => (
              <ChartRow
                key={chart.id}
                chart={chart}
                ceSlug={slug}
                ceName={ce.name}
                autoEdit={editId === chart.id}
              />
            ))}
            {visibleCharts.length === 0 && (
              <div
                className="rounded-2xl p-8 text-center"
                style={{
                  background: "white",
                  border: `1px dashed ${BRAND.slate200}`,
                  color: BRAND.slate700,
                  fontWeight: 600,
                }}
              >
                No charts match this filter.
              </div>
            )}
          </div>
        </div>

        {showIntel && (
          <IntelPanel
            slug={slug}
            onClose={() => setShowIntel(false)}
            onChartCreated={() => {
              qc.invalidateQueries({ queryKey: getGetCeQueryKey(slug) });
              qc.invalidateQueries({ queryKey: getListCesQueryKey() });
              setStatusFilter("draft");
            }}
          />
        )}

        {showIdeation && !showIntel && (
          <IdeationPanel
            slug={slug}
            onClose={() => setShowIdeation(false)}
            onUseProposal={(p) => {
              setTopicSeed({ topic: p.topic, archetype: p.archetype });
              setShowNewChart(true);
              setShowIdeation(false);
            }}
          />
        )}
      </main>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? BRAND.purps : "white",
        color: active ? "white" : BRAND.slate700,
        border: `1px solid ${active ? BRAND.purps : BRAND.slate200}`,
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Chart row + edit mode                                                       */
/* -------------------------------------------------------------------------- */

function ChartRow({
  chart,
  ceSlug,
  ceName,
  autoEdit,
}: {
  chart: Chart;
  ceSlug: string;
  ceName: string;
  autoEdit?: boolean;
}) {
  const [mode, setMode] = useState<"view" | "edit">(autoEdit ? "edit" : "view");
  const [verification, setVerification] = useState<ChartVerification | null>(
    null,
  );
  useEffect(() => {
    if (autoEdit) setMode("edit");
  }, [autoEdit]);

  // When the writer clicks "Apply suggested edits" on the verifier panel we
  // open the editor pre-loaded with the verifier's suggested spec instead of
  // the saved one. This is just a stash that flows into ChartEditor as
  // `initialSpec`; once the editor closes we drop it.
  const [editorSeed, setEditorSeed] = useState<ChartSpec | null>(null);
  const qc = useQueryClient();

  const updateMut = useUpdateChart();
  const publishMut = usePublishChart();
  const verifyMut = useVerifyChart();
  const [isDeleting, setIsDeleting] = useState(false);

  const spec = chart.spec as unknown as ChartSpec;
  const meta = CHART_TYPE_META[spec.type] ?? { label: spec.type, emoji: "📈" };
  const opts = { preserve: ceName };
  const headline = toSentenceCase(chart.question || chart.title, opts);
  const insightText = chart.insight ? toSentenceCase(chart.insight, opts) : null;
  const frame =
    CHART_FRAME[spec.type] ?? { aspectRatio: "16 / 10", minHeight: 320 };

  const status = chart.status ?? "published";
  const isDraft = status === "draft";

  async function handlePublishToggle() {
    await publishMut.mutateAsync({
      id: chart.id,
      data: { status: isDraft ? "published" : "draft" },
    });
    qc.invalidateQueries({ queryKey: getGetCeQueryKey(ceSlug) });
  }

  async function handleVerify() {
    setVerification(null);
    const result = await verifyMut.mutateAsync({ id: chart.id });
    setVerification(result);
  }

  async function handleDeleteChart() {
    if (
      !confirm(
        `Delete "${headline}"? This removes the chart from this CE and cannot be undone.`,
      )
    ) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/charts/${chart.id}`, { method: "DELETE" });
      if (!res.ok) {
        let message = `Delete failed (${res.status})`;
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          // keep default
        }
        throw new Error(message);
      }
      await qc.invalidateQueries({ queryKey: getGetCeQueryKey(ceSlug) });
      await qc.invalidateQueries({ queryKey: getListCesQueryKey() });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete chart");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
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
            <StatusBadge status={status} />
            {chart.lastEditedByWriterAt && (
              <span
                title={`Last edited ${new Date(chart.lastEditedByWriterAt).toLocaleString()}`}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: BRAND.slate500,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                · Writer-edited
              </span>
            )}
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
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setMode(mode === "edit" ? "view" : "edit")}
            style={ghostBtn(mode === "edit")}
          >
            {mode === "edit" ? <X size={14} /> : <Pencil size={14} />}
            {mode === "edit" ? "Done" : "Edit"}
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
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifyMut.isPending}
            style={ghostBtn(false)}
          >
            {verifyMut.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ShieldCheck size={14} />
            )}
            Verify
          </button>
          <button
            type="button"
            onClick={handlePublishToggle}
            disabled={publishMut.isPending}
            style={{
              ...ghostBtn(false),
              background: isDraft ? BRAND.purps : "white",
              color: isDraft ? "white" : BRAND.slate950,
              borderColor: isDraft ? BRAND.purps : BRAND.slate200,
            }}
          >
            {publishMut.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : isDraft ? (
              <Eye size={14} />
            ) : (
              <EyeOff size={14} />
            )}
            {isDraft ? "Publish" : "Unpublish"}
          </button>

          {Array.isArray(
            (chart.provenance as { intelligence_refs?: string[] } | null)
              ?.intelligence_refs,
          ) &&
            ((chart.provenance as { intelligence_refs?: string[] })
              .intelligence_refs?.length ?? 0) > 0 && (
              <ChartCitations
                ceSlug={ceSlug}
                refs={
                  (chart.provenance as { intelligence_refs?: string[] })
                    .intelligence_refs ?? []
                }
              />
            )}

          <EmbedActions chartId={chart.id} />
          <button
            type="button"
            onClick={handleDeleteChart}
            disabled={isDeleting}
            style={{
              ...ghostBtn(false),
              color: BRAND.candy,
              borderColor: BRAND.candySoft,
              background: "white",
            }}
            title="Delete chart"
          >
            {isDeleting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            Delete
          </button>
        </div>
      </div>

      {verification && (
        <VerifyResult
          result={verification}
          onClose={() => setVerification(null)}
          onApplySuggestion={
            verification.suggestedSpec
              ? () => {
                  setEditorSeed(
                    verification.suggestedSpec as unknown as ChartSpec,
                  );
                  setMode("edit");
                  setVerification(null);
                }
              : undefined
          }
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] items-start">
        <div
          className="rounded-3xl overflow-hidden"
          style={{ background: BRAND.slate100 }}
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
              provenance={chart.provenance as ChartProvenanceLite | null}
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
          <ProvenanceDisclosure
            provenance={chart.provenance as ChartProvenanceLite | null}
          />
        </aside>
      </div>

      {mode === "edit" && (
        <ChartEditor
          chart={chart}
          ceSlug={ceSlug}
          onCancel={() => {
            setMode("view");
            setEditorSeed(null);
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: getGetCeQueryKey(ceSlug) });
            setMode("view");
            setEditorSeed(null);
          }}
          updateMut={updateMut}
          initialSpec={editorSeed ?? undefined}
        />
      )}
    </section>
  );
}

function ProvenanceDisclosure({
  provenance,
}: {
  provenance: ChartProvenanceLite | null;
}) {
  if (!provenance) return null;

  const drdSnippets = (provenance.drd_snippets ?? []).filter(Boolean);
  const webSources = (provenance.web_sources ?? []).filter(
    (source) => source?.title || source?.url,
  );
  const estimates = (provenance.estimates ?? []).filter(
    (estimate) => estimate?.field || estimate?.reasoning,
  );
  const intelRefs = provenance.intelligence_refs ?? [];
  const verifierNotes = provenance.verifier_notes?.trim();

  if (
    drdSnippets.length === 0 &&
    webSources.length === 0 &&
    estimates.length === 0 &&
    intelRefs.length === 0 &&
    !verifierNotes &&
    !provenance.status
  ) {
    return null;
  }

  const status = provenance.status ?? "estimated";
  const isEstimated = status === "estimated" || estimates.length > 0;
  const statusCopy =
    status === "drd_grounded"
      ? "DRD grounded"
      : status === "web_grounded"
        ? "Source grounded"
        : "Estimated";

  return (
    <details
      open={isEstimated}
      style={{
        border: `1px solid ${isEstimated ? BRAND.candySoft : BRAND.slate200}`,
        borderRadius: 12,
        background: isEstimated ? "#FFF7FB" : "white",
        padding: "10px 12px",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          listStyle: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          color: BRAND.slate900,
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        Evidence & estimates
        <span
          style={{
            borderRadius: 999,
            padding: "3px 8px",
            background: isEstimated ? BRAND.candySoft : BRAND.bgMint,
            color: isEstimated ? BRAND.candy : "#0E8F4E",
            fontSize: 10,
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          {statusCopy}
        </span>
      </summary>

      <div className="mt-3 flex flex-col gap-3">
        {drdSnippets.length > 0 && (
          <ProvenanceSection title="Facts we know">
            {drdSnippets.slice(0, 3).map((snippet, index) => (
              <p key={`${snippet}-${index}`} style={provenanceTextStyle}>
                {snippet}
              </p>
            ))}
          </ProvenanceSection>
        )}

        {intelRefs.length > 0 && (
          <ProvenanceSection title="CE Intel references">
            <p style={provenanceTextStyle}>
              {intelRefs.length} source-backed fact
              {intelRefs.length === 1 ? "" : "s"} used. Open citations from the
              chart actions to inspect them.
            </p>
          </ProvenanceSection>
        )}

        {webSources.length > 0 && (
          <ProvenanceSection title="Sources">
            {webSources.slice(0, 4).map((source, index) => (
              <a
                key={`${source.url ?? source.title}-${index}`}
                href={source.url || undefined}
                target="_blank"
                rel="noreferrer"
                style={{
                  ...provenanceTextStyle,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  color: BRAND.purps,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                {source.title || source.url || "Source"}
                {source.url && <ExternalLink size={11} />}
              </a>
            ))}
          </ProvenanceSection>
        )}

        {estimates.length > 0 && (
          <ProvenanceSection title="Claims inferred or estimated">
            {estimates.slice(0, 4).map((estimate, index) => (
              <p key={`${estimate.field}-${index}`} style={provenanceTextStyle}>
                <strong>{estimate.field || "Estimated field"}:</strong>{" "}
                {estimate.reasoning || "Marked as estimated by the generator."}
              </p>
            ))}
          </ProvenanceSection>
        )}

        {verifierNotes && (
          <ProvenanceSection title="Verifier note">
            <p style={provenanceTextStyle}>{verifierNotes}</p>
          </ProvenanceSection>
        )}
      </div>
    </details>
  );
}

const provenanceTextStyle: React.CSSProperties = {
  color: BRAND.slate700,
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1.45,
};

function ProvenanceSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        style={{
          color: BRAND.slate500,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isDraft = status === "draft";
  return (
    <span
      style={{
        background: isDraft ? "#FFE7C2" : BRAND.bgMint,
        color: isDraft ? "#7A4A00" : "#0E8F4E",
        padding: "3px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {isDraft ? "Draft" : "Published"}
    </span>
  );
}

function ghostBtn(active: boolean): React.CSSProperties {
  return {
    background: active ? BRAND.slate100 : "white",
    color: BRAND.slate950,
    border: `1px solid ${BRAND.slate200}`,
    padding: "8px 12px",
    borderRadius: 10,
    fontWeight: 800,
    fontSize: 12,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
}

/* -------------------------------------------------------------------------- */
/* Chart editor                                                                */
/* -------------------------------------------------------------------------- */

type UpdateMut = ReturnType<typeof useUpdateChart>;

function ChartEditor({
  chart,
  ceSlug,
  onCancel,
  onSaved,
  updateMut,
  initialSpec,
}: {
  chart: Chart;
  ceSlug: string;
  onCancel: () => void;
  onSaved: () => void;
  updateMut: UpdateMut;
  /**
   * Optional override for the spec the editor opens with — used when the
   * verifier surfaces a suggested spec and the writer clicks
   * "Apply suggested edits", which opens the editor pre-loaded with the
   * suggestion instead of the saved spec.
   */
  initialSpec?: ChartSpec;
}) {
  const [question, setQuestion] = useState(chart.question || "");
  const [title, setTitle] = useState(chart.title);
  const [subtitle, setSubtitle] = useState(chart.subtitle || "");
  const [insight, setInsight] = useState(chart.insight || "");
  const [writerId, setWriterId] = useState("");
  // `interactive` defaults to true on the server, so legacy rows the API
  // serializes without the field still render with affordances on. Writers
  // flip this off for embeds that should ship as static visuals only.
  const [interactive, setInteractive] = useState<boolean>(
    chart.interactive ?? true,
  );
  const [spec, setSpec] = useState<ChartSpec>(
    () => initialSpec ?? (chart.spec as unknown as ChartSpec),
  );
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const qc = useQueryClient();

  const previewFrame =
    CHART_FRAME[spec.type] ?? CHART_FRAME[(chart.spec as unknown as ChartSpec).type];

  async function handleSave() {
    setError(null);
    setSavedAt(null);
    try {
      await updateMut.mutateAsync({
        id: chart.id,
        data: {
          question,
          title,
          subtitle: subtitle || undefined,
          insight: insight || undefined,
          spec: spec as unknown as Record<string, unknown>,
          writerId: writerId || undefined,
          interactive,
        },
      });
      setSavedAt(Date.now());
      qc.invalidateQueries({ queryKey: getGetCeQueryKey(ceSlug) });
      setTimeout(() => setSavedAt(null), 1600);
      onSaved();
    } catch (e) {
      const msg =
        e && typeof e === "object" && "data" in e
          ? (e as { data?: { error?: string } }).data?.error ?? "Save failed"
          : e instanceof Error
          ? e.message
          : "Save failed";
      setError(msg);
    }
  }

  return (
    <div
      className="mt-5 rounded-2xl p-5"
      style={{ background: "white", border: `1px solid ${BRAND.slate200}` }}
    >
      <div
        className="flex items-center justify-between gap-3 mb-4"
        style={{ borderBottom: `1px solid ${BRAND.slate100}`, paddingBottom: 12 }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: BRAND.purps,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Edit chart · spec type is locked to {(chart.spec as unknown as ChartSpec).type}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} style={ghostBtn(false)}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMut.isPending}
            style={{
              background: savedAt ? BRAND.bgMint : BRAND.purps,
              color: savedAt ? "#0E8F4E" : "white",
              border: "none",
              padding: "8px 14px",
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 12,
              cursor: updateMut.isPending ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {updateMut.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : savedAt ? (
              <Check size={14} />
            ) : (
              <Check size={14} />
            )}
            {savedAt ? "Saved" : "Save changes"}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="flex flex-col gap-3">
          <EditField label="Visitor question" value={question} onChange={setQuestion} />
          <EditField label="Title" value={title} onChange={setTitle} />
          <EditField label="Subtitle" value={subtitle} onChange={setSubtitle} />
          <EditField
            label="Insight (footer line)"
            value={insight}
            onChange={setInsight}
            multiline
          />
          <div className="grid grid-cols-2 gap-4">
            <EditField
              label="Writer ID / Name"
              value={writerId}
              onChange={setWriterId}
            />
            <label className="flex flex-col gap-1.5">
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: BRAND.slate700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Interactivity
              </span>
              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  checked={interactive}
                  onChange={(e) => setInteractive(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  Enable hover/tooltips
                </span>
              </div>
            </label>
          </div>

          <SpecEditor spec={spec} onChange={setSpec} />
          <label
            className="flex items-center gap-2 mt-1"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${BRAND.slate200}`,
              background: BRAND.slate50,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={interactive}
              onChange={(e) => setInteractive(e.target.checked)}
              style={{ accentColor: BRAND.purps, cursor: "pointer" }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: BRAND.slate950,
              }}
            >
              Interactive in embed
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: BRAND.slate700,
              }}
            >
              — turn off to ship this chart as a static visual.
            </span>
          </label>
          {error && (
            <div
              style={{
                background: BRAND.candySoft,
                color: BRAND.candy,
                padding: "10px 12px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: BRAND.slate700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Live preview
          </div>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: BRAND.slate100 }}
          >
            <div
              className="w-full"
              style={{
                aspectRatio: previewFrame.aspectRatio,
                minHeight: previewFrame.minHeight,
                maxHeight: previewFrame.maxHeight,
              }}
            >
              <ChartRenderer
                spec={spec}
                provenance={chart.provenance as ChartProvenanceLite | null}
                header={{
                  title,
                  subtitle: subtitle || undefined,
                  question,
                  insight: insight || undefined,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: BRAND.slate700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle()}
          rows={3}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle()}
        />
      )}
    </label>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    background: BRAND.slate50,
    border: `1px solid ${BRAND.slate200}`,
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 600,
    color: BRAND.slate950,
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical",
  };
}

/* -------------------------------------------------------------------------- */
/* Verify result                                                               */
/* -------------------------------------------------------------------------- */

function VerifyResult({
  result,
  onClose,
  onApplySuggestion,
}: {
  result: ChartVerification;
  onClose: () => void;
  onApplySuggestion?: () => void;
}) {
  const isOk = result.status === "ok";
  return (
    <div
      className="mb-4 rounded-2xl p-4"
      style={{
        background: isOk ? BRAND.bgMint : "#FFF6E0",
        border: `1px solid ${isOk ? "#7AD2A6" : "#F2C879"}`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          style={{
            color: isOk ? "#0E8F4E" : "#7A4A00",
            marginTop: 2,
          }}
        >
          {isOk ? <CheckCircle2 size={18} /> : <ShieldCheck size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: isOk ? "#0E8F4E" : "#7A4A00",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Verifier · {result.status}
          </div>
          <p
            style={{
              fontSize: 13,
              color: BRAND.slate900,
              fontWeight: 600,
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            {result.verifierNotes || "(no notes)"}
          </p>
          {result.issues.length > 0 && (
            <ul style={{ marginTop: 8, paddingLeft: 18 }}>
              {result.issues.map((i, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: 12,
                    color: BRAND.slate900,
                    fontWeight: 600,
                    lineHeight: 1.5,
                  }}
                >
                  {i}
                </li>
              ))}
            </ul>
          )}
          {result.suggestions.length > 0 && (
            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                fontWeight: 800,
                color: BRAND.slate700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Suggestions
            </div>
          )}
          {result.suggestions.length > 0 && (
            <ul style={{ marginTop: 4, paddingLeft: 18 }}>
              {result.suggestions.map((s, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: 12,
                    color: BRAND.slate900,
                    fontWeight: 600,
                    lineHeight: 1.5,
                  }}
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
          {onApplySuggestion && (
            <button
              type="button"
              onClick={onApplySuggestion}
              style={{
                marginTop: 12,
                background: BRAND.purps,
                color: "white",
                border: "none",
                padding: "8px 14px",
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Sparkles size={14} />
              Apply suggested edits
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: BRAND.slate700,
          }}
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* New-chart form                                                              */
/* -------------------------------------------------------------------------- */

const ARCHETYPE_OPTIONS = [
  "weekly_pattern",
  "hourly_heatmap",
  "month_calendar",
  "booking_window",
  "seasonal_curve",
  "stat_grid",
  "compare_zones",
  "donut_breakdown",
  "ticket_ladder",
  "route_profile",
  "history_timeline",
];

function NewChartForm({
  ceSlug,
  onClose,
  onCreated,
  seed,
}: {
  ceSlug: string;
  onClose: () => void;
  onCreated: () => void;
  seed?: { topic: string; archetype?: string } | null;
}) {
  const [topic, setTopic] = useState(seed?.topic ?? "");
  const [archetype, setArchetype] = useState<string>(seed?.archetype ?? "");
  const [pastedData, setPastedData] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createMut = useCreateChartFromTopic();

  // If a fresh seed arrives (writer clicked another idea while the form was
  // already open), refresh the inputs without clobbering manual edits to
  // unrelated fields.
  useEffect(() => {
    if (seed) {
      setTopic(seed.topic);
      setArchetype(seed.archetype ?? "");
    }
  }, [seed]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (topic.trim().length < 4) {
      setError("Tell us a bit more about what this chart should answer.");
      return;
    }
    try {
      await createMut.mutateAsync({
        slug: ceSlug,
        data: {
          topic: topic.trim(),
          archetype: archetype || undefined,
          pastedData: pastedData.trim() || undefined,
          sourceUrl: sourceUrl.trim() || undefined,
        },
      });
      setTopic("");
      setArchetype("");
      setPastedData("");
      setSourceUrl("");
      onCreated();
    } catch (e) {
      const msg =
        e && typeof e === "object" && "data" in e
          ? (e as { data?: { error?: string } }).data?.error ??
            "Generation failed"
          : e instanceof Error
          ? e.message
          : "Generation failed";
      setError(msg);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 rounded-2xl p-5"
      style={{ background: "white", border: `1px solid ${BRAND.slate200}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="inline-flex items-center gap-1.5"
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: BRAND.purps,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <Sparkles size={13} />
          New chart from topic
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: BRAND.slate700,
          }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <EditField
          label="Topic / question"
          value={topic}
          onChange={setTopic}
          multiline
        />
        <label className="flex flex-col gap-1.5">
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: BRAND.slate700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Archetype (optional)
          </span>
          <select
            value={archetype}
            onChange={(e) => setArchetype(e.target.value)}
            style={inputStyle()}
          >
            <option value="">Auto-detect</option>
            {ARCHETYPE_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <EditField
          label="Pasted data (optional)"
          value={pastedData}
          onChange={setPastedData}
          multiline
        />
        <EditField
          label="Source URL (optional)"
          value={sourceUrl}
          onChange={setSourceUrl}
        />
      </div>

      {error && (
        <div
          className="mt-3"
          style={{
            background: BRAND.candySoft,
            color: BRAND.candy,
            padding: "10px 12px",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={createMut.isPending}
          style={{
            background: BRAND.purps,
            color: "white",
            border: "none",
            padding: "10px 18px",
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 13,
            cursor: createMut.isPending ? "wait" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {createMut.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          Generate draft
        </button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Ideation panel                                                              */
/* -------------------------------------------------------------------------- */

function IdeationPanel({
  slug,
  onClose,
  onUseProposal,
}: {
  slug: string;
  onClose: () => void;
  onUseProposal: (p: { topic: string; archetype?: string }) => void;
}) {
  const { data: messages = [], isLoading } = useGetIdeation(slug);
  const clearMut = useClearIdeation();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [contextText, setContextText] = useState("");
  const [contextPdf, setContextPdf] = useState<File | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [pendingEcho, setPendingEcho] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cancelledByUserRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, isSending, pendingEcho]);

  function restoreInputs(
    text: string,
    ctxText: string,
    ctxPdf: File | null,
  ) {
    setDraft(text);
    setContextText(ctxText);
    setContextPdf(ctxPdf);
    if (ctxText || ctxPdf) setShowContext(true);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || isSending) return;
    const text = draft.trim();
    const ctxText = contextText.trim();
    const ctxPdf = contextPdf;
    setSendError(null);
    setIsSending(true);
    // Optimistically clear inputs and echo the user's message so the
    // panel never looks blank while waiting.
    setDraft("");
    setContextText("");
    setContextPdf(null);
    setShowContext(false);
    setPendingEcho(text);

    cancelledByUserRef.current = false;
    let timedOut = false;
    const controller = new AbortController();
    abortRef.current = controller;
    const CLIENT_TIMEOUT_MS = 60_000;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CLIENT_TIMEOUT_MS);

    try {
      const url = `${BASE}/api/ces/${encodeURIComponent(slug)}/ideation`;
      let res: Response;
      if (ctxText || ctxPdf) {
        const fd = new FormData();
        fd.append("message", text);
        if (ctxText) fd.append("contextText", ctxText);
        if (ctxPdf) fd.append("contextPdf", ctxPdf);
        res = await fetch(url, {
          method: "POST",
          body: fd,
          signal: controller.signal,
        });
      } else {
        res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: text }),
          signal: controller.signal,
        });
      }
      if (!res.ok) {
        let msg = `Request failed (${res.status})`;
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) msg = body.error;
        } catch {
          // keep default
        }
        throw new Error(msg);
      }
      await qc.invalidateQueries({ queryKey: getGetIdeationQueryKey(slug) });
      await qc.refetchQueries({ queryKey: getGetIdeationQueryKey(slug) });
      setPendingEcho(null);
    } catch (err) {
      const aborted =
        controller.signal.aborted ||
        (err instanceof DOMException && err.name === "AbortError") ||
        (err instanceof Error && err.name === "AbortError");
      const msg = cancelledByUserRef.current
        ? "Cancelled — your draft has been restored."
        : timedOut || aborted
          ? "The model didn't respond in time — try again. Your draft has been restored."
          : err instanceof Error
            ? err.message
            : "Failed to send";
      setSendError(msg);
      restoreInputs(text, ctxText, ctxPdf);
      setPendingEcho(null);
    } finally {
      clearTimeout(timer);
      abortRef.current = null;
      setIsSending(false);
    }
  }

  function handleCancel() {
    cancelledByUserRef.current = true;
    abortRef.current?.abort();
  }

  async function handleClear() {
    if (!confirm("Clear the ideation transcript?")) return;
    await clearMut.mutateAsync({ slug });
    qc.invalidateQueries({ queryKey: getGetIdeationQueryKey(slug) });
  }

  const contextSourceCount =
    (contextText.trim() ? 1 : 0) + (contextPdf ? 1 : 0);

  return (
    <aside
      className="self-start sticky"
      style={{
        top: 96,
        background: "white",
        border: `1px solid ${BRAND.slate200}`,
        borderRadius: 20,
        padding: 16,
        height: "calc(100vh - 120px)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="inline-flex items-center gap-2"
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: BRAND.slate950,
            letterSpacing: "-0.01em",
          }}
        >
          <MessageSquare size={14} color={BRAND.purps} />
          Chart ideation
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleClear}
            disabled={clearMut.isPending || messages.length === 0}
            title="Clear transcript"
            style={{
              background: "transparent",
              border: "none",
              cursor: messages.length === 0 ? "not-allowed" : "pointer",
              color: BRAND.slate500,
              padding: 4,
            }}
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: BRAND.slate700,
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1"
        style={{ scrollbarWidth: "thin" }}
      >
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2
              size={18}
              className="animate-spin"
              color={BRAND.purps}
            />
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div
            style={{
              color: BRAND.slate700,
              fontSize: 12,
              fontWeight: 600,
              padding: "16px 4px",
              lineHeight: 1.5,
            }}
          >
            Brainstorm chart ideas with the AI partner. It knows your DRD and
            existing deck. Ask things like "what charts would help peak-season
            visitors?" or "is there a better question for the duration chart?"
          </div>
        )}
        {messages.map((m) => (
          <IdeationBubble
            key={m.id}
            message={m}
            onUseProposal={onUseProposal}
          />
        ))}
        {pendingEcho && (
          <div
            className="flex flex-col gap-1.5"
            style={{ alignItems: "flex-end" }}
          >
            <div
              style={{
                background: BRAND.purpsSoft,
                color: BRAND.slate950,
                padding: "10px 12px",
                borderRadius: 14,
                maxWidth: "92%",
                fontSize: 13,
                fontWeight: 500,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                border: `1px solid ${BRAND.purpsSoft}`,
                opacity: 0.85,
              }}
            >
              {pendingEcho}
            </div>
          </div>
        )}
        {isSending && (
          <div
            style={{
              color: BRAND.slate500,
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 6px",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Loader2 size={12} className="animate-spin" />
            Thinking…
            <button
              type="button"
              onClick={handleCancel}
              style={{
                background: "transparent",
                border: `1px solid ${BRAND.slate200}`,
                color: BRAND.slate700,
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {sendError && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#991B1B",
            borderRadius: 10,
            padding: "8px 10px",
            fontSize: 11,
            fontWeight: 700,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
            {sendError}
          </span>
          <button
            type="button"
            onClick={() => setSendError(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "#991B1B",
              cursor: "pointer",
              padding: 2,
              fontWeight: 800,
            }}
            aria-label="Dismiss"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {showContext && (
        <div
          style={{
            background: BRAND.slate50,
            border: `1px solid ${BRAND.slate200}`,
            borderRadius: 12,
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: BRAND.slate700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            One-shot context for this turn
          </div>
          <textarea
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            placeholder="Paste a doc, notes, transcript, anything the AI should consider just for this question…"
            rows={4}
            style={{
              background: "white",
              border: `1px solid ${BRAND.slate200}`,
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 12,
              fontWeight: 500,
              color: BRAND.slate950,
              outline: "none",
              fontFamily: "inherit",
              resize: "vertical",
              minHeight: 70,
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
                onChange={(e) => setContextPdf(e.target.files?.[0] ?? null)}
              />
              {contextPdf ? "Replace PDF" : "Attach PDF"}
            </label>
            {contextPdf && (
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
                  title={contextPdf.name}
                >
                  {contextPdf.name}
                </span>
                <button
                  type="button"
                  onClick={() => setContextPdf(null)}
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
            Used only for this turn — not saved to the transcript. PDFs ≤ 20 MB.
          </div>
        </div>
      )}

      <form onSubmit={handleSend} className="flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask for chart ideas, critique, archetype matches…"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e as unknown as React.FormEvent);
              }
            }}
            style={{
              flex: 1,
              background: BRAND.slate50,
              border: `1px solid ${BRAND.slate200}`,
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 13,
              fontWeight: 600,
              color: BRAND.slate950,
              outline: "none",
              fontFamily: "inherit",
              resize: "none",
            }}
          />
          <button
            type="submit"
            disabled={isSending || !draft.trim()}
            style={{
              background: BRAND.purps,
              color: "white",
              border: "none",
              padding: "10px 12px",
              borderRadius: 12,
              cursor: isSending ? "wait" : "pointer",
              opacity: !draft.trim() ? 0.5 : 1,
            }}
            title="Send"
          >
            <Send size={14} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowContext((v) => !v)}
          style={{
            alignSelf: "flex-start",
            background: showContext ? BRAND.purpsSoft : "transparent",
            color: BRAND.purps,
            border: `1px solid ${showContext ? BRAND.purps : BRAND.slate200}`,
            borderRadius: 999,
            padding: "4px 10px",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.02em",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {showContext ? "Hide context" : "Add context"}
          {contextSourceCount > 0 && ` · ${contextSourceCount}`}
        </button>
      </form>
    </aside>
  );
}

function IdeationBubble({
  message,
  onUseProposal,
}: {
  message: IdeationMessage;
  onUseProposal?: (p: { topic: string; archetype?: string }) => void;
}) {
  const isUser = message.role === "user";
  // Backend now persists proposals as a raw array (see #ces.ts ideation
  // route). Older rows might still carry the legacy `{items: [...]}` shape
  // — keep the fallback so historical transcripts still render.
  const proposalsObj = message.proposals as
    | { items?: unknown[] }
    | unknown[]
    | null
    | undefined;
  const items: unknown[] = Array.isArray(proposalsObj)
    ? proposalsObj
    : Array.isArray(proposalsObj?.items)
    ? proposalsObj!.items!
    : [];
  // Strip the trailing JSON code fence from assistant messages so we don't
  // render the raw block inline — the proposals array already covers it.
  const display = isUser
    ? message.content
    : message.content.replace(/```(?:json)?[\s\S]*?```/g, "").trim();

  return (
    <div
      className="flex flex-col gap-1.5"
      style={{ alignItems: isUser ? "flex-end" : "flex-start" }}
    >
      <div
        style={{
          background: isUser ? BRAND.purpsSoft : BRAND.slate50,
          color: BRAND.slate950,
          padding: "10px 12px",
          borderRadius: 14,
          maxWidth: "92%",
          fontSize: 13,
          fontWeight: 500,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          border: `1px solid ${isUser ? BRAND.purpsSoft : BRAND.slate100}`,
        }}
      >
        {display || "(empty)"}
      </div>
      {items.length > 0 && (
        <div className="flex flex-col gap-1.5 w-full">
          {items.map((raw, i) => {
            const p = raw as {
              topic?: string;
              archetype?: string;
              rationale?: string;
            };
            return (
              <div
                key={i}
                style={{
                  background: "white",
                  border: `1px dashed ${BRAND.slate200}`,
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    color: BRAND.slate950,
                    marginBottom: 2,
                  }}
                >
                  {p.topic ?? "Untitled idea"}
                </div>
                <div
                  style={{
                    color: BRAND.purps,
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {p.archetype ?? "—"}
                </div>
                {p.rationale && (
                  <div
                    style={{
                      color: BRAND.slate700,
                      fontWeight: 500,
                      marginTop: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    {p.rationale}
                  </div>
                )}
                {onUseProposal && p.topic && (
                  <button
                    type="button"
                    onClick={() =>
                      onUseProposal({
                        topic: p.topic!,
                        archetype: p.archetype,
                      })
                    }
                    style={{
                      marginTop: 6,
                      background: BRAND.purps,
                      color: "white",
                      border: "none",
                      padding: "4px 10px",
                      borderRadius: 8,
                      fontWeight: 800,
                      fontSize: 11,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Sparkles size={11} />
                    Use this idea
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Embed actions (unchanged)                                                   */
/* -------------------------------------------------------------------------- */

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
          ...ghostBtn(false),
          background: copied === "url" ? BRAND.bgMint : "white",
          color: copied === "url" ? "#0E8F4E" : BRAND.slate950,
        }}
      >
        {copied === "url" ? <Check size={14} /> : <Copy size={14} />}
        {copied === "url" ? "Copied" : "URL"}
      </button>
      <button
        type="button"
        onClick={() => copy(iframe, "iframe")}
        style={{
          ...ghostBtn(false),
          background: copied === "iframe" ? BRAND.bgMint : "white",
          color: copied === "iframe" ? "#0E8F4E" : BRAND.slate950,
        }}
      >
        {copied === "iframe" ? <Check size={14} /> : <Code2 size={14} />}
        {copied === "iframe" ? "Copied" : "iframe"}
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
