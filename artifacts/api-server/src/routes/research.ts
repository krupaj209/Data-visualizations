import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  cesTable,
  chartsTable,
  drdsTable,
  type Ce,
  type Chart,
} from "@workspace/db";
import { listSubcategories } from "@workspace/question-bank";
import { runResearchPipeline } from "../lib/research-pipeline";
import { runPipelineV2 } from "../lib/research-pipeline-v2";
import { slugify } from "../lib/generate-ce";
import { isLockedCe } from "../lib/locked-ces";
import { PageType } from "@workspace/page-decks";
import { PageType as QbPageType } from "@workspace/question-bank";

const router: IRouter = Router();

const generateBody = z.object({
  ceSlug: z.string().min(1),
  subcategoryId: z.string().min(1),
  /** Optional CE bootstrap fields if the CE row doesn't exist yet. */
  name: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  category: z.string().optional(),
  /** Human label/description for long-tail (unknown) subcategory ids. */
  subcategoryLabel: z.string().optional(),
  subcategoryDescription: z.string().optional(),
  writerTopics: z.array(z.string()).optional(),
  pageType: QbPageType.optional(),
});

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

router.get("/research/subcategories", (_req, res): void => {
  res.json(listSubcategories());
});

router.post("/research/generate", async (req, res): Promise<void> => {
  const parsed = generateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { ceSlug, subcategoryId } = parsed.data;
  const slug = slugify(ceSlug);
  if (!slug) {
    res.status(400).json({ error: "ceSlug could not be normalised" });
    return;
  }

  // SOURCE OF TRUTH for "do not touch curated charts". Reject before
  // touching the DB so we can never wipe a hand-curated deck.
  if (isLockedCe(slug)) {
    res.status(409).json({
      error:
        "This CE has a hand-curated chart set and is locked from automated draft generation.",
    });
    return;
  }

  const [drd] = await db.select().from(drdsTable).where(eq(drdsTable.ceSlug, slug));
  if (!drd) {
    res.status(412).json({
      error: `No DRD uploaded for "${slug}". Upload one via POST /api/drds first.`,
    });
    return;
  }

  // Resolve or bootstrap the CE row.
  let [ce] = await db.select().from(cesTable).where(eq(cesTable.slug, slug));
  if (!ce) {
    if (!parsed.data.name || !parsed.data.city || !parsed.data.country) {
      res.status(400).json({
        error: `CE "${slug}" does not exist yet — provide name, city, country to bootstrap it.`,
      });
      return;
    }
    const [created] = await db
      .insert(cesTable)
      .values({
        slug,
        name: parsed.data.name,
        city: parsed.data.city,
        country: parsed.data.country,
        category: parsed.data.category ?? subcategoryId,
        summary: "",
        emoji: "📍",
        status: "draft",
      })
      .returning();
    if (!created) {
      res.status(500).json({ error: "Failed to bootstrap CE row" });
      return;
    }
    ce = created;
  }

  // Defence-in-depth: even if the locked-CE list drifts, never proceed
  // against a CE that already has published charts unless we can prove
  // we'll only touch its drafts.
  const ceId = ce.id;

  let result;
  try {
    result = await runResearchPipeline({
      ce: { name: ce.name, city: ce.city, country: ce.country, slug: ce.slug },
      subcategoryId,
      subcategoryLabel: parsed.data.subcategoryLabel,
      subcategoryDescription: parsed.data.subcategoryDescription,
      drdMarkdown: drd.markdown,
      writerTopics: parsed.data.writerTopics,
      pageType: parsed.data.pageType,
    });
  } catch (err) {
    req.log.error({ err }, "Research pipeline failed");
    res.status(502).json({
      error:
        err instanceof Error
          ? `Research pipeline failed: ${err.message}`
          : "Research pipeline failed",
    });
    return;
  }

  try {
    const persisted = await db.transaction(async (tx) => {
      // Coexistence with published charts: only ever delete prior DRAFT
      // rows for this CE. Published rows (status = "published") survive
      // so live embeds keep working while a writer iterates on a draft.
      // The published deck stays at sortOrder 0+; drafts are stacked
      // afterwards using a high base offset to avoid collisions in the
      // UI's ordered list.
      await tx
        .delete(chartsTable)
        .where(
          and(
            eq(chartsTable.ceId, ceId),
            eq(chartsTable.status, "draft"),
          ),
        );

      // Only flip the CE status to "draft" when it didn't already have a
      // published deck — otherwise leave whatever status it has so the
      // existing published embeds continue to render with the right state.
      const publishedCount = await tx.$count(
        chartsTable,
        and(
          eq(chartsTable.ceId, ceId),
          eq(chartsTable.status, "published"),
        ),
      );
      const nextCeStatus = publishedCount > 0 ? ce.status : "draft";

      const [updated] = await tx
        .update(cesTable)
        .set({
          summary: result.summary,
          emoji: result.emoji,
          status: nextCeStatus,
        })
        .where(eq(cesTable.id, ceId))
        .returning();
      if (!updated) throw new Error("Failed to update CE");

      const draftSortBase = 1000;
      const insertedCharts = await tx
        .insert(chartsTable)
        .values(
          result.charts.map((c, idx) => ({
            ceId,
            slug: c.slug,
            question: c.question,
            title: c.title,
            subtitle: c.subtitle,
            insight: c.insight,
            chartType: c.spec.type,
            spec: c.spec as unknown as Record<string, unknown>,
            status: "draft",
            provenance: {
              ...c.provenance,
              source_question: c.source_question,
              recommended_archetype: c.recommended_archetype,
            } as Record<string, unknown>,
            sortOrder: draftSortBase + idx,
          })),
        )
        .returning();
      return {
        ce: updated,
        charts: insertedCharts,
        publishedKept: publishedCount,
      };
    });

    res.status(201).json({
      ce: serializeCe(persisted.ce, persisted.charts.length),
      charts: persisted.charts.map(serializeChart),
      publishedChartsKept: persisted.publishedKept,
      droppedQuestions: result.dropped_questions,
      proposedHeroQuestions: result.proposed_hero_questions,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to persist research-pipeline result");
    res.status(500).json({
      error:
        err instanceof Error
          ? `Failed to persist draft deck: ${err.message}`
          : "Failed to persist draft deck",
    });
  }
});

// ─────────────────────────────────────────────────────────────
// Research pipeline v2 — page-type-aware deck generation
// ─────────────────────────────────────────────────────────────

const generateV2Body = z.object({
  ceSlug: z.string().min(1),
  pageTypes: z.array(PageType).min(1),
  useExistingCharts: z.boolean().optional(),
});

router.post("/research/generate-v2", async (req, res): Promise<void> => {
  // Allow toggling v2 via `?v2=1` for symmetry with the existing v1
  // route — if the flag is present and explicitly disabled, refuse.
  const v2Flag = req.query["v2"];
  if (v2Flag !== undefined && v2Flag !== "1" && v2Flag !== "true") {
    res.status(400).json({
      error:
        "Pipeline v2 is gated behind ?v2=1. Pass the flag (or omit it) to opt in.",
    });
    return;
  }

  const parsed = generateV2Body.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const slug = slugify(parsed.data.ceSlug);
  if (!slug) {
    res.status(400).json({ error: "ceSlug could not be normalised" });
    return;
  }

  if (isLockedCe(slug)) {
    res.status(409).json({
      error:
        "This CE has a hand-curated chart set and is locked from automated draft generation.",
    });
    return;
  }

  try {
    const result = await runPipelineV2({
      ceSlug: slug,
      pageTypes: parsed.data.pageTypes,
      useExistingCharts: parsed.data.useExistingCharts ?? true,
    });
    res.status(201).json(result);
  } catch (err) {
    req.log.error({ err, slug }, "Research pipeline v2 failed");
    res.status(502).json({
      error:
        err instanceof Error
          ? `Research pipeline v2 failed: ${err.message}`
          : "Research pipeline v2 failed",
    });
  }
});

export default router;
