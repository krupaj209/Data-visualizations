import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  chartsTable,
  chartEditsTable,
  cesTable,
  drdsTable,
  type Chart,
  type Ce,
} from "@workspace/db";
import { GetChartParams } from "@workspace/api-zod";
import { chartSpecSchema, type ChartSpec } from "../lib/chart-spec";
import {
  generateOneChart,
  verifyChartStructured,
  type ChartProvenance,
} from "../lib/research-pipeline";
import type { ChartArchetypeId } from "@workspace/question-bank";
import {
  CHART_ARCHETYPES,
  isImplementedArchetype,
} from "@workspace/question-bank";
import { slugify } from "../lib/generate-ce";
import { openai } from "../lib/openai";
import { LOCKED_CE_SLUGS } from "../lib/locked-ces";

const router: IRouter = Router();

function serializeCe(
  ce: Ce,
  chartCount: number,
  draftCount = 0,
  publishedCount = chartCount,
) {
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
    draftCount,
    publishedCount,
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
    lastEditedByWriterAt: chart.lastEditedByWriterAt
      ? chart.lastEditedByWriterAt.toISOString()
      : null,
    interactive: chart.interactive,
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
      draftCount: sql<number>`(SELECT COUNT(*)::int FROM ${chartsTable} WHERE ${chartsTable.ceId} = ${cesTable.id} AND ${chartsTable.status} = 'draft')`,
      publishedCount: sql<number>`(SELECT COUNT(*)::int FROM ${chartsTable} WHERE ${chartsTable.ceId} = ${cesTable.id} AND ${chartsTable.status} = 'published')`,
    })
    .from(cesTable)
    .where(eq(cesTable.id, chart.ceId));
  if (!row) {
    res.status(404).json({ error: "CE not found for chart" });
    return;
  }

  res.json({
    chart: serializeChart(chart),
    ce: serializeCe(
      row.ce,
      Number(row.chartCount),
      Number(row.draftCount),
      Number(row.publishedCount),
    ),
  });
});

/* -------------------------------------------------------------------------- */
/* PATCH /charts/:id — writer edit                                             */
/* -------------------------------------------------------------------------- */

const updateBody = z.object({
  question: z.string().min(2).max(200).optional(),
  title: z.string().min(1).max(120).optional(),
  subtitle: z.string().max(200).optional(),
  insight: z.string().max(400).optional(),
  spec: z.unknown().optional(),
  interactive: z.boolean().optional(),
  writerId: z.string().max(120).optional(),
});

router.patch("/charts/:id", async (req, res): Promise<void> => {
  const params = GetChartParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = updateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(chartsTable)
    .where(eq(chartsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Chart not found" });
    return;
  }

  const update: Partial<typeof chartsTable.$inferInsert> = {};
  if (parsed.data.question !== undefined) update.question = parsed.data.question;
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.subtitle !== undefined) update.subtitle = parsed.data.subtitle;
  if (parsed.data.insight !== undefined) update.insight = parsed.data.insight;

  if (parsed.data.spec !== undefined) {
    const specCheck = chartSpecSchema.safeParse(parsed.data.spec);
    if (!specCheck.success) {
      res.status(400).json({
        error:
          "spec is invalid: " +
          specCheck.error.issues
            .slice(0, 6)
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
      });
      return;
    }
    if (specCheck.data.type !== existing.chartType) {
      res.status(400).json({
        error: `spec.type cannot change (existing: ${existing.chartType}, new: ${specCheck.data.type}).`,
      });
      return;
    }
    update.spec = specCheck.data;
  }

  if (parsed.data.interactive !== undefined) {
    update.interactive = parsed.data.interactive;
  }

  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "No editable fields supplied" });
    return;
  }

  update.lastEditedByWriterAt = new Date();

  try {
    const [updated] = await db
      .update(chartsTable)
      .set(update)
      .where(eq(chartsTable.id, existing.id))
      .returning();
    if (!updated) throw new Error("update returned no row");

    await db.insert(chartEditsTable).values({
      chartId: updated.id,
      writerId: parsed.data.writerId ?? "anonymous",
      action: "edit",
      before: serializeChart(existing),
      after: serializeChart(updated),
      note: null,
    });

    res.json(serializeChart(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update chart");
    res.status(500).json({
      error:
        err instanceof Error ? `Failed to update: ${err.message}` : "Failed",
    });
  }
});

/* -------------------------------------------------------------------------- */
/* DELETE /charts/:id — remove one chart                                       */
/* -------------------------------------------------------------------------- */

router.delete("/charts/:id", async (req, res): Promise<void> => {
  const params = GetChartParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({ chart: chartsTable, ce: cesTable })
    .from(chartsTable)
    .innerJoin(cesTable, eq(cesTable.id, chartsTable.ceId))
    .where(eq(chartsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Chart not found" });
    return;
  }

  if (LOCKED_CE_SLUGS.has(row.ce.slug)) {
    res.status(409).json({
      error:
        "This CE has a hand-curated chart set and its charts cannot be deleted.",
    });
    return;
  }

  const [deleted] = await db
    .delete(chartsTable)
    .where(eq(chartsTable.id, row.chart.id))
    .returning();
  if (!deleted) {
    res.status(500).json({ error: "Failed to delete chart" });
    return;
  }

  res.json(serializeChart(deleted));
});

/* -------------------------------------------------------------------------- */
/* POST /charts/:id/publish — flip status                                      */
/* -------------------------------------------------------------------------- */

const publishBody = z.object({
  status: z.enum(["draft", "published"]),
  writerId: z.string().max(120).optional(),
});

router.post("/charts/:id/publish", async (req, res): Promise<void> => {
  const params = GetChartParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = publishBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(chartsTable)
    .where(eq(chartsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Chart not found" });
    return;
  }

  const [updated] = await db
    .update(chartsTable)
    .set({ status: parsed.data.status })
    .where(eq(chartsTable.id, existing.id))
    .returning();
  if (!updated) {
    res.status(500).json({ error: "Failed to update status" });
    return;
  }

  await db.insert(chartEditsTable).values({
    chartId: updated.id,
    writerId: parsed.data.writerId ?? "anonymous",
    action: parsed.data.status === "published" ? "publish" : "unpublish",
    before: { status: existing.status },
    after: { status: updated.status },
    note: null,
  });

  res.json(serializeChart(updated));
});

/* -------------------------------------------------------------------------- */
/* POST /ces/:slug/publish-all-drafts — bulk-publish every draft on the CE     */
/* -------------------------------------------------------------------------- */

const publishAllBody = z.object({
  writerId: z.string().max(120).optional(),
});

router.post(
  "/ces/:slug/publish-all-drafts",
  async (req, res): Promise<void> => {
    const slug = req.params["slug"];
    if (!slug) {
      res.status(400).json({ error: "slug is required" });
      return;
    }
    const parsed = publishAllBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [ce] = await db
      .select()
      .from(cesTable)
      .where(eq(cesTable.slug, slug));
    if (!ce) {
      res.status(404).json({ error: "CE not found" });
      return;
    }

    const drafts = await db
      .select()
      .from(chartsTable)
      .where(
        sql`${chartsTable.ceId} = ${ce.id} AND ${chartsTable.status} = 'draft'`,
      );

    if (drafts.length === 0) {
      res.json({ published: 0 });
      return;
    }

    const updated = await db
      .update(chartsTable)
      .set({ status: "published" })
      .where(
        sql`${chartsTable.ceId} = ${ce.id} AND ${chartsTable.status} = 'draft'`,
      )
      .returning();

    if (updated.length > 0) {
      await db.insert(chartEditsTable).values(
        updated.map((u) => ({
          chartId: u.id,
          writerId: parsed.data.writerId ?? "anonymous",
          action: "publish",
          before: { status: "draft" },
          after: { status: "published" },
          note: "bulk publish-all-drafts",
        })),
      );
    }

    res.json({ published: updated.length });
  },
);

/* -------------------------------------------------------------------------- */
/* POST /charts/:id/verify — on-demand DRD + verifier check                    */
/* -------------------------------------------------------------------------- */

router.post("/charts/:id/verify", async (req, res): Promise<void> => {
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
  const [ce] = await db
    .select()
    .from(cesTable)
    .where(eq(cesTable.id, chart.ceId));
  if (!ce) {
    res.status(404).json({ error: "CE not found" });
    return;
  }

  // Try to load the DRD; degrade gracefully if there isn't one — we can
  // still ask the verifier to spot-check internal consistency.
  const [drd] = await db
    .select()
    .from(drdsTable)
    .where(eq(drdsTable.ceSlug, ce.slug));

  if (!openai) {
    res.json({
      status: "skipped",
      issues: [],
      suggestions: [],
      suggestedSpec: null,
      verifierNotes: "OpenAI verifier env vars are not configured.",
    });
    return;
  }

  const specJson = chart.spec;
  const provenance =
    (chart.provenance as ChartProvenance | null) ?? {
      status: "estimated",
      drd_snippets: [],
      web_sources: [],
      estimates: [],
      verifier_notes: "",
    };

  try {
    const result = await verifyChartStructured(
      {
        ce: { name: ce.name, city: ce.city, country: ce.country, slug: ce.slug },
        subcategoryId: ce.category,
        drdMarkdown: drd?.markdown ?? "(no DRD uploaded)",
      },
      {
        slug: chart.slug,
        question: chart.question,
        title: chart.title,
        subtitle: chart.subtitle,
        insight: chart.insight,
        spec: specJson as unknown as ChartSpec,
      },
    );

    // Re-validate the verifier's suggested spec before exposing it to the
    // UI. Drop it silently if the verifier returned something the writer
    // could never apply (wrong type / invalid shape).
    let safeSuggestedSpec: ChartSpec | null = null;
    if (result.suggestedSpec) {
      const candidate = chartSpecSchema.safeParse(result.suggestedSpec);
      if (candidate.success && candidate.data.type === chart.chartType) {
        safeSuggestedSpec = candidate.data;
      }
    }

    // Persist the verifier note onto provenance for next read.
    const mergedProvenance: ChartProvenance = {
      ...provenance,
      verifier_notes: result.verifier_notes,
    };
    await db
      .update(chartsTable)
      .set({ provenance: mergedProvenance as unknown as Record<string, unknown> })
      .where(eq(chartsTable.id, chart.id));

    await db.insert(chartEditsTable).values({
      chartId: chart.id,
      writerId: "anonymous",
      action: "verify",
      before: null,
      after: null,
      note: result.verifier_notes,
    });

    res.json({
      status: result.verified
        ? "ok"
        : result.issues.length === 0 && /^skipped/i.test(result.verifier_notes)
          ? "skipped"
          : "issues",
      issues: result.issues,
      suggestions: result.suggestions,
      suggestedSpec: safeSuggestedSpec,
      verifierNotes: result.verifier_notes,
    });
  } catch (err) {
    req.log.error({ err }, "Verifier failed");
    res.status(502).json({
      error:
        err instanceof Error ? `Verifier failed: ${err.message}` : "Failed",
    });
  }
});

/* -------------------------------------------------------------------------- */
/* POST /ces/:slug/charts — topic-to-chart                                     */
/* -------------------------------------------------------------------------- */

const topicBody = z.object({
  topic: z.string().min(4).max(400),
  archetype: z.string().optional(),
  pastedData: z.string().max(20_000).optional(),
  plannerContext: z.string().max(5_000).optional(),
  origin: z.enum(["topic_to_chart", "planner_recommendation"]).optional(),
  sourceUrl: z.string().url().max(800).optional(),
  writerId: z.string().max(120).optional(),
});

const archetypeIds = Object.keys(CHART_ARCHETYPES) as ChartArchetypeId[];

router.post("/ces/:slug/charts", async (req, res): Promise<void> => {
  const slug = req.params["slug"];
  if (!slug) {
    res.status(400).json({ error: "slug is required" });
    return;
  }
  const parsed = topicBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [ce] = await db
    .select()
    .from(cesTable)
    .where(eq(cesTable.slug, slug));
  if (!ce) {
    res.status(404).json({ error: "CE not found" });
    return;
  }

  const [drd] = await db
    .select()
    .from(drdsTable)
    .where(eq(drdsTable.ceSlug, slug));

  // Build a one-shot DRD-equivalent from writer-supplied context. Even
  // without a real DRD we can still run the per-archetype generator —
  // it will lean on Google Search grounding for the rest.
  const writerContextParts: string[] = [];
  if (parsed.data.pastedData) {
    writerContextParts.push(
      `--- WRITER-PROVIDED DATA (treat as authoritative) ---\n${parsed.data.pastedData}`,
    );
  }
  if (parsed.data.sourceUrl) {
    writerContextParts.push(`--- SOURCE LINK ---\n${parsed.data.sourceUrl}`);
  }
  if (parsed.data.plannerContext) {
    writerContextParts.push(
      `--- PLANNER CONTEXT (use to understand the requested chart; do not treat as a primary source) ---\n${parsed.data.plannerContext}`,
    );
  }
  const drdMarkdown =
    (drd?.markdown ?? "") +
    (writerContextParts.length > 0
      ? "\n\n" + writerContextParts.join("\n\n")
      : "");

  // Pick archetype: writer-specified > inferred via Gemini > default.
  let archetype: ChartArchetypeId | null = null;
  if (parsed.data.archetype && archetypeIds.includes(parsed.data.archetype as ChartArchetypeId)) {
    archetype = parsed.data.archetype as ChartArchetypeId;
  } else {
    archetype = inferArchetype(parsed.data.topic);
  }

  if (!archetype) {
    res.status(400).json({
      error:
        "Could not match this topic to any existing chart archetype. Please rephrase or pick an archetype manually.",
    });
    return;
  }
  if (!isImplementedArchetype(archetype)) {
    res.status(400).json({
      error: `Archetype "${archetype}" is reserved but its renderer hasn't landed yet (viz_not_yet_built). Pick a different archetype.`,
    });
    return;
  }

  let generated;
  try {
    generated = await generateOneChart(
      {
        ce: { name: ce.name, city: ce.city, country: ce.country, slug: ce.slug },
        subcategoryId: ce.category,
        drdMarkdown: drdMarkdown || `(no DRD; topic: ${parsed.data.topic})`,
      },
      parsed.data.topic,
      archetype,
    );
  } catch (err) {
    req.log.error({ err }, "Topic-to-chart generation failed");
    res.status(502).json({
      error:
        err instanceof Error
          ? `Generation failed: ${err.message}`
          : "Generation failed",
    });
    return;
  }

  // Choose a unique slug. Prefer the AI's slug; if it collides for this
  // CE, append a numeric suffix.
  const baseSlug = generated.spec.slug || slugify(parsed.data.topic) || "draft";
  const existingSlugs = new Set(
    (
      await db
        .select({ slug: chartsTable.slug })
        .from(chartsTable)
        .where(eq(chartsTable.ceId, ce.id))
    ).map((r) => r.slug),
  );
  let chosenSlug = baseSlug;
  let n = 2;
  while (existingSlugs.has(chosenSlug)) {
    chosenSlug = `${baseSlug}-${n++}`;
  }

  // Place new drafts at the end of the deck.
  const [{ maxOrder }] = await db
    .select({
      maxOrder: sql<number>`COALESCE(MAX(${chartsTable.sortOrder}), 0)::int`,
    })
    .from(chartsTable)
    .where(eq(chartsTable.ceId, ce.id));

  const [inserted] = await db
    .insert(chartsTable)
    .values({
      ceId: ce.id,
      slug: chosenSlug,
      question: generated.spec.question,
      title: generated.spec.title,
      subtitle: generated.spec.subtitle,
      insight: generated.spec.insight,
      chartType: generated.spec.spec.type,
      spec: generated.spec.spec,
      status: "draft",
      provenance: {
        ...generated.provenance,
        source_question: parsed.data.topic,
        recommended_archetype: archetype,
        origin: parsed.data.origin ?? "topic_to_chart",
      },
      sortOrder: Number(maxOrder ?? 0) + 1,
    })
    .returning();
  if (!inserted) {
    res.status(500).json({ error: "Failed to insert chart" });
    return;
  }

  await db.insert(chartEditsTable).values({
    chartId: inserted.id,
    writerId: parsed.data.writerId ?? "anonymous",
    action: "create",
    before: null,
    after: serializeChart(inserted),
    note: parsed.data.topic,
  });

  res.status(201).json(serializeChart(inserted));
});

/**
 * Tiny heuristic archetype picker for when the writer doesn't specify one.
 * Looks for keywords in the topic. Designed to be cheap (no extra LLM call)
 * and to return null when the topic does not clearly match a built archetype.
 */
function inferArchetype(topic: string): ChartArchetypeId | null {
  const t = topic.toLowerCase();
  if (/\bhistory|timeline|origin|origins|built|construction|opened|restoration|restored|medieval|ancient|modern era|turning points?\b/.test(t)) return "history_timeline";
  if (/\b(price|fare|cost|cheapest|expensive).*\b(week|date|calendar|day)\b|\b(week|date|calendar|day).*\b(price|fare|cost|cheapest|expensive)\b/.test(t)) return "month_calendar";
  if (/\b(price|fare|cost).*\b(month|season|lead time|advance)\b|\b(month|season|lead time|advance).*\b(price|fare|cost)\b/.test(t)) return "price_curve";
  if (/\bhour|hourly|time of day|when in the day\b/.test(t)) return "hourly_heatmap";
  if (/\bday of (the )?week|weekday|weekend\b/.test(t)) return "weekly_pattern";
  if (/\bseason|month|monthly|year\b/.test(t)) return "seasonal_curve";
  if (/\bbook|in advance|days before|sell out|sold out\b/.test(t)) return "booking_window";
  if (/\bticket|tier|price|pass|skip the line\b/.test(t)) return "ticket_ladder";
  if (/\broute|routes|stop|stops|pier|piers|landmark coverage|itinerary|covers|coverage\b/.test(t)) return "route_profile";
  if (/\bzone|hall|wing|area|room|gallery|section\b/.test(t)) return "compare_zones";
  if (/\bshare|breakdown|split|percentage|percent of\b/.test(t)) return "donut_breakdown";
  if (/\bdate|calendar|next \d+ (weeks|months|days)\b/.test(t)) return "month_calendar";
  if (/\bduration|how long|takes|spend\b/.test(t)) return "stat_grid";
  return null;
}

/**
 * Re-export so other modules can use it if they need to. (Keeps the
 * heuristic contained to this file and not duplicated in the UI.)
 */
export { inferArchetype };

export default router;
