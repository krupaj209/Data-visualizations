import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import {
  db,
  chartsTable,
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

export default router;
