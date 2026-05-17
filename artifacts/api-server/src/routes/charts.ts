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
import {
  chartSpecSchema,
  hourlyHighlightCardsSchema,
  type ChartSpec,
  type HourlyHighlightCard,
} from "../lib/chart-spec";
import { ai } from "@workspace/integrations-gemini-ai";
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
import { LOCKED_CE_SLUGS, isLockedCe } from "../lib/locked-ces";
import {
  findDuplicateChart,
  type DedupeExistingChart,
} from "../lib/chart-dedupe";

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
    overlayHeadline: chart.overlayHeadline ?? null,
    overlaySubhead: chart.overlaySubhead ?? null,
    overlayInsight: chart.overlayInsight ?? null,
    presentation: chart.presentation ?? null,
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

const PRESENTATION_PALETTES = [
  "brand",
  "traffic",
  "mono",
  "cool",
  "warm",
  "high_contrast",
] as const;

const presentationSchema = z
  .object({
    palette: z.enum(PRESENTATION_PALETTES).optional(),
    direction: z.enum(["low_good", "low_bad"] as const).optional(),
    density: z.enum(["comfortable", "compact"] as const).optional(),
    view: z.string().max(40).optional(),
    emphasis: z.string().max(120).optional(),
  })
  .strict();

const updateBody = z.object({
  question: z.string().min(2).max(200).optional(),
  title: z.string().min(1).max(120).optional(),
  subtitle: z.string().max(200).optional(),
  insight: z.string().max(400).optional(),
  spec: z.unknown().optional(),
  interactive: z.boolean().optional(),
  // Editorial overlay copy — independent of spec.title/subtitle/insight.
  // Pass `null` or `""` to clear, any non-empty string to set.
  overlayHeadline: z.string().max(160).nullable().optional(),
  overlaySubhead: z.string().max(240).nullable().optional(),
  overlayInsight: z.string().max(500).nullable().optional(),
  // Task #151 — presentation overrides. Allowed on locked CEs.
  presentation: presentationSchema.nullable().optional(),
  writerId: z.string().max(120).optional(),
});

/**
 * Returns true if the parsed update body touches only render-time
 * presentation (Task #151). Such updates are allowed on locked CEs because
 * they never change the chart spec — only how it's drawn.
 */
function isPresentationOnlyUpdate(
  body: z.infer<typeof updateBody>,
): boolean {
  if (body.presentation === undefined) return false;
  const keys = Object.keys(body).filter(
    (k) => k !== "writerId" && k !== "presentation",
  );
  return keys.every(
    (k) => body[k as keyof typeof body] === undefined,
  );
}

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

  const [existingRow] = await db
    .select({ chart: chartsTable, ce: cesTable })
    .from(chartsTable)
    .innerJoin(cesTable, eq(cesTable.id, chartsTable.ceId))
    .where(eq(chartsTable.id, params.data.id));
  if (!existingRow) {
    res.status(404).json({ error: "Chart not found" });
    return;
  }
  const existing = existingRow.chart;

  // Task #151 — presentation-only updates are render-time overrides and
  // never modify the chart spec, so locked CEs allow them.
  if (
    LOCKED_CE_SLUGS.has(existingRow.ce.slug) &&
    !isPresentationOnlyUpdate(parsed.data)
  ) {
    res.status(409).json({
      error:
        "This CE has a hand-curated chart set and its charts cannot be edited.",
    });
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

  // Overlay copy is independent of spec/title/subtitle/insight. Treat empty
  // string the same as null (writers clear the field by deleting all text).
  if (parsed.data.overlayHeadline !== undefined) {
    const v = parsed.data.overlayHeadline;
    update.overlayHeadline = v && v.trim() ? v.trim() : null;
  }
  if (parsed.data.overlaySubhead !== undefined) {
    const v = parsed.data.overlaySubhead;
    update.overlaySubhead = v && v.trim() ? v.trim() : null;
  }
  if (parsed.data.overlayInsight !== undefined) {
    const v = parsed.data.overlayInsight;
    update.overlayInsight = v && v.trim() ? v.trim() : null;
  }

  if (parsed.data.presentation !== undefined) {
    // null or empty object → clear the column
    if (
      parsed.data.presentation === null ||
      Object.keys(parsed.data.presentation).length === 0
    ) {
      update.presentation = null;
    } else {
      update.presentation = parsed.data.presentation as Record<
        string,
        unknown
      >;
    }
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
/* POST /charts/:id/fact-reviews — writer review on a single fact-table row   */
/* DELETE /charts/:id/fact-reviews/:rowId — clear a writer's review decision  */
/* -------------------------------------------------------------------------- */

const factReviewBody = z.object({
  rowId: z.string().min(1).max(120),
  status: z.enum(["approved", "rejected", "needs_review"]),
  reason: z.string().max(800).optional(),
  claimOverride: z.string().max(400).optional(),
  valueOverride: z.string().max(400).optional(),
  writerId: z.string().max(120).optional(),
});

interface FactReviewEntry {
  status: "approved" | "rejected" | "needs_review";
  reason?: string;
  claim_override?: string;
  value_override?: string;
  reviewedAt: string;
  reviewedBy?: string;
}

function readFactReviews(
  provenance: unknown,
): Record<string, FactReviewEntry> {
  if (!provenance || typeof provenance !== "object") return {};
  const map = (provenance as { fact_reviews?: unknown }).fact_reviews;
  if (!map || typeof map !== "object" || Array.isArray(map)) return {};
  return map as Record<string, FactReviewEntry>;
}

router.post(
  "/charts/:id/fact-reviews",
  async (req, res): Promise<void> => {
    const params = GetChartParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = factReviewBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
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

    const reviews = { ...readFactReviews(chart.provenance) };
    const entry: FactReviewEntry = {
      status: parsed.data.status,
      reviewedAt: new Date().toISOString(),
    };
    if (parsed.data.reason !== undefined) entry.reason = parsed.data.reason;
    if (parsed.data.claimOverride !== undefined)
      entry.claim_override = parsed.data.claimOverride;
    if (parsed.data.valueOverride !== undefined)
      entry.value_override = parsed.data.valueOverride;
    if (parsed.data.writerId) entry.reviewedBy = parsed.data.writerId;
    reviews[parsed.data.rowId] = entry;

    const baseProv =
      chart.provenance && typeof chart.provenance === "object"
        ? (chart.provenance as Record<string, unknown>)
        : {};
    const nextProv = { ...baseProv, fact_reviews: reviews };

    const [updated] = await db
      .update(chartsTable)
      .set({ provenance: nextProv })
      .where(eq(chartsTable.id, chart.id))
      .returning();
    if (!updated) {
      res.status(500).json({ error: "Failed to persist fact review" });
      return;
    }

    await db.insert(chartEditsTable).values({
      chartId: chart.id,
      writerId: parsed.data.writerId ?? "anonymous",
      action: "fact_review",
      before: null,
      after: { rowId: parsed.data.rowId, ...entry },
      note: parsed.data.reason ?? null,
    });

    res.json(serializeChart(updated));
  },
);

router.delete(
  "/charts/:id/fact-reviews/:rowId",
  async (req, res): Promise<void> => {
    const params = GetChartParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const rowId = req.params["rowId"];
    if (!rowId) {
      res.status(400).json({ error: "rowId is required" });
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

    const reviews = { ...readFactReviews(chart.provenance) };
    if (!(rowId in reviews)) {
      res.json(serializeChart(chart));
      return;
    }
    delete reviews[rowId];

    const baseProv =
      chart.provenance && typeof chart.provenance === "object"
        ? (chart.provenance as Record<string, unknown>)
        : {};
    const nextProv: Record<string, unknown> = { ...baseProv };
    if (Object.keys(reviews).length === 0) {
      delete nextProv["fact_reviews"];
    } else {
      nextProv["fact_reviews"] = reviews;
    }

    const [updated] = await db
      .update(chartsTable)
      .set({ provenance: nextProv })
      .where(eq(chartsTable.id, chart.id))
      .returning();
    if (!updated) {
      res.status(500).json({ error: "Failed to clear fact review" });
      return;
    }

    await db.insert(chartEditsTable).values({
      chartId: chart.id,
      writerId: "anonymous",
      action: "fact_review_clear",
      before: null,
      after: { rowId },
      note: null,
    });

    res.json(serializeChart(updated));
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

/* POST /charts/:id/regenerate-suggested-content                              */
/* Fresh hourly_heatmap.highlight_cards via Gemini grounded in the CE's DRD. */
/* -------------------------------------------------------------------------- */

const SUGGESTED_CONTENT_MODEL = "gemini-2.5-pro";

router.post(
  "/charts/:id/regenerate-suggested-content",
  async (req, res): Promise<void> => {
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
    if (chart.chartType !== "hourly_heatmap") {
      res.status(422).json({
        error:
          "Suggested content regeneration is only supported for hourly_heatmap charts.",
      });
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
    const ce = row.ce;

    if (LOCKED_CE_SLUGS.has(ce.slug)) {
      res.status(409).json({
        error:
          "This CE has a hand-curated chart set; suggested content cannot be regenerated.",
      });
      return;
    }

    const [drd] = await db
      .select()
      .from(drdsTable)
      .where(eq(drdsTable.ceSlug, ce.slug));
    if (!drd) {
      res.status(412).json({
        error: `No DRD uploaded for "${ce.slug}". Upload one before regenerating suggested content.`,
      });
      return;
    }

    const existingSpec = chart.spec as Record<string, unknown>;
    const existingCards = Array.isArray(existingSpec.highlight_cards)
      ? (existingSpec.highlight_cards as HourlyHighlightCard[])
      : [];
    const drdBlock =
      drd.markdown.length > 14000
        ? drd.markdown.slice(0, 14000) + "\n\n…[truncated]"
        : drd.markdown;

    const prompt = `You are writing supplementary CMS copy for an hourly crowd heatmap on a Headout listing page for ${ce.name} (${ce.city}, ${ce.country}).

The heatmap itself shows hourly crowd intensity Mon–Sun. Underneath the chart, writers surface 3–6 short "highlight cards" — each a single concrete tip a visitor can act on (e.g. "Quietest hours: arrive before 10am Tue–Thu for the shortest waits").

Return a JSON object of shape:
{ "highlight_cards": [ { "kind": "...", "headline": "...", "detail": "..." }, ... ] }

Rules:
- 3 to 6 cards. Each "kind" must be one of: quietest_hours, best_photography, best_weather, fastest_entry, best_evening, best_off_season. Do NOT repeat a kind.
- "headline" ≤ 40 chars, sentence case, no trailing period, concrete (e.g. "Tue–Thu before 10am").
- "detail" ≤ 140 chars, one sentence, sentence case, ends with a period. Explain WHY in plain language the visitor can act on.
- Ground every card in the Deep Research Doc and the chart spec below. Do not invent facts (weather, prices, evening programmes) that the DRD doesn't support — drop that card kind instead.
- Headout voice: warm, confident, never academic. No marketing fluff.
- Output ONLY the JSON object, no markdown.

Current hourly_heatmap spec (for context — open/close hours, busy/quiet rows, best_window):
"""
${JSON.stringify(
  {
    open_hour: existingSpec.open_hour,
    close_hour: existingSpec.close_hour,
    best_window: existingSpec.best_window,
    rows: existingSpec.rows,
  },
  null,
  2,
)}
"""

Existing highlight cards (the writer asked for a fresh take — feel free to replace, reword, or change which kinds appear):
"""
${JSON.stringify(existingCards, null, 2)}
"""

Deep Research Doc:
"""
${drdBlock}
"""`;

    let parsedCards: HourlyHighlightCard[] | null = null;
    let lastError: string | null = null;
    for (let attempt = 0; attempt < 2 && !parsedCards; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: SUGGESTED_CONTENT_MODEL,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    attempt === 0
                      ? prompt
                      : `${prompt}\n\nThe previous response was invalid: ${lastError}. Regenerate the FULL JSON object, fixing the issues. Output ONLY the JSON object.`,
                },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
            temperature: 0.7,
            maxOutputTokens: 1536,
          },
        });
        const raw = (response.text ?? "").trim();
        if (!raw) {
          lastError = "empty response";
          continue;
        }
        let json: unknown;
        try {
          json = JSON.parse(raw);
        } catch {
          const fence = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
          if (!fence?.[1]) {
            lastError = "invalid JSON";
            continue;
          }
          try {
            json = JSON.parse(fence[1]);
          } catch {
            lastError = "invalid JSON";
            continue;
          }
        }
        const cards = (json as { highlight_cards?: unknown })?.highlight_cards;
        const check = hourlyHighlightCardsSchema
          .min(1)
          .safeParse(cards);
        if (!check.success) {
          lastError = check.error.issues
            .slice(0, 4)
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ");
          continue;
        }
        // Dedupe kinds: keep the first occurrence of each.
        const seen = new Set<string>();
        const deduped: HourlyHighlightCard[] = [];
        for (const card of check.data) {
          if (seen.has(card.kind)) continue;
          seen.add(card.kind);
          deduped.push(card);
        }
        if (deduped.length === 0) {
          lastError = "all cards dropped during dedupe";
          continue;
        }
        parsedCards = deduped;
      } catch (err) {
        req.log.error(
          { err, chartId: chart.id },
          "Gemini suggested-content regeneration failed",
        );
        lastError =
          err instanceof Error ? err.message : "Gemini call failed";
      }
    }

    if (!parsedCards) {
      res.status(502).json({
        error: `Suggested content regeneration failed: ${lastError ?? "unknown error"}`,
      });
      return;
    }

    const nextSpec = { ...existingSpec, highlight_cards: parsedCards };
    const specCheck = chartSpecSchema.safeParse(nextSpec);
    if (!specCheck.success) {
      res.status(502).json({
        error: `Regenerated cards produced an invalid spec: ${specCheck.error.issues
          .slice(0, 4)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")}`,
      });
      return;
    }

    try {
      const [updated] = await db
        .update(chartsTable)
        .set({ spec: specCheck.data as unknown as Record<string, unknown> })
        .where(eq(chartsTable.id, chart.id))
        .returning();
      if (!updated) {
        res
          .status(500)
          .json({ error: "Failed to persist regenerated suggested content" });
        return;
      }

      await db.insert(chartEditsTable).values({
        chartId: updated.id,
        writerId: "anonymous",
        action: "edit",
        before: { highlight_cards: existingCards },
        after: { highlight_cards: parsedCards },
        note: "regenerate suggested content",
      });

      res.json({
        chart: serializeChart(updated),
        ce: serializeCe(
          ce,
          Number(row.chartCount),
          Number(row.draftCount),
          Number(row.publishedCount),
        ),
      });
    } catch (err) {
      req.log.error(
        { err, chartId: chart.id },
        "Failed to persist regenerated suggested content",
      );
      res.status(500).json({
        error:
          err instanceof Error
            ? `Failed to persist: ${err.message}`
            : "Failed to persist regenerated suggested content",
      });
    }
  },
);

/* -------------------------------------------------------------------------- */
/* POST /charts/:id/merge-suggestion — fold a writer's new inputs into an     */
/* existing chart (companion to the duplicate-detection short-circuit on the  */
/* topic-to-chart create flow).                                                */
/* -------------------------------------------------------------------------- */

const mergeSuggestionBody = z.object({
  question: z.string().min(2).max(280).optional(),
  pastedData: z.string().max(20_000).optional(),
  sourceUrl: z.string().url().max(800).optional(),
  insight: z.string().max(400).optional(),
  subtitle: z.string().max(200).optional(),
  writerId: z.string().max(120).optional(),
});

router.post(
  "/charts/:id/merge-suggestion",
  async (req, res): Promise<void> => {
    const params = GetChartParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = mergeSuggestionBody.safeParse(req.body);
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
    const [ce] = await db
      .select()
      .from(cesTable)
      .where(eq(cesTable.id, existing.ceId));
    if (!ce) {
      res.status(404).json({ error: "CE not found for chart" });
      return;
    }
    if (isLockedCe(ce.slug)) {
      res.status(409).json({
        error:
          "This CE has a hand-curated chart set — its charts cannot be merged into. Use the existing chart as-is or create a separate one.",
      });
      return;
    }

    const hasAny =
      Boolean(parsed.data.question?.trim()) ||
      Boolean(parsed.data.subtitle?.trim()) ||
      Boolean(parsed.data.insight?.trim()) ||
      Boolean(parsed.data.sourceUrl?.trim()) ||
      Boolean(parsed.data.pastedData?.trim());
    if (!hasAny) {
      res.status(400).json({
        error:
          "No new content supplied — provide a refined question, source URL, pasted data, subtitle or insight.",
      });
      return;
    }

    const update: Partial<typeof chartsTable.$inferInsert> = {};
    if (parsed.data.question?.trim()) {
      update.question = parsed.data.question.trim();
    }
    if (parsed.data.subtitle?.trim()) {
      update.subtitle = parsed.data.subtitle.trim();
    }
    if (parsed.data.insight?.trim()) {
      update.insight = parsed.data.insight.trim();
    }

    const priorProvenance =
      (existing.provenance as ChartProvenance | null) ?? {
        status: "estimated",
        drd_snippets: [],
        web_sources: [],
        estimates: [],
        verifier_notes: "",
      };
    const mergedProvenance: ChartProvenance = { ...priorProvenance };

    // Dedupe-append the new source URL into provenance.web_sources.
    if (parsed.data.sourceUrl?.trim()) {
      const url = parsed.data.sourceUrl.trim();
      const sources = Array.isArray(mergedProvenance.web_sources)
        ? [...mergedProvenance.web_sources]
        : [];
      if (!sources.some((s) => s?.url === url)) {
        sources.push({ title: url, url });
      }
      mergedProvenance.web_sources = sources;
    }

    // When pasted data is supplied, re-run the per-archetype generator
    // against the merged inputs so the spec actually reflects the new
    // numbers. Fail loudly if regeneration throws — a silent copy/source-
    // only merge would lie to the writer about whether their numbers
    // were applied.
    if (parsed.data.pastedData?.trim()) {
      const [drd] = await db
        .select()
        .from(drdsTable)
        .where(eq(drdsTable.ceSlug, ce.slug));
      const drdParts: string[] = [];
      if (drd?.markdown) drdParts.push(drd.markdown);
      drdParts.push(
        `--- WRITER-PROVIDED DATA (treat as authoritative; merging into existing chart "${existing.title}") ---\n${parsed.data.pastedData.trim()}`,
      );
      if (parsed.data.sourceUrl?.trim()) {
        drdParts.push(`--- SOURCE LINK ---\n${parsed.data.sourceUrl.trim()}`);
      }
      // When pasted data is supplied, regeneration is the whole point of
      // the merge — fail loudly so the writer knows the new numbers
      // weren't applied. A partial copy/source merge would silently lie
      // to the writer about whether the spec reflects their data.
      let generated;
      try {
        generated = await generateOneChart(
          {
            ce: {
              name: ce.name,
              city: ce.city,
              country: ce.country,
              slug: ce.slug,
            },
            subcategoryId: ce.category,
            drdMarkdown: drdParts.join("\n\n"),
          },
          update.question ?? existing.question,
          existing.chartType as ChartArchetypeId,
        );
      } catch (err) {
        req.log.error(
          { err, chartId: existing.id },
          "merge-suggestion regeneration failed; rejecting merge",
        );
        res.status(502).json({
          error:
            err instanceof Error
              ? `Could not regenerate the chart with the pasted data: ${err.message}. Nothing was saved — try again, or drop the pasted data to merge just the copy/source.`
              : "Could not regenerate the chart with the pasted data. Nothing was saved — try again, or drop the pasted data to merge just the copy/source.",
        });
        return;
      }
      update.spec = generated.spec.spec;
      // Carry forward merge-relevant provenance from the regen.
      mergedProvenance.drd_snippets = [
        ...(mergedProvenance.drd_snippets ?? []),
        ...(generated.provenance.drd_snippets ?? []),
      ].slice(0, 12);
      mergedProvenance.estimates = generated.provenance.estimates ?? mergedProvenance.estimates;
      for (const s of generated.provenance.web_sources ?? []) {
        if (
          s?.url &&
          !mergedProvenance.web_sources?.some((w) => w.url === s.url)
        ) {
          mergedProvenance.web_sources = [
            ...(mergedProvenance.web_sources ?? []),
            s,
          ];
        }
      }
    }

    update.provenance = mergedProvenance as unknown as Record<string, unknown>;
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
        note: `merge-suggestion: ${parsed.data.question ?? "(no question)"}`,
      });

      res.json(serializeChart(updated));
    } catch (err) {
      req.log.error({ err }, "Failed to merge suggestion into chart");
      res.status(500).json({
        error:
          err instanceof Error
            ? `Failed to merge: ${err.message}`
            : "Failed to merge",
      });
    }
  },
);

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
  /**
   * Escape hatch — when true, skip the duplicate-detection short-circuit
   * and create the chart anyway. The new chart is stamped with
   * `provenance.kept_as_duplicate_of` so it doesn't get re-flagged.
   */
  force: z.boolean().optional(),
});

/**
 * Project a Drizzle chart row into the {@link DedupeExistingChart} shape
 * the dedupe helper consumes, pulling intent_id/bundle_id off the
 * provenance jsonb when present.
 */
function toDedupeChart(c: {
  id: number;
  slug: string;
  question: string;
  title: string;
  chartType: string;
  provenance: unknown;
}): DedupeExistingChart {
  const prov = (c.provenance ?? {}) as {
    intent_id?: string | null;
    bundle_id?: string | null;
  };
  return {
    id: c.id,
    slug: c.slug,
    question: c.question,
    title: c.title,
    chartType: c.chartType,
    intentId: prov.intent_id ?? null,
    bundleId: prov.bundle_id ?? null,
  };
}

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

  // Duplicate detection: always run. Without `force`, short-circuit with
  // a 409 `duplicate_of` payload so the UI can offer Open / Merge /
  // Create-anyway. With `force`, fall through but stamp
  // `kept_as_duplicate_of` on provenance so the chart isn't re-flagged.
  const ceCharts = await db
    .select({
      id: chartsTable.id,
      slug: chartsTable.slug,
      question: chartsTable.question,
      title: chartsTable.title,
      chartType: chartsTable.chartType,
      provenance: chartsTable.provenance,
    })
    .from(chartsTable)
    .where(eq(chartsTable.ceId, ce.id));
  const dupMatch = findDuplicateChart(
    { question: parsed.data.topic, archetype },
    ceCharts.map(toDedupeChart),
  );
  if (dupMatch && !parsed.data.force) {
    res.status(409).json({
      error: "duplicate_chart",
      duplicate_of: {
        chartId: dupMatch.chart.id,
        chartSlug: dupMatch.chart.slug,
        chartTitle: dupMatch.chart.title,
        chartType: dupMatch.chart.chartType,
        matchType: dupMatch.matchType,
        similarity: dupMatch.similarity,
        reason: dupMatch.reason,
        mergeAllowed: !isLockedCe(ce.slug),
      },
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
        ...(dupMatch
          ? { kept_as_duplicate_of: dupMatch.chart.id }
          : {}),
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
  if (/\broute|routes|stop|stops|pier|piers|landmark coverage|itinerary|covers|coverage\b/.test(t)) return "route_profile";
  if (/\bduration|how long|takes|spend|time budget|plan to spend\b/.test(t)) return "duration_stat";
  // Task #163: any line / lane / queue / entrance / fastest-door topic
  // routes to `entrance_lanes` (the canonical Accademia "Choose the right
  // entry lane" pattern). MUST run before the ticket_ladder regex below
  // so "skip the line" doesn't get caught as a ticket-tier question.
  if (/\b(lane|lanes|queue|queues|line|lines|wait|waits|entrance|entrances|gate|gates|door|doors|fastest entry|skip the line|skip-the-line|walk[- ]up|which entry|which entrance)\b/.test(t)) return "entrance_lanes";
  if (/\bticket|tier|price|pass\b/.test(t)) return "ticket_ladder";
  if (/\bzone|hall|wing|area|room|gallery|section\b/.test(t)) return "compare_zones";
  if (/\bshare|breakdown|split|percentage|percent of\b/.test(t)) return "donut_breakdown";
  if (/\bdate|calendar|next \d+ (weeks|months|days)\b/.test(t)) return "month_calendar";
  return null;
}

/**
 * Re-export so other modules can use it if they need to. (Keeps the
 * heuristic contained to this file and not duplicated in the UI.)
 */
export { inferArchetype };

export default router;
