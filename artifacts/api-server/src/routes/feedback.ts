import { Router, type IRouter } from "express";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  cesTable,
  chartsTable,
  chartFeedbackTable,
  chartEditsTable,
  drdsTable,
  type Ce,
  type Chart,
  type ChartFeedback,
} from "@workspace/db";
import { regenerateSingleChart } from "../lib/research-pipeline";
import {
  CHART_ARCHETYPES,
  isImplementedArchetype,
  type ChartArchetypeId,
} from "@workspace/question-bank";

const router: IRouter = Router();

const ISSUE_CATEGORIES = [
  "wrong_data",
  "misleading",
  "ugly",
  "doesnt_answer",
  "other",
] as const;
const STATUSES = ["open", "escalated", "resolved", "dismissed"] as const;

const RegenerateChartBody = z.object({
  feedback: z.string().trim().max(4000).optional(),
  feedbackContext: z
    .object({
      chartFeedbackId: z.number().int().positive().optional(),
      note: z.string().trim().max(2000).optional(),
      issueCategory: z.string().trim().max(80).optional(),
    })
    .optional(),
});

/**
 * Severity is derived from issue category. Drives the inline badge color
 * and the trouble-score weight. "high" = factual problem; "medium" =
 * judgment problem; "low" = polish.
 */
const SEVERITY_BY_CATEGORY: Record<string, "high" | "medium" | "low"> = {
  wrong_data: "high",
  misleading: "medium",
  doesnt_answer: "medium",
  ugly: "low",
  other: "low",
};
const SEVERITY_WEIGHT: Record<"high" | "medium" | "low", number> = {
  high: 1.0,
  medium: 0.6,
  low: 0.3,
};
const STATUS_WEIGHT: Record<string, number> = {
  open: 1.0,
  escalated: 1.4,
  resolved: 0.3,
  dismissed: 0,
};
const EDIT_WEIGHT = 0.25;
/**
 * Resolved feedback only counts toward the trouble score for this many
 * days after creation. Older resolved items are considered fully addressed
 * and drop out of the signal so historical noise doesn't bias archetypes.
 */
const RESOLVED_RECENCY_DAYS = 30;

function deriveSeverity(
  issueCategory: string | null,
  rating: number | null,
): "high" | "medium" | "low" | "none" {
  if (issueCategory && SEVERITY_BY_CATEGORY[issueCategory]) {
    return SEVERITY_BY_CATEGORY[issueCategory];
  }
  if (typeof rating === "number" && rating <= 2) return "medium";
  if (typeof rating === "number" && rating === 3) return "low";
  return "none";
}

function severityRank(s: "high" | "medium" | "low" | "none"): number {
  return s === "high" ? 3 : s === "medium" ? 2 : s === "low" ? 1 : 0;
}

function serializeFeedback(f: ChartFeedback) {
  return {
    id: f.id,
    chartId: f.chartId,
    rating: f.rating,
    issueCategory: f.issueCategory,
    note: f.note,
    reporterName: f.reporterName,
    status: f.status,
    resolvedChartId: f.resolvedChartId ?? null,
    severity: deriveSeverity(f.issueCategory, f.rating),
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

function serializeCe(ce: Ce, chartCount: number) {
  return {
    id: ce.id,
    slug: ce.slug,
    name: ce.name,
    city: ce.city,
    country: ce.country,
    category: ce.category,
    summary: ce.summary,
    emoji: ce.emoji,
    status: ce.status,
    chartCount,
    createdAt: ce.createdAt.toISOString(),
    updatedAt: ce.updatedAt.toISOString(),
  };
}

function serializeChart(chart: Chart) {
  return {
    id: chart.id,
    ceId: chart.ceId,
    slug: chart.slug,
    question: chart.question,
    title: chart.title,
    subtitle: chart.subtitle,
    insight: chart.insight,
    chartType: chart.chartType,
    spec: chart.spec,
    status: chart.status,
    provenance: chart.provenance ?? null,
    sortOrder: chart.sortOrder,
    createdAt: chart.createdAt.toISOString(),
    updatedAt: chart.updatedAt.toISOString(),
  };
}

const createBody = z.object({
  rating: z.number().int().min(1).max(5).nullable().optional(),
  issueCategory: z.enum(ISSUE_CATEGORIES).nullable().optional(),
  note: z.string().max(2000).optional(),
  reporterName: z.string().max(120).optional(),
});

router.get("/charts/:id/feedback", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid chart id" });
    return;
  }
  const rows = await db
    .select()
    .from(chartFeedbackTable)
    .where(eq(chartFeedbackTable.chartId, id))
    .orderBy(desc(chartFeedbackTable.createdAt));
  res.json(rows.map(serializeFeedback));
});

router.post("/charts/:id/feedback", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid chart id" });
    return;
  }
  const parsed = createBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (
    parsed.data.rating == null &&
    !parsed.data.issueCategory &&
    !parsed.data.note?.trim()
  ) {
    res
      .status(400)
      .json({ error: "Provide a rating, issue category, or note." });
    return;
  }

  const [chart] = await db
    .select()
    .from(chartsTable)
    .where(eq(chartsTable.id, id));
  if (!chart) {
    res.status(404).json({ error: "Chart not found" });
    return;
  }

  const [inserted] = await db
    .insert(chartFeedbackTable)
    .values({
      chartId: id,
      rating: parsed.data.rating ?? null,
      issueCategory: parsed.data.issueCategory ?? null,
      note: parsed.data.note?.trim() ?? "",
      reporterName: parsed.data.reporterName?.trim() ?? "",
      status: "open",
    })
    .returning();
  if (!inserted) {
    res.status(500).json({ error: "Failed to save feedback" });
    return;
  }
  res.status(201).json(serializeFeedback(inserted));
});

router.get("/feedback", async (req, res): Promise<void> => {
  const rawStatus =
    typeof req.query.status === "string" ? req.query.status : null;
  // Validate against the allowed enum so a typo or stale client can't
  // silently match no rows (or, worse, look like it filtered when it
  // didn't). Empty/absent → no filter, anything unrecognised → 400.
  let status: (typeof STATUSES)[number] | null = null;
  if (rawStatus) {
    const parsed = z.enum(STATUSES).safeParse(rawStatus);
    if (!parsed.success) {
      res.status(400).json({
        error: `Invalid status. Expected one of: ${STATUSES.join(", ")}`,
      });
      return;
    }
    status = parsed.data;
  }

  // Always hide feedback on archived CEs — the writer can restore
  // the CE first if they want to act on it. Combined with the
  // optional status filter via `and()`.
  const liveOnly = isNull(cesTable.archivedAt);
  const where = status
    ? and(eq(chartFeedbackTable.status, status), liveOnly)
    : liveOnly;

  const rows = await db
    .select({
      f: chartFeedbackTable,
      chart: chartsTable,
      ce: cesTable,
      editCount: sql<number>`(SELECT COUNT(*)::int FROM ${chartEditsTable} WHERE ${chartEditsTable.chartId} = ${chartsTable.id})`,
    })
    .from(chartFeedbackTable)
    .innerJoin(chartsTable, eq(chartsTable.id, chartFeedbackTable.chartId))
    .innerJoin(cesTable, eq(cesTable.id, chartsTable.ceId))
    .where(where)
    .orderBy(desc(chartFeedbackTable.createdAt));

  // Sort by severity (high → low) then by recency.
  const out = rows
    .map((r) => ({
      feedback: serializeFeedback(r.f),
      chart: serializeChart(r.chart),
      ce: serializeCe(r.ce, 0),
      chartEditCount: Number(r.editCount ?? 0),
    }))
    .sort((a, b) => {
      const sa = severityRank(
        deriveSeverity(a.feedback.issueCategory, a.feedback.rating),
      );
      const sb = severityRank(
        deriveSeverity(b.feedback.issueCategory, b.feedback.rating),
      );
      if (sb !== sa) return sb - sa;
      return (
        new Date(b.feedback.createdAt).getTime() -
        new Date(a.feedback.createdAt).getTime()
      );
    });

  res.json(out);
});

const updateBody = z.object({
  status: z.enum(STATUSES),
});

router.patch("/feedback/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid feedback id" });
    return;
  }
  const parsed = updateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(chartFeedbackTable)
    .set({ status: parsed.data.status })
    .where(eq(chartFeedbackTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Feedback not found" });
    return;
  }
  res.json(serializeFeedback(updated));
});

router.get("/triage/questions", async (_req, res): Promise<void> => {
  // Fetch all charts joined with their CE and aggregate counts.
  // Archived CEs are excluded — they're restore-only and shouldn't
  // surface in the writer's triage queue.
  const charts = await db
    .select({
      chart: chartsTable,
      ce: cesTable,
    })
    .from(chartsTable)
    .innerJoin(cesTable, eq(cesTable.id, chartsTable.ceId))
    .where(isNull(cesTable.archivedAt));

  const feedbackRows = await db.select().from(chartFeedbackTable);
  const editRows = await db.select().from(chartEditsTable);

  const feedbackByChart = new Map<number, ChartFeedback[]>();
  for (const f of feedbackRows) {
    const arr = feedbackByChart.get(f.chartId) ?? [];
    arr.push(f);
    feedbackByChart.set(f.chartId, arr);
  }
  const editsByChart = new Map<number, number>();
  for (const e of editRows) {
    editsByChart.set(e.chartId, (editsByChart.get(e.chartId) ?? 0) + 1);
  }

  // Group by (subcategoryId derived from ce.category, normalized question).
  type Bucket = {
    questionText: string;
    subcategoryId: string;
    chartType: string;
    chartIds: Set<number>;
    openFeedbackCount: number;
    editCount: number;
    troubleScore: number;
    sampleCeSlugs: Set<string>;
  };
  const buckets = new Map<string, Bucket>();

  for (const { chart, ce } of charts) {
    const questionKey = chart.question.trim().toLowerCase();
    const subcategoryId = ce.category || "uncategorized";
    const key = `${subcategoryId}::${questionKey}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        questionText: chart.question.trim(),
        subcategoryId,
        chartType: chart.chartType,
        chartIds: new Set(),
        openFeedbackCount: 0,
        editCount: 0,
        troubleScore: 0,
        sampleCeSlugs: new Set(),
      };
      buckets.set(key, bucket);
    }
    bucket.chartIds.add(chart.id);
    bucket.sampleCeSlugs.add(ce.slug);

    const fb = feedbackByChart.get(chart.id) ?? [];
    const cutoff =
      Date.now() - RESOLVED_RECENCY_DAYS * 24 * 60 * 60 * 1000;
    for (const f of fb) {
      // Open/escalated count toward the inline badge regardless of
      // whether we can derive a severity (note-only feedback still
      // signals "needs attention"); severity is only used for colouring
      // and trouble-score weighting.
      if (f.status === "open" || f.status === "escalated") {
        bucket.openFeedbackCount += 1;
      }
      const sev = deriveSeverity(f.issueCategory, f.rating);
      if (sev === "none") continue;
      // Resolved items only contribute to trouble score within the
      // recency window after they were RESOLVED (we use updatedAt as a
      // proxy for resolved-at since the only way `status` flips to
      // "resolved" is via PATCH, which bumps updatedAt). Outside the
      // window they're considered fully addressed.
      if (
        f.status === "resolved" &&
        f.updatedAt instanceof Date &&
        f.updatedAt.getTime() < cutoff
      ) {
        continue;
      }
      const sw = STATUS_WEIGHT[f.status] ?? 0;
      bucket.troubleScore += SEVERITY_WEIGHT[sev] * sw;
    }
    const edits = editsByChart.get(chart.id) ?? 0;
    bucket.editCount += edits;
    bucket.troubleScore += edits * EDIT_WEIGHT;
  }

  const out = Array.from(buckets.values())
    .map((b) => ({
      questionText: b.questionText,
      subcategoryId: b.subcategoryId,
      chartType: b.chartType,
      chartCount: b.chartIds.size,
      openFeedbackCount: b.openFeedbackCount,
      editCount: b.editCount,
      troubleScore: Math.round(b.troubleScore * 100) / 100,
      sampleCeSlugs: Array.from(b.sampleCeSlugs).slice(0, 6),
    }))
    .filter((b) => b.troubleScore > 0)
    .sort((a, b) => b.troubleScore - a.troubleScore);

  res.json(out);
});

router.post("/charts/:id/regenerate", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid chart id" });
    return;
  }
  const body = RegenerateChartBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [chart] = await db
    .select()
    .from(chartsTable)
    .where(eq(chartsTable.id, id));
  if (!chart) {
    res.status(404).json({ error: "Chart not found" });
    return;
  }

  const [ce] = await db
    .select()
    .from(cesTable)
    .where(eq(cesTable.id, chart.ceId));
  if (!ce) {
    res.status(404).json({ error: "CE not found for chart" });
    return;
  }

  // NOTE: locked (curated) CEs allow single-chart feedback-driven regen.
  // It updates one chart's spec in place — chart IDs (and therefore embed
  // URLs) stay stable. Full-deck regen and chart deletion remain locked
  // (see routes/research.ts and routes/charts.ts).

  const [drd] = await db
    .select()
    .from(drdsTable)
    .where(eq(drdsTable.ceSlug, ce.slug));
  if (!drd) {
    res.status(412).json({
      error: `No DRD uploaded for "${ce.slug}". Upload one before regenerating.`,
    });
    return;
  }

  // Pick the archetype: prefer provenance.recommended_archetype, then
  // chart.chartType (which is one of the spec discriminators).
  const provenance = (chart.provenance ?? {}) as Record<string, unknown>;
  const recommended =
    typeof provenance.recommended_archetype === "string"
      ? (provenance.recommended_archetype as string)
      : chart.chartType;
  if (!(recommended in CHART_ARCHETYPES)) {
    res.status(400).json({
      error: `Chart type "${recommended}" is not a known archetype; cannot regenerate.`,
    });
    return;
  }
  if (!isImplementedArchetype(recommended as ChartArchetypeId)) {
    res.status(400).json({
      error: `Archetype "${recommended}" is reserved but its renderer hasn't landed yet (viz_not_yet_built); cannot regenerate.`,
    });
    return;
  }

  let result;
  try {
    result = await regenerateSingleChart({
      ce: { name: ce.name, city: ce.city, country: ce.country, slug: ce.slug },
      question: chart.question,
      archetype: recommended as ChartArchetypeId,
      drdMarkdown: drd.markdown,
      feedback: body.data.feedback,
      ...(body.data.feedbackContext
        ? {
            feedbackContext: {
              ...(body.data.feedbackContext.note
                ? { note: body.data.feedbackContext.note }
                : {}),
              ...(body.data.feedbackContext.issueCategory
                ? { issueCategory: body.data.feedbackContext.issueCategory }
                : {}),
            },
          }
        : {}),
    });
  } catch (err) {
    req.log.error({ err }, "Single-chart regeneration failed");
    res.status(502).json({
      error:
        err instanceof Error
          ? `Regeneration failed: ${err.message}`
          : "Regeneration failed",
    });
    return;
  }

  const [updated] = await db
    .update(chartsTable)
    .set({
      title: result.chart.title,
      subtitle: result.chart.subtitle,
      insight: result.chart.insight,
      chartType: result.chart.spec.type,
      spec: result.chart.spec as unknown as Record<string, unknown>,
      provenance: {
        ...result.provenance,
        source_question: chart.question,
        recommended_archetype: recommended,
        ...(body.data.feedback
          ? { regeneration_feedback: body.data.feedback }
          : {}),
      } as Record<string, unknown>,
    })
    .where(eq(chartsTable.id, id))
    .returning();
  if (!updated) {
    res.status(500).json({ error: "Failed to persist regenerated chart" });
    return;
  }

  // NOTE: do NOT log this regeneration into `chart_edits`. That table is
  // strictly the writer-origin implicit-feedback signal — mixing AI actions
  // in would inflate the "writer dissatisfaction" weight in trouble scoring.

  // Close the feedback loop: if this regeneration was triggered from a
  // specific feedback row (inline "Send & regenerate" on the chart card),
  // mark that row resolved so it drops out of Triage. Best-effort — a
  // failure here shouldn't roll back the successful regeneration.
  const resolveId = body.data.feedbackContext?.chartFeedbackId;
  if (resolveId) {
    try {
      await db
        .update(chartFeedbackTable)
        .set({ status: "resolved", resolvedChartId: updated.id })
        .where(
          and(
            eq(chartFeedbackTable.id, resolveId),
            eq(chartFeedbackTable.chartId, id),
          ),
        );
    } catch (err) {
      req.log.warn(
        { err, resolveId, chartId: id },
        "Failed to mark chart_feedback row resolved after regenerate",
      );
    }
  }

  res.json({
    chart: serializeChart(updated),
    ce: serializeCe(ce, 0),
  });
});

export default router;
