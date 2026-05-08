import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  chartsTable,
  chartEditsTable,
  cesTable,
  type Chart,
  type Ce,
} from "@workspace/db";
import { GetChartParams } from "@workspace/api-zod";

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
    sortOrder: chart.sortOrder,
    createdAt: chart.createdAt.toISOString(),
    updatedAt: chart.updatedAt.toISOString(),
  };
}

router.get("/charts/:id", async (req, res): Promise<void> => {
  const params = GetChartParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [chart] = await db
    .select()
    .from(chartsTable)
    .where(eq(chartsTable.id, params.data.id));
  if (!chart) {
    res.status(404).json({ error: "Chart not found" });
    return;
  }

  const [row] = await db
    .select({
      ce: cesTable,
      chartCount: sql<number>`(SELECT COUNT(*)::int FROM ${chartsTable} WHERE ${chartsTable.ceId} = ${cesTable.id})`,
    })
    .from(cesTable)
    .where(eq(cesTable.id, chart.ceId));
  if (!row) {
    res.status(404).json({ error: "CE not found for chart" });
    return;
  }

  res.json({
    chart: serializeChart(chart),
    ce: serializeCe(row.ce, Number(row.chartCount)),
  });
});

/**
 * Writer/copy edits — when a CMS writer tweaks a chart's title, subtitle,
 * or insight from the in-Studio editor, persist the new copy AND log a
 * `chart_edits` row. The edit row is the implicit-feedback signal the
 * triage scoring (and Trouble-score view) consume.
 */
const editBody = z.object({
  title: z.string().max(200).optional(),
  subtitle: z.string().max(400).optional(),
  insight: z.string().max(800).optional(),
  editorName: z.string().max(120).optional(),
  summary: z.string().max(200).optional(),
});

router.patch("/charts/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid chart id" });
    return;
  }
  const parsed = editBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { editorName, summary, ...patch } = parsed.data;
  const fields: Record<string, string> = {};
  if (typeof patch.title === "string") fields.title = patch.title;
  if (typeof patch.subtitle === "string") fields.subtitle = patch.subtitle;
  if (typeof patch.insight === "string") fields.insight = patch.insight;
  if (Object.keys(fields).length === 0) {
    res.status(400).json({ error: "No editable fields provided" });
    return;
  }

  const [updated] = await db
    .update(chartsTable)
    .set(fields)
    .where(eq(chartsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Chart not found" });
    return;
  }

  await db.insert(chartEditsTable).values({
    chartId: id,
    editorName: editorName?.trim() ?? "writer",
    summary:
      summary?.trim() ||
      `Edited: ${Object.keys(fields).join(", ")}`,
  });

  res.json({ chart: serializeChart(updated) });
});

export default router;
