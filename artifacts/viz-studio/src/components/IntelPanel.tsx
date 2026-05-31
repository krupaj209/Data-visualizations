import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { EVIDENCE_TYPE_LABELS, EVIDENCE_TYPE_DESCRIPTIONS } from "@/lib/evidence-type-labels";
import { HelpPopover } from "@/components/HelpPopover";
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

type EditorialJudgementKey =
  | "useful"
  | "ce_specific"
  | "better_than_existing"
  | "conversion_driven"
  | "visually_strong";

type EditorialVerdictValue = "yes" | "weak" | "no";

type EditorialVerdict = "ship" | "hold" | "cut";

type EditorialJudgement = {
  verdict: EditorialVerdictValue;
  rationale: string;
};

type EditorialJudgements = Record<EditorialJudgementKey, EditorialJudgement>;

const EDITORIAL_KEYS: readonly EditorialJudgementKey[] = [
  "useful",
  "ce_specific",
  "better_than_existing",
  "conversion_driven",
  "visually_strong",
] as const;

const EDITORIAL_LABELS: Record<EditorialJudgementKey, string> = {
  useful: "Useful",
  ce_specific: "CE-specific",
  better_than_existing: "Better than deck",
  conversion_driven: "Conversion",
  visually_strong: "Visually strong",
};

const EDITORIAL_QUESTIONS: Record<EditorialJudgementKey, string> = {
  useful: "Genuinely useful to a traveler about to book?",
  ce_specific: "Specific to this CE (not a generic subcategory chart)?",
  better_than_existing: "Better than what's already in the deck for this CE?",
  conversion_driven:
    "Conversion- or helpfulness-driven (nudges booking, reduces anxiety, sets expectations)?",
  visually_strong: "Visually strong in the chosen archetype?",
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

function evidenceTypeSummary(facts: CeIntelligenceFact[]): string {
  const counts = new Map<string, number>();
  for (const f of facts) {
    if (!f.evidence_type) continue;
    counts.set(f.evidence_type, (counts.get(f.evidence_type) ?? 0) + 1);
  }
  if (counts.size === 0) return "";
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, n]) => `${EVIDENCE_TYPE_LABELS[type] ?? type} · ${n}`)
    .join(" • ");
}

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
      editorial?: EditorialJudgements;
      editorial_verdict?: EditorialVerdict;
    };
    priority: number;
    promoted_from_rejected?: boolean;
    recheck_findings?: string[];
    recheck_status?: "found" | "partial" | "not_found";
  }[];
  rejected_visualizations: {
    question: string;
    archetype?: string;
    reason: string;
    editorial?: EditorialJudgements;
    editorial_verdict?: EditorialVerdict;
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

type ChartForMatching = {
  id: number;
  question?: string;
  provenance?: unknown;
};

function normalizeQuestionKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function IntelPanel({
  slug,
  onClose,
  onChartCreated,
  charts = [],
  onViewChart,
}: {
  slug: string;
  onClose: () => void;
  onChartCreated?: () => void;
  /** Existing charts on this CE — used to mark plan ideas as "Done". */
  charts?: ChartForMatching[];
  /** Scroll the matching chart card into view and flash its outline. */
  onViewChart?: (chartId: number) => void;
}) {
  const { data, isLoading, error } = useGetCeIntelligence(slug);
  const refreshMut = useRefreshCeIntelligence();
  const deleteSourceMut = useDeleteCeIntelligenceSource();
  const qc = useQueryClient();
  const [refreshingSource, setRefreshingSource] = useState<string | null>(null);
  const [plan, setPlan] = useState<VisualizationPlan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [creatingQuestions, setCreatingQuestions] = useState<Set<string>>(
    () => new Set(),
  );
  const markCreating = useCallback(
    (question: string | null, creating: boolean) => {
      if (!question) return;
      setCreatingQuestions((prev) => {
        const has = prev.has(question);
        if (creating && has) return prev;
        if (!creating && !has) return prev;
        const next = new Set(prev);
        if (creating) next.add(question);
        else next.delete(question);
        return next;
      });
    },
    [],
  );
  const [rejectedContext, setRejectedContext] = useState<Record<string, string>>(
    () => ({}),
  );
  const [rejectedArchetype, setRejectedArchetype] = useState<Record<string, string>>(
    () => ({}),
  );
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>(
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
  const [selectedIdeas, setSelectedIdeas] = useState<Set<string>>(
    () => new Set(),
  );
  const [bulkProgress, setBulkProgress] = useState<{
    total: number;
    done: number;
    failed: number;
    running: boolean;
  } | null>(null);
  const [bulkSummary, setBulkSummary] = useState<{
    created: number;
    failed: number;
  } | null>(null);
  const [bulkErrors, setBulkErrors] = useState<Record<string, string>>(
    () => ({}),
  );
  // Task #131: Context & sources disclosure (collapsed by default, persisted
  // per-CE in localStorage so writers can keep their preference between
  // visits).
  const [contextOpen, setContextOpen] = useSectionOpen(
    `viz-studio:intel-context-open:${slug}`,
    false,
  );
  // Task #131: one-time browser-wide hint pointing writers at the new
  // Context & sources disclosure. Stored in localStorage so it shows once
  // per browser (not per CE).
  const CONTEXT_HINT_KEY = "intelPanel.contextHintDismissed";
  const [contextHintDismissed, setContextHintDismissed] = useState<boolean>(
    () => {
      try {
        return window.localStorage.getItem(CONTEXT_HINT_KEY) === "1";
      } catch {
        return false;
      }
    },
  );
  function dismissContextHint() {
    setContextHintDismissed(true);
    try {
      window.localStorage.setItem(CONTEXT_HINT_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  function toggleSelectedIdea(question: string) {
    setSelectedIdeas((prev) => {
      const next = new Set(prev);
      if (next.has(question)) next.delete(question);
      else next.add(question);
      return next;
    });
  }
  function clearSelectedIdeas() {
    setSelectedIdeas(new Set());
  }

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
    markCreating(item.question, true);
    setPlanError(null);
    try {
      const res = await fetch(`/api/ce-intelligence/${slug}/recheck-gap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: item.question,
          archetype: item.archetype,
          reason: item.reason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Evidence recheck failed");
      const status: "found" | "partial" | "not_found" =
        json?.status === "found"
          ? "found"
          : json?.status === "partial"
            ? "partial"
            : "not_found";
      const context = String(json?.generation_context ?? "").trim();
      const findings = Array.isArray(json?.findings)
        ? json.findings.map((f: unknown) => String(f)).filter(Boolean)
        : [];
      const sourceRefs = Array.isArray(json?.source_refs)
        ? json.source_refs.map((f: unknown) => String(f)).filter(Boolean)
        : [];
      const editorial = (json?.editorial ?? undefined) as
        | EditorialJudgements
        | undefined;
      const verdict = (json?.editorial_verdict ?? undefined) as
        | EditorialVerdict
        | undefined;
      const repairContext = [
        context,
        findings.length
          ? `Recheck findings:\n${findings.map((f: string) => `- ${f}`).join("\n")}`
          : "",
        sourceRefs.length
          ? `Sources:\n${sourceRefs.map((s: string) => `- ${s}`).join("\n")}`
          : "",
        status === "partial"
          ? "Evidence recheck status: partial. Mark any unsupported fields as estimates."
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      // Always seed the textarea with whatever we recovered, so the writer
      // can still drop into Add-context / Create-anyway flows manually.
      if (repairContext) {
        setRejectedContext((prev) => ({
          ...prev,
          [item.question]: repairContext,
        }));
      }

      // The server has already mutated the saved plan — promotion or
      // in-place rejected update — and returned the new plan. Adopt it
      // locally and refresh the persisted intel query so a remount or a
      // different writer sees the same state. The local `plan` state is
      // what the panel actually renders.
      const updatedPlan = json?.plan as VisualizationPlan | null | undefined;
      if (updatedPlan) {
        setPlan(updatedPlan);
        qc.invalidateQueries({
          queryKey: getGetCeIntelligenceQueryKey(slug),
        });
      }

      if (verdict === "ship" || verdict === "hold") {
        // Plan mutation done server-side; nothing else to do — the
        // promoted card now lives in recommended_visualizations with
        // promoted_from_rejected: true.
        return;
      }

      // Cut, or no editorial returned: the rejected entry was updated
      // in place server-side; surface the verdict reason in the banner
      // so the writer notices, but keep the repair textarea seeded.
      // Mark unused vars (status/editorial) to satisfy the linter.
      void status;
      void editorial;
      setPlanError(
        String(
          json?.reason ??
            (verdict === "cut"
              ? "Editorial verdict came back as Cut after recheck."
              : "I rechecked the DRD and live sources, but still could not find enough evidence."),
        ),
      );
    } catch (err) {
      setPlanError(
        err instanceof Error ? err.message : "Could not recheck evidence",
      );
    } finally {
      markCreating(item.question, false);
    }
  }

  async function runCreateForIdea(
    item: VisualizationPlan["recommended_visualizations"][number],
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    markCreating(item.question, true);
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
      return { ok: true } as const;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Chart generation failed";
      return { ok: false, error: message } as const;
    } finally {
      markCreating(item.question, false);
    }
  }

  async function handleCreateFromPlan(
    item: VisualizationPlan["recommended_visualizations"][number],
  ) {
    setPlanError(null);
    setBulkErrors((prev) => {
      if (!(item.question in prev)) return prev;
      const next = { ...prev };
      delete next[item.question];
      return next;
    });
    const result = await runCreateForIdea(item);
    if (!result.ok) {
      setPlanError(result.error);
      setBulkErrors((prev) => ({ ...prev, [item.question]: result.error }));
    }
  }

  async function handleBulkCreate(
    ideas: VisualizationPlan["recommended_visualizations"],
  ) {
    if (ideas.length === 0) return;
    setPlanError(null);
    setBulkSummary(null);
    setBulkErrors({});
    setBulkProgress({
      total: ideas.length,
      done: 0,
      failed: 0,
      running: true,
    });

    // Concurrency cap — keep small so Gemini isn't hammered. 2 in flight
    // roughly halves wall time vs sequential without spiking rate limits.
    const CONCURRENCY = 2;
    // Soft global backoff: when any worker hits a 429 / rate-limit error,
    // every worker waits at least this long before its next start.
    let backoffUntil = 0;
    let created = 0;
    let failed = 0;
    const queue = [...ideas];

    async function worker() {
      while (queue.length > 0) {
        const now = Date.now();
        if (backoffUntil > now) {
          await new Promise((r) => setTimeout(r, backoffUntil - now));
        }
        const item = queue.shift();
        if (!item) return;
        const result = await runCreateForIdea(item);
        if (result.ok) {
          created += 1;
        } else {
          failed += 1;
          setBulkErrors((prev) => ({
            ...prev,
            [item.question]: result.error,
          }));
          if (/rate.?limit|429|quota|too many requests/i.test(result.error)) {
            // Exponential-ish backoff bounded at 30s; subsequent rate
            // limits push the deadline further out.
            const base = Math.max(0, backoffUntil - Date.now());
            const next = Math.min(30_000, Math.max(2_000, base * 2 || 2_000));
            backoffUntil = Date.now() + next;
          }
        }
        setBulkProgress((prev) =>
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
      Array.from({ length: Math.min(CONCURRENCY, ideas.length) }, () =>
        worker(),
      ),
    );

    setBulkProgress(null);
    setBulkSummary({ created, failed });
    clearSelectedIdeas();
  }

  async function handleCreateRejected(
    item: VisualizationPlan["rejected_visualizations"][number],
    mode: "context" | "estimate" | "changed_archetype",
    contextOverride?: string,
  ) {
    const context = (contextOverride ?? rejectedContext[item.question] ?? "").trim();
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
    markCreating(item.question, true);
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
      markCreating(item.question, false);
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
  const factsBySource = new Map<string, CeIntelligenceFact[]>();
  const factsByBucket = new Map<string, CeIntelligenceFact[]>();
  for (const f of facts) {
    const sourceArr = factsBySource.get(f.source) ?? [];
    sourceArr.push(f);
    factsBySource.set(f.source, sourceArr);
    const arr = factsByBucket.get(f.bucket) ?? [];
    arr.push(f);
    factsByBucket.set(f.bucket, arr);
  }
  const questionsByText = new Map(
    (plan?.traveler_questions ?? []).map((q) => [q.question, q]),
  );

  const isBusyGenerating =
    creatingQuestions.size > 0 || !!bulkProgress?.running;

  // Match plan ideas to existing charts on this CE so writers see which
  // ideas are already "Done". Match against provenance.source_question
  // (set on both assembler-generated and intel-panel-created charts) and
  // fall back to the chart's `question` field for legacy rows.
  const chartByQuestionKey = new Map<string, number>();
  for (const c of charts) {
    const prov = c.provenance as { source_question?: string } | null | undefined;
    const candidates = [prov?.source_question, c.question]
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    for (const candidate of candidates) {
      const key = normalizeQuestionKey(candidate);
      if (key && !chartByQuestionKey.has(key)) {
        chartByQuestionKey.set(key, c.id);
      }
    }
  }

  function existingChartIdFor(question: string): number | null {
    const key = normalizeQuestionKey(question);
    if (chartByQuestionKey.has(key)) return chartByQuestionKey.get(key)!;
    const inSession = createdCharts[question];
    return inSession ? inSession.chartId : null;
  }

  // Eligible for bulk-create = ideas that are still in "To create"
  // (i.e. no chart on the CE yet and not created in this session).
  const eligibleRecommended = useMemo(() => {
    const list = plan?.recommended_visualizations ?? [];
    return list.filter((item) => {
      const key = normalizeQuestionKey(item.question);
      if (chartByQuestionKey.has(key)) return false;
      if (createdCharts[item.question]) return false;
      return true;
    });
    // chartByQuestionKey is derived from `charts` each render, so depending
    // on `charts` is sufficient.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, createdCharts, charts]);
  const selectedEligibleIdeas = useMemo(
    () =>
      eligibleRecommended.filter((i) => selectedIdeas.has(i.question)),
    [eligibleRecommended, selectedIdeas],
  );
  const selectedEligibleCount = selectedEligibleIdeas.length;

  // Ideas that failed during the most recent bulk run, in their original
  // plan order. Used to power the "Retry failed" affordance on the bulk bar.
  const failedBulkIdeas = useMemo(() => {
    const errored = new Set(Object.keys(bulkErrors));
    if (errored.size === 0) return [];
    const list = plan?.recommended_visualizations ?? [];
    return list.filter((item) => errored.has(item.question));
  }, [bulkErrors, plan]);

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

      {/* Task #131: Primary action row — Refresh all sources sits next to
          the Context & sources disclosure toggle so the decision surface
          ("To create") becomes the dominant visual element on first scroll. */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
        <button
          type="button"
          onClick={handleRefreshAll}
          disabled={refreshingSource !== null}
          style={{
            flex: 1,
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
          onClick={() => setContextOpen(!contextOpen)}
          aria-expanded={contextOpen}
          title="Show DRD, evidence, and sources"
          style={{
            background: contextOpen ? BRAND.purpsSoft : "white",
            color: BRAND.slate950,
            border: `1px solid ${contextOpen ? BRAND.purps : BRAND.slate200}`,
            padding: "8px 10px",
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 11,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
          }}
        >
          <span>Context & sources</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: BRAND.slate500,
            }}
          >
            {(intel?.sources ?? []).filter(
              (s) => s.status === "ok" || s.fact_count > 0,
            ).length}
            {" sources · "}
            {drdStatus ? "DRD attached" : "no DRD"}
          </span>
          <ChevronDown
            size={12}
            color={BRAND.slate500}
            style={{
              transform: contextOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 140ms ease",
            }}
          />
        </button>
      </div>

      {contextOpen && (
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
      )}

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
        {(selectedEligibleCount > 0 || bulkProgress || bulkSummary) && (
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 5,
              background: "white",
              border: `1px solid ${BRAND.purps}`,
              borderRadius: 12,
              padding: "8px 10px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              boxShadow: "0 2px 10px rgba(128, 0, 255, 0.08)",
            }}
          >
            {bulkProgress?.running ? (
              <>
                <Loader2 size={14} className="animate-spin" color={BRAND.purps} />
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 850,
                    color: BRAND.slate950,
                  }}
                >
                  Generating {Math.min(bulkProgress.done + 1, bulkProgress.total)}{" "}
                  of {bulkProgress.total}
                  {bulkProgress.failed > 0 && (
                    <span style={{ color: BRAND.candy, marginLeft: 6 }}>
                      · {bulkProgress.failed} failed
                    </span>
                  )}
                </div>
              </>
            ) : bulkSummary ? (
              <>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 850,
                    color: BRAND.slate950,
                  }}
                >
                  Done · {bulkSummary.created} created
                  {bulkSummary.failed > 0 && (
                    <span style={{ color: BRAND.candy, marginLeft: 6 }}>
                      · {bulkSummary.failed} failed
                    </span>
                  )}
                </div>
                {failedBulkIdeas.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleBulkCreate(failedBulkIdeas)}
                    disabled={isBusyGenerating}
                    style={{
                      marginLeft: "auto",
                      border: "none",
                      borderRadius: 9,
                      padding: "6px 11px",
                      background: isBusyGenerating
                        ? BRAND.slate100
                        : BRAND.purps,
                      color: isBusyGenerating ? BRAND.slate500 : "white",
                      fontSize: 11,
                      fontWeight: 900,
                      cursor: isBusyGenerating ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Loader2
                      size={12}
                      style={{ display: isBusyGenerating ? "block" : "none" }}
                      className="animate-spin"
                    />
                    Retry failed ({failedBulkIdeas.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setBulkSummary(null)}
                  style={{
                    marginLeft: failedBulkIdeas.length > 0 ? 0 : "auto",
                    border: `1px solid ${BRAND.slate200}`,
                    background: "white",
                    color: BRAND.slate700,
                    borderRadius: 9,
                    padding: "4px 9px",
                    fontSize: 11,
                    fontWeight: 850,
                    cursor: "pointer",
                  }}
                >
                  Dismiss
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 850,
                    color: BRAND.slate950,
                  }}
                >
                  {selectedEligibleCount} idea
                  {selectedEligibleCount === 1 ? "" : "s"} selected
                </div>
                <button
                  type="button"
                  onClick={clearSelectedIdeas}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: BRAND.slate500,
                    fontSize: 11,
                    fontWeight: 850,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Clear selection
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkCreate(selectedEligibleIdeas)}
                  disabled={
                    selectedEligibleCount === 0 || isBusyGenerating
                  }
                  style={{
                    marginLeft: "auto",
                    border: "none",
                    borderRadius: 9,
                    padding: "6px 11px",
                    background:
                      selectedEligibleCount === 0 || isBusyGenerating
                        ? BRAND.slate100
                        : BRAND.purps,
                    color:
                      selectedEligibleCount === 0 || isBusyGenerating
                        ? BRAND.slate500
                        : "white",
                    fontSize: 11,
                    fontWeight: 900,
                    cursor:
                      selectedEligibleCount === 0 || isBusyGenerating
                        ? "not-allowed"
                        : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Plus size={12} />
                  Generate {selectedEligibleCount} chart
                  {selectedEligibleCount === 1 ? "" : "s"}
                </button>
              </>
            )}
          </div>
        )}
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

        {/* Task #131: plan summary + evidence chips + coverage matrix live
            inside the Context & sources disclosure so the To-create cards
            below dominate the panel by default. */}
        {contextOpen && plan && (
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
            </div>
          </section>
        )}

        {/* Sources strip */}
        {contextOpen && (
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
              const sourceFacts = factsBySource.get(id) ?? [];
              const expanded = !!expandedSources[id];
              return (
                <div key={id}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto auto auto",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: expanded ? "white" : BRAND.slate50,
                      border: `1px solid ${expanded ? BRAND.slate200 : "transparent"}`,
                    }}
                  >
                    <SourceStatusDot status={s.status} />
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSources((prev) => ({
                          ...prev,
                          [id]: !prev[id],
                        }))
                      }
                      style={{
                        minWidth: 0,
                        border: "none",
                        background: "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
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
                      {(() => {
                        const summary = evidenceTypeSummary(sourceFacts);
                        if (!summary) return null;
                        return (
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: BRAND.okayInk,
                              marginTop: 2,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={summary}
                          >
                            {summary}
                          </div>
                        );
                      })()}
                    </button>
                    <ChevronDown
                      size={14}
                      color={BRAND.slate500}
                      style={{
                        transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 140ms ease",
                      }}
                    />
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
                  {expanded && <SourceFactsList facts={sourceFacts} />}
                </div>
              );
            })}
          </div>
        </section>
        )}

        {contextOpen && facts.length > 0 && <MergedFactsSection facts={facts} />}

        {/* Loading / error */}
        {contextOpen && isLoading && (
          <div style={{ color: BRAND.slate500, fontSize: 12 }}>
            <Loader2 size={14} className="animate-spin inline-block mr-1" />
            Loading profile…
          </div>
        )}
        {contextOpen && error && !intel && (
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
        {contextOpen &&
          Object.keys(BUCKET_LABELS).map((bucket) => {
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
                    <FactListItem key={f.id} fact={f} />
                  ))}
                </ul>
              </section>
            );
          })}

        {contextOpen && intel && facts.length === 0 && !isLoading && (
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

        {/* Task #131: first-run hint pointing writers at the relocated
            context. Shows once per browser. Sits directly above the
            To-create cards so the decision surface is unambiguous. */}
        {!contextHintDismissed && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 10,
              background: BRAND.bgLilac,
              border: `1px solid ${BRAND.purpsSoft}`,
              color: BRAND.purps,
              fontSize: 11,
              fontWeight: 750,
              lineHeight: 1.35,
            }}
          >
            <Sparkles size={12} />
            <span style={{ flex: 1 }}>
              Context, evidence, and sources moved into the disclosure above —
              open it any time.
            </span>
            <button
              type="button"
              onClick={dismissContextHint}
              aria-label="Dismiss hint"
              style={{
                border: "none",
                background: "transparent",
                color: BRAND.purps,
                cursor: "pointer",
                padding: 2,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Task #131: To-create cards live outside the Context & sources
            disclosure and sit at the bottom of the panel so they remain
            the dominant scroll content when context is collapsed. */}
        {plan && (
          <>
            {(() => {
              const toCreate: typeof plan.recommended_visualizations = [];
              const done: {
                item: (typeof plan.recommended_visualizations)[number];
                chartId: number;
              }[] = [];
              for (const item of plan.recommended_visualizations) {
                const chartId = existingChartIdFor(item.question);
                if (chartId != null) {
                  done.push({ item, chartId });
                } else {
                  toCreate.push(item);
                }
              }
              // Bulk-select (Task #114) is scoped to the "To create" list
              // since "Done" items already have a chart and nothing to
              // generate.
              const selectedInToCreate = toCreate.filter((i) =>
                selectedIdeas.has(i.question),
              ).length;
              return (
                <>
                  <PlanList
                    title={`To create (${toCreate.length})`}
                    selectAll={
                      toCreate.length > 0
                        ? {
                            state:
                              selectedInToCreate === 0
                                ? "none"
                                : selectedInToCreate === toCreate.length
                                  ? "all"
                                  : "some",
                            eligibleCount: toCreate.length,
                            disabled: isBusyGenerating,
                            onToggle: () => {
                              if (selectedInToCreate === toCreate.length) {
                                clearSelectedIdeas();
                              } else {
                                setSelectedIdeas(
                                  new Set(toCreate.map((i) => i.question)),
                                );
                              }
                            },
                          }
                        : undefined
                    }
                    items={toCreate.map((item) => {
                      const question = questionsByText.get(item.question);
                      const checkboxDisabled = isBusyGenerating;
                      return {
                        key: `${item.priority}-${item.question}`,
                        title: item.question,
                        meta: item.archetype,
                        body: item.why_it_matters,
                        tone: "good" as const,
                        confidence: question?.confidence,
                        sourceRefs: [
                          ...(question?.source_refs ?? []),
                          ...(item.evidence_refs ?? []),
                        ],
                        qualityScore: item.quality_score,
                        editorial: item.quality_score?.editorial,
                        editorialVerdict:
                          item.quality_score?.editorial_verdict,
                        promotedBadge: item.promoted_from_rejected
                          ? "Found by recheck"
                          : undefined,
                        actionLabel: "Create chart",
                        actionDisabled: isBusyGenerating,
                        actionBusy: creatingQuestions.has(item.question),
                        onAction: () => handleCreateFromPlan(item),
                        cardError: bulkErrors[item.question],
                        selectable: true,
                        selectDisabled: checkboxDisabled,
                        selected: selectedIdeas.has(item.question),
                        onSelectToggle: !checkboxDisabled
                          ? () => toggleSelectedIdea(item.question)
                          : undefined,
                      };
                    })}
                  />
                  <DoneSection
                    slug={slug}
                    items={done}
                    onViewChart={onViewChart}
                  />
                  <RejectedSection
                    slug={slug}
                    items={plan.rejected_visualizations.slice(0, 8)}
                    totalCount={plan.rejected_visualizations.length}
                    createdCharts={createdCharts}
                    existingChartIdFor={existingChartIdFor}
                    onViewChart={onViewChart}
                    rejectedContext={rejectedContext}
                    rejectedArchetype={rejectedArchetype}
                    creatingQuestions={creatingQuestions}
                    setRejectedContext={setRejectedContext}
                    setRejectedArchetype={setRejectedArchetype}
                    onAddContext={(item) =>
                      handleCreateRejected(item, "context")
                    }
                    onSearchMore={(item) =>
                      handleSearchMoreForRejected(item)
                    }
                    onCreateEstimate={(item) =>
                      handleCreateRejected(item, "estimate")
                    }
                    onChangeType={(item) =>
                      handleCreateRejected(item, "changed_archetype")
                    }
                  />
                </>
              );
            })()}
          </>
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

function SourceFactsList({ facts }: { facts: CeIntelligenceFact[] }) {
  if (facts.length === 0) {
    return (
      <div
        style={{
          marginTop: 4,
          padding: "8px 10px",
          borderRadius: 10,
          border: `1px dashed ${BRAND.slate200}`,
          color: BRAND.slate500,
          fontSize: 11,
          fontWeight: 650,
          background: "white",
        }}
      >
        No facts captured from this source yet.
      </div>
    );
  }
  return (
    <ul
      style={{
        listStyle: "none",
        margin: "4px 0 0 0",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      {facts.map((f) => (
        <FactListItem key={f.id} fact={f} compact />
      ))}
    </ul>
  );
}

function MergedFactsSection({ facts }: { facts: CeIntelligenceFact[] }) {
  const groups = groupMergedFacts(facts);
  if (groups.length === 0) return null;
  return (
    <section>
      <h4 style={sectionLabel()}>Merged facts</h4>
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
        {groups.slice(0, 12).map((group) => (
          <li
            key={group.key}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              background: "white",
              border: `1px solid ${group.sources.length > 1 ? BRAND.bgMint : BRAND.slate100}`,
            }}
          >
            <div style={{ fontSize: 12, color: BRAND.slate950, fontWeight: 650, lineHeight: 1.4 }}>
              {group.claim}
            </div>
            <div
              style={{
                marginTop: 5,
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
                fontSize: 10,
                fontWeight: 800,
                color: BRAND.slate500,
              }}
            >
              <span
                style={{
                  background: group.sources.length > 1 ? BRAND.bgMint : BRAND.slate100,
                  color: group.sources.length > 1 ? BRAND.okayInk : BRAND.slate700,
                  padding: "1px 6px",
                  borderRadius: 999,
                }}
              >
                {group.sources.length} source{group.sources.length === 1 ? "" : "s"}
              </span>
              <span>{group.sources.map((s) => SOURCE_LABELS[s] ?? s).join(" · ")}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FactListItem({
  fact,
  compact = false,
}: {
  fact: CeIntelligenceFact;
  compact?: boolean;
}) {
  return (
    <li
      style={{
        padding: compact ? "7px 9px" : "8px 10px",
        borderRadius: 10,
        background: compact ? BRAND.slate50 : "white",
        border: `1px solid ${BRAND.slate100}`,
      }}
    >
      <div style={{ fontSize: 12, color: BRAND.slate950, fontWeight: 600, lineHeight: 1.4 }}>
        {fact.value}
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
          {SOURCE_LABELS[fact.source] ?? fact.source}
        </span>
        {fact.evidence_type && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
            <span
              style={{
                background: BRAND.bgMint,
                color: BRAND.okayInk,
                padding: "1px 6px",
                borderRadius: 999,
              }}
            >
              {EVIDENCE_TYPE_LABELS[fact.evidence_type] ?? fact.evidence_type}
            </span>
            <HelpPopover
              content={EVIDENCE_TYPE_DESCRIPTIONS[fact.evidence_type] ?? `Evidence type: ${EVIDENCE_TYPE_LABELS[fact.evidence_type] ?? fact.evidence_type}`}
            />
          </span>
        )}
        <span>conf {fact.confidence}</span>
        {fact.source_url && (
          <a
            href={fact.source_url}
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
  );
}

function groupMergedFacts(facts: CeIntelligenceFact[]): {
  key: string;
  claim: string;
  sources: string[];
}[] {
  const groups = new Map<string, CeIntelligenceFact[]>();
  for (const fact of facts) {
    const key = normalizeFactKey(fact.value);
    const arr = groups.get(key) ?? [];
    arr.push(fact);
    groups.set(key, arr);
  }
  return Array.from(groups.entries())
    .map(([key, items]) => ({
      key,
      claim: items.sort((a, b) => b.confidence - a.confidence)[0]?.value ?? key,
      sources: Array.from(new Set(items.map((item) => item.source))),
    }))
    .sort((a, b) => b.sources.length - a.sources.length || a.claim.localeCompare(b.claim));
}

function normalizeFactKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\b(the|a|an|and|or|from|to|for|with|typically|usually)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 14)
    .join(" ");
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
          label="Recheck evidence"
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

type PlanListItemData = {
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
  editorial?: EditorialJudgements;
  editorialVerdict?: EditorialVerdict;
  promotedBadge?: string;
  extra?: ReactNode;
  actionLabel?: string;
  actionDisabled?: boolean;
  actionBusy?: boolean;
  onAction?: () => void;
  cardError?: string;
  selectable?: boolean;
  selectDisabled?: boolean;
  selected?: boolean;
  onSelectToggle?: () => void;
};

function PlanList({
  title,
  items,
  selectAll,
}: {
  title: string;
  items: PlanListItemData[];
  selectAll?: {
    state: "none" | "some" | "all";
    eligibleCount: number;
    onToggle: () => void;
    disabled?: boolean;
  };
}) {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>(
    () => ({}),
  );
  if (items.length === 0) return null;
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 900,
            color: BRAND.slate500,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {title}
        </div>
        {selectAll && selectAll.eligibleCount > 0 && (
          <button
            type="button"
            onClick={selectAll.onToggle}
            disabled={selectAll.disabled}
            style={{
              border: `1px solid ${BRAND.slate200}`,
              background: "white",
              color: BRAND.slate700,
              borderRadius: 999,
              padding: "3px 9px",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              cursor: selectAll.disabled ? "not-allowed" : "pointer",
              opacity: selectAll.disabled ? 0.5 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
            aria-label={
              selectAll.state === "all"
                ? "Clear all selections"
                : "Select all eligible ideas"
            }
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                border: `1.5px solid ${
                  selectAll.state === "none" ? BRAND.slate300 : BRAND.purps
                }`,
                background:
                  selectAll.state === "all"
                    ? BRAND.purps
                    : selectAll.state === "some"
                      ? BRAND.purpsSoft
                      : "white",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 9,
                lineHeight: 1,
              }}
            >
              {selectAll.state === "all"
                ? "✓"
                : selectAll.state === "some"
                  ? "–"
                  : ""}
            </span>
            {selectAll.state === "all" ? "Clear" : "Select all"}
          </button>
        )}
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
  item: PlanListItemData;
  isOpen: boolean;
  onToggle: () => void;
}) {
  // Task #131: card collapses to a single-row decision surface
  // (archetype chip · title · primary pill · action + checkbox) and reveals
  // body/editorial/score/sources via a `Details ▾` toggle. The card error
  // banner stays visible even when collapsed.
  const [showWhyScore, setShowWhyScore] = useState(false);
  const toneBg = item.tone === "good" ? BRAND.bgMint : BRAND.holaSoft;
  const toneFg = item.tone === "good" ? BRAND.okayInk : BRAND.hola;
  const primaryAction =
    item.onAction && !item.createdChart ? (
      <button
        type="button"
        onClick={item.onAction}
        disabled={item.actionDisabled}
        style={{
          border: "none",
          borderRadius: 8,
          padding: "5px 9px",
          background: item.actionDisabled ? BRAND.slate100 : BRAND.purps,
          color: item.actionDisabled ? BRAND.slate500 : "white",
          fontSize: 11,
          fontWeight: 850,
          cursor: item.actionDisabled ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          whiteSpace: "nowrap",
        }}
      >
        {item.actionBusy ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Plus size={12} />
        )}
        {item.actionLabel ?? "Create chart"}
      </button>
    ) : item.createdChart ? (
      <a
        href={`?edit=${item.createdChart.chartId}`}
        style={{
          border: `1px solid ${BRAND.slate200}`,
          borderRadius: 8,
          padding: "5px 9px",
          background: "white",
          color: BRAND.slate950,
          fontSize: 11,
          fontWeight: 850,
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        <ExternalLink size={12} />
        View chart
      </a>
    ) : null;

  return (
    <li
      style={{
        borderRadius: 10,
        background: "white",
        border: `1px solid ${
          item.selected
            ? BRAND.purps
            : isOpen
              ? toneBg
              : BRAND.slate100
        }`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${item.selectable ? "auto " : ""}auto minmax(0, 1fr) auto auto auto`,
          alignItems: "center",
          gap: 7,
          padding: "7px 9px",
        }}
      >
        {item.selectable && (
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              cursor: item.selectDisabled ? "not-allowed" : "pointer",
              opacity: item.selectDisabled ? 0.4 : 1,
            }}
            title={
              item.selectDisabled
                ? "Wait for the current generation to finish"
                : "Select to generate in bulk"
            }
          >
            <input
              type="checkbox"
              checked={!!item.selected}
              onChange={item.onSelectToggle ?? (() => {})}
              disabled={item.selectDisabled || !item.onSelectToggle}
              aria-label={`Select "${item.title}" for bulk generation`}
              style={{
                width: 14,
                height: 14,
                accentColor: BRAND.purps,
                cursor: item.selectDisabled ? "not-allowed" : "pointer",
                margin: 0,
              }}
            />
          </label>
        )}
        <span
          style={{
            borderRadius: 999,
            padding: "2px 6px",
            fontSize: 9,
            fontWeight: 900,
            color: toneFg,
            background: toneBg,
            whiteSpace: "nowrap",
          }}
          title={item.meta}
        >
          {item.meta}
        </span>
        <button
          type="button"
          onClick={onToggle}
          title={item.title}
          style={{
            minWidth: 0,
            border: "none",
            background: "transparent",
            padding: 0,
            textAlign: "left",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 750,
            color: BRAND.slate950,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}
        >
          {item.title}
        </button>
        {item.qualityScore ? (
          <QualityScorePill score={item.qualityScore} compact />
        ) : item.editorialVerdict ? (
          <EditorialVerdictPill
            verdict={item.editorialVerdict}
            compact
          />
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Hide details" : "Show details"}
          style={{
            border: "none",
            background: "transparent",
            padding: "3px 5px",
            cursor: "pointer",
            color: BRAND.slate500,
            fontSize: 10,
            fontWeight: 850,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            whiteSpace: "nowrap",
          }}
        >
          Details
          <ChevronDown
            size={11}
            style={{
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 140ms ease",
            }}
          />
        </button>
        {primaryAction}
      </div>

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
          {item.createdChart && (
            <div
              style={{
                marginTop: 7,
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
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
              {item.actionDisabled && (
                <span
                  style={{
                    borderRadius: 999,
                    padding: "3px 8px",
                    background: BRAND.bgMint,
                    color: BRAND.okayInk,
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {item.actionLabel ?? "Created"}
                </span>
              )}
            </div>
          )}
          {item.promotedBadge && (
            <div style={{ marginTop: 6 }}>
              <span
                style={{
                  borderRadius: 999,
                  padding: "2px 7px",
                  background: BRAND.purpsSoft,
                  color: BRAND.purps,
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {item.promotedBadge}
              </span>
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
          {item.editorial && (
            <EditorialVerdictStrip judgements={item.editorial} />
          )}
          {item.qualityScore && (
            <div style={{ marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setShowWhyScore((v) => !v)}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  color: BRAND.slate500,
                  fontSize: 10,
                  fontWeight: 850,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
                aria-expanded={showWhyScore}
              >
                {showWhyScore ? "Hide score breakdown" : "Why this score"}
                <ChevronDown
                  size={11}
                  color={BRAND.slate500}
                  style={{
                    transform: showWhyScore
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    transition: "transform 140ms ease",
                  }}
                />
              </button>
              {showWhyScore && (
                <QualityScoreBlock score={item.qualityScore} />
              )}
            </div>
          )}
          {item.sourceRefs && item.sourceRefs.length > 0 && (
            <SourcesDisclosure sourceRefs={item.sourceRefs} />
          )}
          {item.extra}
        </div>
      )}
      {item.cardError && (
        <div
          style={{
            margin: "0 10px 8px",
            color: BRAND.candy,
            background: "#fff7f7",
            border: `1px solid ${BRAND.candySoft ?? BRAND.slate200}`,
            borderRadius: 9,
            padding: "6px 8px",
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1.35,
          }}
        >
          {item.cardError}
        </div>
      )}
    </li>
  );
}

function SourcesDisclosure({ sourceRefs }: { sourceRefs: string[] }) {
  const [open, setOpen] = useState(false);
  const deduped = dedupe(sourceRefs);
  if (deduped.length === 0) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          border: "none",
          background: "transparent",
          padding: 0,
          color: BRAND.slate500,
          fontSize: 10,
          fontWeight: 850,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
        aria-expanded={open}
      >
        {deduped.length} source{deduped.length === 1 ? "" : "s"}
        <ChevronDown
          size={11}
          color={BRAND.slate500}
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 140ms ease",
          }}
        />
      </button>
      {open && (
        <div
          style={{
            marginTop: 5,
            fontSize: 10,
            color: BRAND.slate700,
            fontWeight: 650,
            lineHeight: 1.4,
            wordBreak: "break-word",
          }}
        >
          {deduped.map((ref, i) => (
            <div key={`${ref}-${i}`} style={{ marginBottom: 2 }}>
              · {ref}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function useSectionOpen(
  storageKey: string,
  defaultOpen: boolean,
): [boolean, (next: boolean) => void] {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const v = window.localStorage.getItem(storageKey);
      if (v === "1") return true;
      if (v === "0") return false;
    } catch {
      /* ignore */
    }
    return defaultOpen;
  });
  function update(next: boolean) {
    setOpen(next);
    try {
      window.localStorage.setItem(storageKey, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }
  return [open, update];
}

function SectionHeader({
  label,
  count,
  open,
  onToggle,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      style={{
        width: "100%",
        border: "none",
        background: "transparent",
        padding: 0,
        marginBottom: 6,
        display: "flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        textAlign: "left",
        color: BRAND.slate500,
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {label} ({count})
      <ChevronDown
        size={12}
        style={{
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 140ms ease",
        }}
      />
    </button>
  );
}

function CompactRow({
  archetype,
  question,
  action,
  onExpand,
  expanded,
  children,
}: {
  archetype: string;
  question: string;
  action: ReactNode;
  onExpand: () => void;
  expanded: boolean;
  children?: ReactNode;
}) {
  return (
    <li
      style={{
        borderRadius: 10,
        background: "white",
        border: `1px solid ${BRAND.slate100}`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto minmax(0, 1fr) auto",
          gap: 8,
          alignItems: "center",
          padding: "7px 9px",
        }}
      >
        <span
          style={{
            borderRadius: 999,
            padding: "2px 6px",
            fontSize: 9,
            fontWeight: 900,
            color: BRAND.slate700,
            background: BRAND.slate100,
            whiteSpace: "nowrap",
          }}
        >
          {archetype}
        </span>
        <button
          type="button"
          onClick={onExpand}
          title={question}
          style={{
            minWidth: 0,
            border: "none",
            background: "transparent",
            padding: 0,
            textAlign: "left",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            color: BRAND.slate950,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}
        >
          {question}
        </button>
        {action}
      </div>
      {expanded && children && (
        <div
          style={{
            borderTop: `1px solid ${BRAND.slate100}`,
            padding: "8px 10px 10px",
            background: BRAND.slate50,
          }}
        >
          {children}
        </div>
      )}
    </li>
  );
}

function DoneSection({
  slug,
  items,
  onViewChart,
}: {
  slug: string;
  items: {
    item: VisualizationPlan["recommended_visualizations"][number];
    chartId: number;
  }[];
  onViewChart?: (chartId: number) => void;
}) {
  const [open, setOpen] = useSectionOpen(
    `viz-studio:intel-section:${slug}:done`,
    false,
  );
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>(
    () => ({}),
  );
  if (items.length === 0) return null;
  return (
    <div>
      <SectionHeader
        label="Done"
        count={items.length}
        open={open}
        onToggle={() => setOpen(!open)}
      />
      {open && (
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
          {items.map(({ item, chartId }) => {
            const rowKey = `${item.priority}-${item.question}`;
            const isExpanded = !!expandedRows[rowKey];
            return (
              <CompactRow
                key={rowKey}
                archetype={item.archetype}
                question={item.question}
                expanded={isExpanded}
                onExpand={() =>
                  setExpandedRows((prev) => ({
                    ...prev,
                    [rowKey]: !prev[rowKey],
                  }))
                }
                action={
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewChart?.(chartId);
                    }}
                    title="Scroll to this chart"
                    style={{
                      border: `1px solid ${BRAND.slate200}`,
                      borderRadius: 8,
                      padding: "4px 8px",
                      background: "white",
                      color: BRAND.slate950,
                      fontSize: 10,
                      fontWeight: 850,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <ExternalLink size={11} />
                    View chart
                  </button>
                }
              >
                {item.why_it_matters && (
                  <div
                    style={{
                      fontSize: 11,
                      color: BRAND.slate700,
                      fontWeight: 600,
                      lineHeight: 1.35,
                    }}
                  >
                    {item.why_it_matters}
                  </div>
                )}
                {item.quality_score?.editorial_verdict && (
                  <div style={{ marginTop: 6 }}>
                    <EditorialVerdictPill
                      verdict={item.quality_score.editorial_verdict}
                      compact
                    />
                  </div>
                )}
                <div style={{ marginTop: 7 }}>
                  <a
                    href={`?edit=${chartId}`}
                    style={{
                      border: `1px solid ${BRAND.slate200}`,
                      borderRadius: 9,
                      padding: "5px 8px",
                      background: "white",
                      color: BRAND.slate950,
                      fontSize: 11,
                      fontWeight: 850,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      textDecoration: "none",
                    }}
                  >
                    <ExternalLink size={12} />
                    Open in editor
                  </a>
                </div>
              </CompactRow>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RejectedSection({
  slug,
  items,
  totalCount,
  createdCharts,
  existingChartIdFor,
  onViewChart,
  rejectedContext,
  rejectedArchetype,
  creatingQuestions,
  setRejectedContext,
  setRejectedArchetype,
  onAddContext,
  onSearchMore,
  onCreateEstimate,
  onChangeType,
}: {
  slug: string;
  items: VisualizationPlan["rejected_visualizations"];
  /** Full count (pre-slice) so the header reflects the true total even
   *  when only the top N are rendered. */
  totalCount: number;
  createdCharts: Record<string, CreatedPlanChart>;
  existingChartIdFor: (question: string) => number | null;
  onViewChart?: (chartId: number) => void;
  rejectedContext: Record<string, string>;
  rejectedArchetype: Record<string, string>;
  creatingQuestions: Set<string>;
  setRejectedContext: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  setRejectedArchetype: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  onAddContext: (
    item: VisualizationPlan["rejected_visualizations"][number],
  ) => void;
  onSearchMore: (
    item: VisualizationPlan["rejected_visualizations"][number],
  ) => void;
  onCreateEstimate: (
    item: VisualizationPlan["rejected_visualizations"][number],
  ) => void;
  onChangeType: (
    item: VisualizationPlan["rejected_visualizations"][number],
  ) => void;
}) {
  const [open, setOpen] = useSectionOpen(
    `viz-studio:intel-section:${slug}:rejected`,
    true,
  );
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>(
    () => ({}),
  );
  if (totalCount === 0) return null;
  return (
    <div>
      <SectionHeader
        label="Rejected"
        count={totalCount}
        open={open}
        onToggle={() => setOpen(!open)}
      />
      {open && (
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
          {items.map((item) => {
            const isExpanded = !!expandedRows[item.question];
            const existingChartId = existingChartIdFor(item.question);
            const isBusy = creatingQuestions.has(item.question);
            const anyCreating = creatingQuestions.size > 0;
            return (
              <CompactRow
                key={item.question}
                archetype={item.archetype ?? "no chart"}
                question={item.question}
                expanded={isExpanded}
                onExpand={() =>
                  setExpandedRows((prev) => ({
                    ...prev,
                    [item.question]: !prev[item.question],
                  }))
                }
                action={
                  existingChartId != null ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewChart?.(existingChartId);
                      }}
                      title="Scroll to this chart"
                      style={{
                        border: `1px solid ${BRAND.slate200}`,
                        borderRadius: 8,
                        padding: "4px 8px",
                        background: "white",
                        color: BRAND.slate950,
                        fontSize: 10,
                        fontWeight: 850,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <ExternalLink size={11} />
                      View chart
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSearchMore(item);
                      }}
                      disabled={anyCreating}
                      title="Recheck evidence for this rejected idea"
                      style={{
                        border: `1px solid ${BRAND.slate200}`,
                        borderRadius: 8,
                        padding: "4px 8px",
                        background: "white",
                        color: BRAND.purps,
                        fontSize: 10,
                        fontWeight: 850,
                        cursor: anyCreating ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isBusy ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <RefreshCw size={11} />
                      )}
                      Search more
                    </button>
                  )
                }
              >
                <div
                  style={{
                    fontSize: 11,
                    color: BRAND.slate700,
                    fontWeight: 600,
                    lineHeight: 1.35,
                  }}
                >
                  {item.reason}
                </div>
                {item.editorial && (
                  <EditorialVerdictStrip judgements={item.editorial} />
                )}
                {existingChartId == null && !createdCharts[item.question] && (
                  <RejectedRepairTools
                    item={item}
                    context={rejectedContext[item.question] ?? ""}
                    selectedArchetype={
                      rejectedArchetype[item.question] ||
                      item.archetype ||
                      ""
                    }
                    isBusy={isBusy}
                    disabled={anyCreating}
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
                    onAddContext={() => onAddContext(item)}
                    onSearchMore={() => onSearchMore(item)}
                    onCreateEstimate={() => onCreateEstimate(item)}
                    onChangeType={() => onChangeType(item)}
                  />
                )}
              </CompactRow>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function verdictTone(
  v: EditorialVerdict | undefined,
): { bg: string; fg: string; label: string } {
  if (v === "ship") return { bg: BRAND.bgMint, fg: BRAND.okayInk, label: "Ship" };
  if (v === "cut") return { bg: BRAND.candySoft, fg: BRAND.candy, label: "Cut" };
  return { bg: BRAND.holaSoft, fg: BRAND.hola, label: "Hold" };
}

function judgementTone(
  v: EditorialVerdictValue,
): { bg: string; fg: string; symbol: string } {
  if (v === "yes") return { bg: BRAND.bgMint, fg: BRAND.okayInk, symbol: "✓" };
  if (v === "no") return { bg: BRAND.candySoft, fg: BRAND.candy, symbol: "✗" };
  return { bg: BRAND.slate100, fg: BRAND.slate700, symbol: "~" };
}

const VERDICT_HELP: Record<string, string> = {
  ship: "Ship — this idea scored ≥4 'yes' across all 5 editorial criteria with no 'no'. Safe to generate a chart for it.",
  hold: "Hold — promising but missing evidence on at least one criterion. Use 'Recheck gap' to search for missing data before generating.",
  cut: "Cut — failed a must-pass criterion (useful or ce_specific). Not worth generating a chart for this idea.",
};

function EditorialVerdictPill({
  verdict,
  compact = false,
}: {
  verdict: EditorialVerdict | undefined;
  compact?: boolean;
}) {
  if (!verdict) return null;
  const tone = verdictTone(verdict);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span
        style={{
          borderRadius: 999,
          padding: compact ? "2px 7px" : "3px 9px",
          background: tone.bg,
          color: tone.fg,
          fontSize: compact ? 9 : 10,
          fontWeight: 900,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {tone.label}
      </span>
      <HelpPopover content={VERDICT_HELP[verdict] ?? `Editorial verdict: ${verdict}`} />
    </span>
  );
}

function EditorialVerdictStrip({
  judgements,
}: {
  judgements: EditorialJudgements | undefined;
}) {
  if (!judgements) return null;
  return (
    <div
      style={{
        display: "flex",
        gap: 5,
        flexWrap: "wrap",
        marginTop: 6,
      }}
    >
      {EDITORIAL_KEYS.map((key) => {
        const j = judgements[key];
        if (!j) return null;
        const tone = judgementTone(j.verdict);
        const tooltip = `${EDITORIAL_QUESTIONS[key]}\n→ ${j.verdict.toUpperCase()}${
          j.rationale ? `\n${j.rationale}` : ""
        }`;
        return (
          <span
            key={key}
            style={{ display: "inline-flex", alignItems: "center", gap: 2 }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                borderRadius: 999,
                padding: "2px 7px",
                background: tone.bg,
                color: tone.fg,
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              <span style={{ fontWeight: 900 }}>{tone.symbol}</span>
              {EDITORIAL_LABELS[key]}
            </span>
            <HelpPopover content={tooltip} />
          </span>
        );
      })}
    </div>
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
  /**
   * Either bare fact ids (legacy) or tagged refs `{ id, kind }` from the
   * Task #63 evidence-kind taxonomy. Both shapes are accepted here so this
   * component is backward-compatible with rows generated before #63.
   */
  refs: (string | { id: string; kind?: string })[];
}) {
  const [open, setOpen] = useState(false);
  const refIds = refs
    .map((r) => (typeof r === "string" ? r : r?.id))
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  // Lazy-load only when opened so we don't pile API calls onto the CE page.
  const { data } = useGetCeIntelligence(ceSlug, {
    query: {
      enabled: open,
      queryKey: getGetCeIntelligenceQueryKey(ceSlug),
    },
  });
  const intel = (data ?? null) as CeIntelligence | null;
  const cited =
    intel?.facts.filter((f) => refIds.includes(f.id)) ?? [];

  if (refIds.length === 0) return null;

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
