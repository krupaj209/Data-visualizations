import { Router, type IRouter } from "express";
import { eq, asc, sql, inArray } from "drizzle-orm";
import {
  db,
  cesTable,
  chartsTable,
  chartFeedbackTable,
  chartEditsTable,
  type Ce,
  type Chart,
} from "@workspace/db";
import { CreateCeBody, GetCeParams } from "@workspace/api-zod";
import { generateCePayload, slugify } from "../lib/generate-ce";
import { LOCKED_CE_SLUGS } from "../lib/locked-ces";

const router: IRouter = Router();

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

interface FeedbackEnrichment {
  openFeedbackCount: number;
  topFeedbackSeverity: "high" | "medium" | "low" | null;
  editCount: number;
}

function emptyEnrichment(): FeedbackEnrichment {
  return { openFeedbackCount: 0, topFeedbackSeverity: null, editCount: 0 };
}

function serializeChart(chart: Chart, enrich?: FeedbackEnrichment) {
  const e = enrich ?? emptyEnrichment();
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
    sortOrder: chart.sortOrder,
    openFeedbackCount: e.openFeedbackCount,
    topFeedbackSeverity: e.topFeedbackSeverity,
    editCount: e.editCount,
    createdAt: chart.createdAt.toISOString(),
    updatedAt: chart.updatedAt.toISOString(),
  };
}

const SEVERITY_BY_CATEGORY: Record<string, "high" | "medium" | "low"> = {
  wrong_data: "high",
  misleading: "medium",
  doesnt_answer: "medium",
  ugly: "low",
  other: "low",
};
function severityRank(s: "high" | "medium" | "low" | null): number {
  return s === "high" ? 3 : s === "medium" ? 2 : s === "low" ? 1 : 0;
}

async function loadChartEnrichment(
  chartIds: number[],
): Promise<Map<number, FeedbackEnrichment>> {
  const map = new Map<number, FeedbackEnrichment>();
  if (chartIds.length === 0) return map;

  const fb = await db
    .select()
    .from(chartFeedbackTable)
    .where(inArray(chartFeedbackTable.chartId, chartIds));
  const edits = await db
    .select({
      chartId: chartEditsTable.chartId,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(chartEditsTable)
    .where(inArray(chartEditsTable.chartId, chartIds))
    .groupBy(chartEditsTable.chartId);

  for (const id of chartIds) map.set(id, emptyEnrichment());

  for (const f of fb) {
    if (f.status !== "open" && f.status !== "escalated") continue;
    const e = map.get(f.chartId);
    if (!e) continue;
    // Every open/escalated row counts toward the badge — even note-only
    // feedback without a derivable severity still represents an open
    // issue. Severity is only used for the badge colour/topSeverity.
    e.openFeedbackCount += 1;
    const sev =
      (f.issueCategory && SEVERITY_BY_CATEGORY[f.issueCategory]) ||
      (typeof f.rating === "number" && f.rating <= 2 ? "medium" : null);
    if (sev && severityRank(sev) > severityRank(e.topFeedbackSeverity)) {
      e.topFeedbackSeverity = sev;
    }
  }
  for (const row of edits) {
    const e = map.get(row.chartId);
    if (!e) continue;
    e.editCount = Number(row.count ?? 0);
  }
  return map;
}

router.get("/ces", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      ce: cesTable,
      chartCount: sql<number>`COALESCE(COUNT(${chartsTable.id})::int, 0)`,
    })
    .from(cesTable)
    .leftJoin(chartsTable, eq(chartsTable.ceId, cesTable.id))
    .groupBy(cesTable.id)
    .orderBy(asc(cesTable.name));

  res.json(rows.map(({ ce, chartCount }) => serializeCe(ce, Number(chartCount))));
  void req;
});

router.post("/ces", async (req, res): Promise<void> => {
  const parsed = CreateCeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const slug = slugify(parsed.data.name);
  if (!slug) {
    res.status(400).json({ error: "Could not derive slug from name" });
    return;
  }

  const [existing] = await db
    .select()
    .from(cesTable)
    .where(eq(cesTable.slug, slug));
  if (existing) {
    res.status(400).json({
      error: `A CE with slug "${slug}" already exists`,
    });
    return;
  }

  let payload;
  try {
    payload = await generateCePayload({
      name: parsed.data.name,
      city: parsed.data.city,
      country: parsed.data.country,
      category: parsed.data.category,
    });
  } catch (err) {
    req.log.error({ err }, "AI generation failed");
    res.status(502).json({
      error:
        err instanceof Error
          ? `AI generation failed: ${err.message}`
          : "AI generation failed",
    });
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [insertedCe] = await tx
        .insert(cesTable)
        .values({
          slug,
          name: parsed.data.name,
          city: parsed.data.city,
          country: parsed.data.country,
          category: parsed.data.category ?? "attraction",
          summary: payload.summary,
          emoji: payload.emoji,
          status: "ready",
        })
        .returning();
      if (!insertedCe) throw new Error("Failed to insert CE");

      const chartRows = payload.charts.map((c, idx) => ({
        ceId: insertedCe.id,
        slug: c.slug,
        question: c.question,
        title: c.title,
        subtitle: c.subtitle,
        insight: c.insight,
        chartType: c.spec.type,
        spec: c.spec as unknown as Record<string, unknown>,
        sortOrder: idx,
      }));

      const insertedCharts = await tx
        .insert(chartsTable)
        .values(chartRows)
        .returning();
      return { ce: insertedCe, charts: insertedCharts };
    });

    res.status(201).json({
      ce: serializeCe(result.ce, result.charts.length),
      charts: result.charts.map((c) => serializeChart(c)),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to persist CE+charts");
    res.status(500).json({
      error:
        err instanceof Error
          ? `Failed to persist CE: ${err.message}`
          : "Failed to persist CE",
    });
  }
});

router.get("/ces/:slug", async (req, res): Promise<void> => {
  const params = GetCeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [ce] = await db
    .select()
    .from(cesTable)
    .where(eq(cesTable.slug, params.data.slug));
  if (!ce) {
    res.status(404).json({ error: "CE not found" });
    return;
  }

  const charts = await db
    .select()
    .from(chartsTable)
    .where(eq(chartsTable.ceId, ce.id))
    .orderBy(asc(chartsTable.sortOrder));

  const enrich = await loadChartEnrichment(charts.map((c) => c.id));

  res.json({
    ce: serializeCe(ce, charts.length),
    charts: charts.map((c) => serializeChart(c, enrich.get(c.id))),
  });
});

// Locked-CE list lives in `../lib/locked-ces` so both the legacy `/ces`
// routes and the new research pipeline share a single source of truth.

router.delete("/ces/:slug", async (req, res): Promise<void> => {
  const params = GetCeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (LOCKED_CE_SLUGS.has(params.data.slug)) {
    res.status(409).json({
      error:
        "This CE has a hand-curated chart set and cannot be deleted.",
    });
    return;
  }

  const [deleted] = await db
    .delete(cesTable)
    .where(eq(cesTable.slug, params.data.slug))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "CE not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/ces/:slug/regenerate", async (req, res): Promise<void> => {
  const params = GetCeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (LOCKED_CE_SLUGS.has(params.data.slug)) {
    res.status(409).json({
      error:
        "This CE has a hand-curated chart set and cannot be regenerated.",
    });
    return;
  }

  const [ce] = await db
    .select()
    .from(cesTable)
    .where(eq(cesTable.slug, params.data.slug));
  if (!ce) {
    res.status(404).json({ error: "CE not found" });
    return;
  }

  let payload;
  try {
    payload = await generateCePayload({
      name: ce.name,
      city: ce.city,
      country: ce.country,
      category: ce.category,
    });
  } catch (err) {
    req.log.error({ err }, "AI regeneration failed");
    res.status(502).json({
      error:
        err instanceof Error
          ? `AI generation failed: ${err.message}`
          : "AI generation failed",
    });
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.delete(chartsTable).where(eq(chartsTable.ceId, ce.id));

      const [updated] = await tx
        .update(cesTable)
        .set({
          summary: payload.summary,
          emoji: payload.emoji,
          status: "ready",
        })
        .where(eq(cesTable.id, ce.id))
        .returning();
      if (!updated) throw new Error("Failed to update CE");

      const chartRows = payload.charts.map((c, idx) => ({
        ceId: ce.id,
        slug: c.slug,
        question: c.question,
        title: c.title,
        subtitle: c.subtitle,
        insight: c.insight,
        chartType: c.spec.type,
        spec: c.spec as unknown as Record<string, unknown>,
        sortOrder: idx,
      }));

      const insertedCharts = await tx
        .insert(chartsTable)
        .values(chartRows)
        .returning();
      return { ce: updated, charts: insertedCharts };
    });

    res.json({
      ce: serializeCe(result.ce, result.charts.length),
      charts: result.charts.map((c) => serializeChart(c)),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to regenerate CE charts");
    res.status(500).json({
      error:
        err instanceof Error
          ? `Failed to regenerate: ${err.message}`
          : "Failed to regenerate",
    });
  }
});

export default router;
