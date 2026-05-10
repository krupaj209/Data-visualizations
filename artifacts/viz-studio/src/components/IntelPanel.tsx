import { useEffect, useState, type ReactNode } from "react";
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
  FileText,
  Upload,
  ChevronDown,
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
import { CHART_TYPE_META } from "@/components/charts/meta";

type CreatedPlanChart = {
  chartId: number;
  verifyStatus: "checking" | "passed" | "issues" | "failed";
  verifyLabel: string;
};

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
  evidence_inventory_detailed?: {
    categories?: {
      id: string;
      label: string;
      strength: string;
      items?: {
        id: string;
        claim: string;
        confidence: number;
        source_type?: string;
        source_ref?: string;
      }[];
      gaps?: string[];
    }[];
    gaps?: { category: string; reason: string }[];
  };
  evidence_inventory?: {
    id: string;
    label: string;
    fact_count: number;
    confidence: string;
    sample_facts?: string[];
  }[];
  recommended_visualizations: {
    question: string;
    archetype: string;
    why_it_matters: string;
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
    evidence_reason?: string;
    confidence: number;
    source_refs?: string[];
  }[];
  live_search_notes?: { finding: string; source_url?: string }[];
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
  const [rejectedContext, setRejectedContext] = useState<Record<string, string>>(
    () => ({}),
  );
  const [rejectedArchetype, setRejectedArchetype] = useState<Record<string, string>>(
    () => ({}),
  );
  const [showContextUpload, setShowContextUpload] = useState(false);
  const [drdStatus, setDrdStatus] = useState<{
    sourceFilename?: string | null;
    markdownLength: number;
    updatedAt: string;
  } | null>(null);
  const [drdText, setDrdText] = useState("");
  const [drdFile, setDrdFile] = useState<File | null>(null);
  const [drdError, setDrdError] = useState<string | null>(null);
  const [isUploadingDrd, setIsUploadingDrd] = useState(false);
  const [createdCharts, setCreatedCharts] = useState<
    Record<string, CreatedPlanChart>
  >(
    () => ({}),
  );

  const intel = (data ?? null) as CeIntelligence | null;
  const savedPlan = (intel as unknown as { visualizationPlan?: unknown } | null)
    ?.visualizationPlan as VisualizationPlan | undefined;

  useEffect(() => {
    if (!plan && savedPlan) setPlan(savedPlan);
  }, [plan, savedPlan]);

  useEffect(() => {
    let cancelled = false;
    async function loadDrdStatus() {
      try {
        const res = await fetch(`/api/drds/${slug}`);
        if (res.status === 404) {
          if (!cancelled) setDrdStatus(null);
          return;
        }
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to load DRD");
        if (!cancelled) {
          setDrdStatus({
            sourceFilename: json?.sourceFilename ?? null,
            markdownLength: Number(json?.markdownLength ?? 0),
            updatedAt: String(json?.updatedAt ?? ""),
          });
        }
      } catch {
        if (!cancelled) setDrdStatus(null);
      }
    }
    loadDrdStatus();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function handleUploadDrd() {
    setIsUploadingDrd(true);
    setDrdError(null);
    try {
      let res: Response;
      if (drdFile) {
        const form = new FormData();
        form.append("ceSlug", slug);
        form.append("file", drdFile);
        res = await fetch("/api/drds", { method: "POST", body: form });
      } else {
        res = await fetch("/api/drds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ceSlug: slug,
            markdown: drdText,
            sourceFilename: "CE Intel context",
          }),
        });
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "DRD upload failed");
      setDrdStatus({
        sourceFilename: json?.sourceFilename ?? null,
        markdownLength: Number(json?.markdownLength ?? 0),
        updatedAt: String(json?.updatedAt ?? new Date().toISOString()),
      });
      setDrdText("");
      setDrdFile(null);
      setShowContextUpload(false);
      setPlan(null);
      qc.invalidateQueries({ queryKey: getGetCeIntelligenceQueryKey(slug) });
    } catch (err) {
      setDrdError(err instanceof Error ? err.message : "DRD upload failed");
    } finally {
      setIsUploadingDrd(false);
    }
  }

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

  async function handleSearchMoreForRejected(
    item: VisualizationPlan["rejected_visualizations"][number],
  ) {
    setCreatingQuestion(item.question);
    setPlanError(null);
    try {
      await handleRefreshAll();
      await handlePlanVisualizations();
    } catch (err) {
      setPlanError(
        err instanceof Error ? err.message : "Could not search for more evidence",
      );
    } finally {
      setCreatingQuestion(null);
    }
  }

  async function handleCreateFromPlan(
    item: VisualizationPlan["recommended_visualizations"][number],
  ) {
    setCreatingQuestion(item.question);
    setPlanError(null);
    try {
      const evidenceSnippets = relevantEvidenceForVisualization(plan, item);
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
        plan?.live_search_notes?.length
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
      if (!res.ok) {
        throw new Error(json?.error ?? "Chart generation failed");
      }
      const chartId = Number(json?.id);
      if (!Number.isFinite(chartId)) {
        throw new Error("Chart was created, but the response did not include an id");
      }
      setCreatedCharts((prev) => ({
        ...prev,
        [item.question]: {
          chartId,
          verifyStatus: "checking",
          verifyLabel: "Verifier running",
        },
      }));
      onChartCreated?.();

      try {
        const verifyRes = await fetch(`/api/charts/${chartId}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const verifyJson = await verifyRes.json();
        if (!verifyRes.ok) {
          throw new Error(verifyJson?.error ?? "Verification failed");
        }
        const notes = String(
          verifyJson?.provenance?.verifier_notes ??
            verifyJson?.verifier_notes ??
            "",
        );
        const hasIssues =
          /issue|unsupported|contradict|remove|not supported/i.test(notes);
        setCreatedCharts((prev) => ({
          ...prev,
          [item.question]: {
            chartId,
            verifyStatus: hasIssues ? "issues" : "passed",
            verifyLabel: hasIssues ? "Verifier found issues" : "Verifier passed",
          },
        }));
        onChartCreated?.();
      } catch (err) {
        setCreatedCharts((prev) => ({
          ...prev,
          [item.question]: {
            chartId,
            verifyStatus: "failed",
            verifyLabel:
              err instanceof Error ? err.message : "Verification failed",
          },
        }));
      }
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Chart generation failed");
    } finally {
      setCreatingQuestion(null);
    }
  }

  async function handleCreateRejected(
    item: VisualizationPlan["rejected_visualizations"][number],
    mode: "context" | "estimate" | "changed_archetype",
  ) {
    const context = (rejectedContext[item.question] ?? "").trim();
    const chosenArchetype =
      rejectedArchetype[item.question] || item.archetype || undefined;
    if (mode === "context" && !context) {
      setPlanError("Add the missing context or data before creating this chart.");
      return;
    }
    if (mode === "changed_archetype" && !chosenArchetype) {
      setPlanError("Choose a chart type before creating this chart.");
      return;
    }
    setCreatingQuestion(item.question);
    setPlanError(null);
    try {
      const repairContext =
        mode === "estimate"
          ? [
              "Evidence-gap repair: editor chose Create anyway as estimate.",
              "Use honest, clearly marked estimates only where evidence is missing.",
              "Do not imply source-backed precision; add estimated fields to provenance.estimates.",
            ].join("\n")
          : mode === "changed_archetype"
            ? [
                "Evidence-gap repair: editor changed the chart type.",
                `Original rejected archetype: ${item.archetype || "none"}.`,
                `Replacement archetype: ${chosenArchetype}.`,
                context
                  ? `Editor-added context:\n${context}`
                  : "No extra context supplied; use only available evidence and mark estimates.",
              ].join("\n")
            : context;

      const res = await fetch(`/api/ces/${slug}/charts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: item.question,
          archetype: chosenArchetype,
          pastedData: repairContext,
          plannerContext: [
            `Originally rejected by planner: ${item.reason}`,
            `Repair path: ${mode}`,
          ].join("\n"),
          origin: "planner_recommendation",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "Chart generation failed");
      }
      const chartId = Number(json?.id);
      if (!Number.isFinite(chartId)) {
        throw new Error("Chart was created, but the response did not include an id");
      }
      setCreatedCharts((prev) => ({
        ...prev,
        [item.question]: {
          chartId,
          verifyStatus: "checking",
          verifyLabel: "Verifier running",
        },
      }));
      onChartCreated?.();

      try {
        const verifyRes = await fetch(`/api/charts/${chartId}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const verifyJson = await verifyRes.json();
        if (!verifyRes.ok) {
          throw new Error(verifyJson?.error ?? "Verification failed");
        }
        const notes = String(
          verifyJson?.provenance?.verifier_notes ??
            verifyJson?.verifier_notes ??
            "",
        );
        const hasIssues =
          /issue|unsupported|contradict|remove|not supported/i.test(notes);
        setCreatedCharts((prev) => ({
          ...prev,
          [item.question]: {
            chartId,
            verifyStatus: hasIssues ? "issues" : "passed",
            verifyLabel: hasIssues ? "Verifier found issues" : "Verifier passed",
          },
        }));
        onChartCreated?.();
      } catch (err) {
        setCreatedCharts((prev) => ({
          ...prev,
          [item.question]: {
            chartId,
            verifyStatus: "failed",
            verifyLabel:
              err instanceof Error ? err.message : "Verification failed",
          },
        }));
      }
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
  const questionsByText = new Map(
    (plan?.traveler_questions ?? []).map((q) => [q.question, q]),
  );

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

      <section
        style={{
          border: `1px solid ${BRAND.slate200}`,
          borderRadius: 12,
          padding: 10,
          background: drdStatus ? BRAND.bgMint : BRAND.slate50,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "center",
            gap: 8,
          }}
        >
          <FileText size={15} color={drdStatus ? BRAND.okayInk : BRAND.slate500} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 850, color: BRAND.slate950 }}>
              {drdStatus ? "Context attached" : "Add DRD / context"}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: BRAND.slate500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={drdStatus?.sourceFilename ?? undefined}
            >
              {drdStatus
                ? `${Math.round(drdStatus.markdownLength / 1000)}k chars · updated ${relativeTime(drdStatus.updatedAt)}`
                : "Paste notes or attach a PDF before planning"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowContextUpload((v) => !v)}
            style={miniBtn(drdStatus ? "light" : "dark")}
          >
            {drdStatus ? "Replace" : "Add"}
          </button>
        </div>

        {showContextUpload && (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <textarea
              value={drdText}
              onChange={(e) => setDrdText(e.target.value)}
              disabled={!!drdFile || isUploadingDrd}
              placeholder="Paste DRD markdown, research notes, source excerpts..."
              rows={4}
              style={{
                width: "100%",
                resize: "vertical",
                border: `1px solid ${BRAND.slate200}`,
                borderRadius: 10,
                padding: 9,
                fontSize: 11,
                fontWeight: 600,
                color: BRAND.slate950,
                outline: "none",
                background: drdFile ? BRAND.slate100 : "white",
              }}
            />
            <label
              style={{
                border: `1px dashed ${BRAND.slate200}`,
                borderRadius: 10,
                padding: "7px 9px",
                background: "white",
                color: BRAND.slate700,
                fontSize: 11,
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: isUploadingDrd ? "not-allowed" : "pointer",
              }}
            >
              <Upload size={13} />
              {drdFile ? drdFile.name : "Attach PDF instead"}
              <input
                type="file"
                accept="application/pdf,.pdf"
                disabled={isUploadingDrd}
                onChange={(e) => setDrdFile(e.target.files?.[0] ?? null)}
                style={{ display: "none" }}
              />
            </label>
            {drdError && (
              <div style={{ color: BRAND.candy, fontSize: 11, fontWeight: 750 }}>
                {drdError}
              </div>
            )}
            <button
              type="button"
              onClick={handleUploadDrd}
              disabled={isUploadingDrd || (!drdFile && !drdText.trim())}
              style={{
                ...miniBtn("dark"),
                justifyContent: "center",
                opacity: isUploadingDrd || (!drdFile && !drdText.trim()) ? 0.55 : 1,
                cursor:
                  isUploadingDrd || (!drdFile && !drdText.trim())
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {isUploadingDrd && <Loader2 size={12} className="animate-spin" />}
              Save context
            </button>
          </div>
        )}
      </section>

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
        Find chart opportunities
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
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                {(plan.evidence_inventory ?? []).slice(0, 4).map((bucket) => (
                  <EvidenceChip
                    key={`${bucket.id}-${bucket.label}`}
                    label={bucket.label}
                    status={bucket.confidence}
                    count={bucket.fact_count}
                  />
                ))}
              </div>
              {plan.evidence_inventory_detailed?.categories &&
                plan.evidence_inventory_detailed.categories.length > 0 && (
                  <EvidenceCoverage
                    categories={plan.evidence_inventory_detailed.categories}
                  />
                )}
              <PlanList
                title={`Recommended (${plan.recommended_visualizations.length})`}
                items={plan.recommended_visualizations.map((item) => {
                  const question = questionsByText.get(item.question);
                  const created = createdCharts[item.question];
                  return {
                    key: `${item.priority}-${item.question}`,
                    title: item.question,
                    meta: item.archetype,
                    body: item.why_it_matters,
                    tone: "good" as const,
                    evidenceStatus: question?.evidence_status,
                    confidence: question?.confidence,
                    sourceRefs: [
                      ...(question?.source_refs ?? []),
                      ...(item.evidence_refs ?? []),
                    ],
                    qualityScore: item.quality_score,
                    createdChart: created,
                    actionLabel: created
                      ? "Created"
                      : "Create chart",
                    actionDisabled:
                      !!created ||
                      creatingQuestion !== null,
                    actionBusy: creatingQuestion === item.question,
                    onAction: () => handleCreateFromPlan(item),
                  };
                })}
              />
              <PlanList
                title={`Rejected (${plan.rejected_visualizations.length})`}
                items={plan.rejected_visualizations.slice(0, 4).map((item) => ({
                  key: item.question,
                  title: item.question,
                  meta: item.archetype ?? "no chart",
                  body: item.reason,
                  tone: "warn" as const,
                  createdChart: createdCharts[item.question],
                  extra: !createdCharts[item.question] ? (
                    <RejectedRepairTools
                      item={item}
                      context={rejectedContext[item.question] ?? ""}
                      selectedArchetype={
                        rejectedArchetype[item.question] ||
                        item.archetype ||
                        ""
                      }
                      isBusy={creatingQuestion === item.question}
                      disabled={creatingQuestion !== null}
                      onContextChange={(value) =>
                        setRejectedContext((prev) => ({
                          ...prev,
                          [item.question]: value,
                        }))
                      }
                      onArchetypeChange={(value) =>
                        setRejectedArchetype((prev) => ({
                          ...prev,
                          [item.question]: value,
                        }))
                      }
                      onAddContext={() => handleCreateRejected(item, "context")}
                      onSearchMore={() => handleSearchMoreForRejected(item)}
                      onCreateEstimate={() =>
                        handleCreateRejected(item, "estimate")
                      }
                      onChangeType={() =>
                        handleCreateRejected(item, "changed_archetype")
                      }
                    />
                  ) : null,
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

function EvidenceChip({
  label,
  status,
  count,
}: {
  label: string;
  status: string;
  count: number;
}) {
  const color = evidenceColor(status);
  return (
    <span
      style={{
        borderRadius: 999,
        padding: "3px 7px",
        background: color.bg,
        color: color.fg,
        fontSize: 10,
        fontWeight: 850,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        maxWidth: "100%",
      }}
      title={`${label}: ${status}`}
    >
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span style={{ opacity: 0.8 }}>· {count}</span>
    </span>
  );
}

function EvidenceCoverage({
  categories,
}: {
  categories: NonNullable<
    VisualizationPlan["evidence_inventory_detailed"]
  >["categories"];
}) {
  const visible = (categories ?? [])
    .filter((category) => category.strength !== "missing")
    .slice(0, 6);
  const missingCount = (categories ?? []).filter(
    (category) => category.strength === "missing",
  ).length;
  if (visible.length === 0 && missingCount === 0) return null;
  return (
    <div
      style={{
        border: `1px solid ${BRAND.slate100}`,
        background: "white",
        borderRadius: 10,
        padding: 8,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 900,
          color: BRAND.slate500,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 6,
        }}
      >
        Evidence coverage
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {visible.map((category) => (
          <EvidenceChip
            key={category.id}
            label={category.label}
            status={category.strength}
            count={category.items?.length ?? 0}
          />
        ))}
        {missingCount > 0 && (
          <span
            style={{
              borderRadius: 999,
              padding: "3px 7px",
              background: BRAND.slate100,
              color: BRAND.slate700,
              fontSize: 10,
              fontWeight: 850,
            }}
          >
            {missingCount} gap{missingCount === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </div>
  );
}

function relevantEvidenceForVisualization(
  plan: VisualizationPlan | null,
  item: VisualizationPlan["recommended_visualizations"][number],
): string[] {
  const categories = plan?.evidence_inventory_detailed?.categories ?? [];
  const evidenceRefs = new Set(
    (item.evidence_refs ?? []).map((ref) => ref.toLowerCase()),
  );
  const categoriesForArchetype: Record<string, string[]> = {
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
  const allowedCategories = new Set(categoriesForArchetype[item.archetype] ?? []);
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
      const categoryMatch = allowedCategories.has(category.id);
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

function evidenceColor(status: string): { bg: string; fg: string } {
  if (status === "strong") return { bg: BRAND.bgMint, fg: BRAND.okayInk };
  if (status === "partial") return { bg: BRAND.bgCool, fg: BRAND.purps };
  if (status === "weak") return { bg: BRAND.holaSoft, fg: BRAND.hola };
  return { bg: BRAND.slate100, fg: BRAND.slate700 };
}

function miniBtn(tone: "dark" | "light") {
  return {
    border: tone === "dark" ? "none" : `1px solid ${BRAND.slate200}`,
    borderRadius: 8,
    padding: "5px 8px",
    background: tone === "dark" ? BRAND.purps : "white",
    color: tone === "dark" ? "white" : BRAND.slate950,
    fontSize: 10,
    fontWeight: 850,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    cursor: "pointer",
  } as const;
}

function verifyTone(status: CreatedPlanChart["verifyStatus"]): {
  bg: string;
  fg: string;
} {
  if (status === "passed") return { bg: BRAND.bgMint, fg: BRAND.okayInk };
  if (status === "issues") return { bg: BRAND.holaSoft, fg: BRAND.hola };
  if (status === "failed") return { bg: BRAND.candySoft, fg: BRAND.candy };
  return { bg: BRAND.bgCool, fg: BRAND.purps };
}

function RejectedRepairTools({
  item,
  context,
  selectedArchetype,
  isBusy,
  disabled,
  onContextChange,
  onArchetypeChange,
  onAddContext,
  onSearchMore,
  onCreateEstimate,
  onChangeType,
}: {
  item: VisualizationPlan["rejected_visualizations"][number];
  context: string;
  selectedArchetype: string;
  isBusy: boolean;
  disabled: boolean;
  onContextChange: (value: string) => void;
  onArchetypeChange: (value: string) => void;
  onAddContext: () => void;
  onSearchMore: () => void;
  onCreateEstimate: () => void;
  onChangeType: () => void;
}) {
  const hasContext = context.trim().length > 0;
  const canAct = !disabled && !isBusy;

  return (
    <div style={{ marginTop: 8 }}>
      <textarea
        value={context}
        onChange={(e) => onContextChange(e.target.value)}
        placeholder="Add source-backed context or exact data to repair this gap..."
        rows={3}
        style={{
          width: "100%",
          resize: "vertical",
          border: `1px solid ${BRAND.slate200}`,
          borderRadius: 9,
          padding: 8,
          fontSize: 11,
          fontWeight: 600,
          color: BRAND.slate950,
          outline: "none",
          background: BRAND.slate50,
        }}
      />

      <div
        style={{
          marginTop: 8,
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 6,
        }}
      >
        <RepairButton
          label="Add context"
          busy={isBusy}
          disabled={!canAct || !hasContext}
          onClick={onAddContext}
        />
        <RepairButton
          label="Search more"
          busy={isBusy}
          disabled={!canAct}
          onClick={onSearchMore}
          variant="secondary"
        />
        <RepairButton
          label="Create anyway as estimate"
          busy={isBusy}
          disabled={!canAct}
          onClick={onCreateEstimate}
          variant="secondary"
        />
      </div>

      <div
        style={{
          marginTop: 8,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: 6,
        }}
      >
        <select
          value={selectedArchetype}
          onChange={(e) => onArchetypeChange(e.target.value)}
          style={{
            minWidth: 0,
            border: `1px solid ${BRAND.slate200}`,
            borderRadius: 9,
            padding: "6px 8px",
            fontSize: 11,
            fontWeight: 750,
            color: BRAND.slate950,
            background: "white",
          }}
          aria-label={`Change chart type for ${item.question}`}
        >
          <option value="">Change chart type</option>
          {Object.entries(CHART_TYPE_META).map(([type, meta]) => (
            <option key={type} value={type}>
              {meta.emoji} {type}
            </option>
          ))}
        </select>
        <RepairButton
          label="Change type"
          busy={isBusy}
          disabled={!canAct || !selectedArchetype}
          onClick={onChangeType}
          variant="secondary"
        />
      </div>
    </div>
  );
}

function RepairButton({
  label,
  busy,
  disabled,
  onClick,
  variant = "primary",
}: {
  label: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
  variant?: "primary" | "secondary";
}) {
  const activeBg = variant === "primary" ? BRAND.purps : "white";
  const activeFg = variant === "primary" ? "white" : BRAND.purps;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: `1px solid ${disabled ? BRAND.slate200 : BRAND.purpsSoft}`,
        borderRadius: 9,
        padding: "6px 9px",
        background: disabled ? BRAND.slate100 : activeBg,
        color: disabled ? BRAND.slate500 : activeFg,
        fontSize: 11,
        fontWeight: 850,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
      }}
    >
      {busy ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <Plus size={12} />
      )}
      {label}
    </button>
  );
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
    evidenceStatus?: string;
    confidence?: number;
    sourceRefs?: string[];
    createdChart?: CreatedPlanChart;
    qualityScore?: VisualizationPlan["recommended_visualizations"][number]["quality_score"];
    extra?: ReactNode;
    actionLabel?: string;
    actionDisabled?: boolean;
    actionBusy?: boolean;
    onAction?: () => void;
  }[];
}) {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>(
    () => ({}),
  );
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
          <PlanListItem
            key={item.key}
            item={item}
            isOpen={!!openItems[item.key]}
            onToggle={() =>
              setOpenItems((prev) => ({
                ...prev,
                [item.key]: !prev[item.key],
              }))
            }
          />
        ))}
      </ul>
    </div>
  );
}

function PlanListItem({
  item,
  isOpen,
  onToggle,
}: {
  item: {
    key: string;
    title: string;
    meta: string;
    body: string;
    tone: "good" | "warn";
    evidenceStatus?: string;
    confidence?: number;
    sourceRefs?: string[];
    createdChart?: CreatedPlanChart;
    qualityScore?: VisualizationPlan["recommended_visualizations"][number]["quality_score"];
    extra?: ReactNode;
    actionLabel?: string;
    actionDisabled?: boolean;
    actionBusy?: boolean;
    onAction?: () => void;
  };
  isOpen: boolean;
  onToggle: () => void;
}) {
  const toneBg = item.tone === "good" ? BRAND.bgMint : BRAND.holaSoft;
  const toneFg = item.tone === "good" ? BRAND.okayInk : BRAND.hola;
  return (
    <li
      style={{
        borderRadius: 10,
        background: "white",
        border: `1px solid ${isOpen ? toneBg : BRAND.slate100}`,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          border: "none",
          background: "transparent",
          padding: "8px 10px",
          cursor: "pointer",
          textAlign: "left",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 8,
          alignItems: "start",
        }}
      >
        <div style={{ minWidth: 0 }}>
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
          <div
            style={{
              marginTop: 5,
              display: "flex",
              alignItems: "center",
              gap: 5,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                borderRadius: 999,
                padding: "2px 6px",
                fontSize: 9,
                fontWeight: 900,
                color: toneFg,
                background: toneBg,
              }}
            >
              {item.meta}
            </span>
            {item.evidenceStatus && (
              <EvidenceChip
                label={item.evidenceStatus}
                status={item.evidenceStatus}
                count={item.confidence ?? 0}
              />
            )}
            {item.createdChart && (
              <span
                style={{
                  color: verifyTone(item.createdChart.verifyStatus).fg,
                  background: verifyTone(item.createdChart.verifyStatus).bg,
                  borderRadius: 999,
                  padding: "2px 6px",
                  fontSize: 9,
                  fontWeight: 850,
                }}
              >
                {item.createdChart.verifyLabel}
              </span>
            )}
            {item.qualityScore && (
              <QualityScorePill score={item.qualityScore} compact />
            )}
          </div>
        </div>
        <ChevronDown
          size={14}
          color={BRAND.slate500}
          style={{
            marginTop: 2,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 140ms ease",
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            borderTop: `1px solid ${BRAND.slate100}`,
            padding: "8px 10px 10px",
            background: BRAND.slate50,
          }}
        >
          {item.body && (
            <div
              style={{
                fontSize: 11,
                color: BRAND.slate700,
                fontWeight: 600,
                lineHeight: 1.35,
              }}
            >
              {item.body}
            </div>
          )}
          {item.confidence !== undefined && (
            <div
              style={{
                marginTop: 6,
                color: BRAND.slate500,
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              Confidence {item.confidence}
            </div>
          )}
          {item.qualityScore && (
            <QualityScoreBlock score={item.qualityScore} />
          )}
          {item.sourceRefs && item.sourceRefs.length > 0 && (
            <div
              style={{
                marginTop: 5,
                fontSize: 10,
                color: BRAND.slate500,
                fontWeight: 650,
                lineHeight: 1.35,
              }}
              title={item.sourceRefs.join("\n")}
            >
              Sources: {dedupe(item.sourceRefs).slice(0, 3).join(" · ")}
            </div>
          )}
          {item.createdChart && (
            <div
              style={{
                marginTop: 7,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                fontSize: 10,
                fontWeight: 850,
              }}
            >
              <a
                href={`?edit=${item.createdChart.chartId}`}
                style={{
                  color: BRAND.purps,
                  textDecoration: "none",
                }}
              >
                Open draft
              </a>
            </div>
          )}
          {item.extra}
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
        </div>
      )}
    </li>
  );
}

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
  compact = false,
}: {
  score: NonNullable<
    VisualizationPlan["recommended_visualizations"][number]["quality_score"]
  >;
  compact?: boolean;
}) {
  const tone = qualityTone(score.label);
  return (
    <span
      style={{
        borderRadius: 999,
        padding: compact ? "2px 6px" : "3px 7px",
        background: tone.bg,
        color: tone.fg,
        fontSize: compact ? 9 : 10,
        fontWeight: 850,
      }}
    >
      {qualityLabel(score.label)} · {Math.round(score.overall ?? 0)}
    </span>
  );
}

function QualityScoreBlock({
  score,
}: {
  score: NonNullable<
    VisualizationPlan["recommended_visualizations"][number]["quality_score"]
  >;
}) {
  const metrics = [
    ["Useful", score.traveler_usefulness],
    ["Evidence", score.evidence_strength],
    ["Unique", score.uniqueness],
    ["Visual fit", score.visual_fit],
    ["CE-specific", score.ce_specificity],
    ["CMS value", score.cms_value],
    ["Risk", score.verifier_risk],
  ] as const;
  return (
    <div
      style={{
        marginTop: 8,
        border: `1px solid ${BRAND.slate100}`,
        background: "white",
        borderRadius: 9,
        padding: 8,
      }}
    >
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        <QualityScorePill score={score} />
        {metrics.map(([label, value]) => (
          <span
            key={label}
            style={{
              color: BRAND.slate500,
              background: BRAND.slate50,
              borderRadius: 999,
              padding: "3px 7px",
              fontSize: 10,
              fontWeight: 800,
            }}
          >
            {label} {Math.round(value ?? 0)}
          </span>
        ))}
      </div>
      {score.rationale && (
        <div
          style={{
            marginTop: 6,
            color: BRAND.slate700,
            fontSize: 10,
            fontWeight: 650,
            lineHeight: 1.35,
          }}
        >
          {score.rationale}
        </div>
      )}
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

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
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
