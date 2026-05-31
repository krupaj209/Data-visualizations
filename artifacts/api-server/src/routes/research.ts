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
import {
  RATIFIED_HEADOUT_SUBCATEGORY_IDS,
  QUESTION_BUNDLES,
  CHART_ARCHETYPES,
  PAGE_TEMPLATES,
  SUBCATEGORY_IDS,
  bootstrapSignalsFromSubcategory,
  type BundleId,
} from "@workspace/question-bank";
import {
  listCategories as listHeadoutCategories,
  listSubcategories as listHeadoutSubcategories,
} from "@workspace/taxonomy";
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
  // Full Headout taxonomy — 16 categories / ~150 subcategories. The
  // `unratified` flag on each row is derived against the curated bundle
  // set in @workspace/question-bank so editors can see at a glance
  // which subcategories the assembler has hand-tuned coverage for vs
  // which fall back to the default bundle deck.
  const subcategories = listHeadoutSubcategories(
    RATIFIED_HEADOUT_SUBCATEGORY_IDS,
  );
  const categories = listHeadoutCategories(RATIFIED_HEADOUT_SUBCATEGORY_IDS);
  res.json({ categories, subcategories });
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

  // DRD is optional — the pipeline uses Gemini web search as grounding when
  // no DRD has been uploaded, and bootstraps signals from the subcategory id.
  const [drd] = await db.select().from(drdsTable).where(eq(drdsTable.ceSlug, slug));

  // Resolve or bootstrap the CE row.
  let [ce] = await db.select().from(cesTable).where(eq(cesTable.slug, slug));
  if (ce?.archivedAt) {
    // Archived rows are restore-only — refuse to generate charts
    // onto a soft-deleted CE so the new deck never lands somewhere
    // the default library view can't see.
    res.status(409).json({
      error: `CE "${slug}" is archived. Restore it before generating.`,
    });
    return;
  }
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
      drdMarkdown: drd?.markdown,
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

/* -------------------------------------------------------------------------- */
/* Question bank CSV export                                                   */
/* -------------------------------------------------------------------------- */

/** Wrap a cell value in quotes when it contains commas, quotes, or newlines. */
function csvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Build an inverted index: signal key → subcategory ids that fire it.
 * Computed once from bootstrapSignalsFromSubcategory so the export can derive
 * which subcategories actually trigger each signal-gated candidate rather than
 * relying on the archetype's broad `typical_subcategories` list.
 */
function buildSignalSubcatIndex(): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const subcatId of SUBCATEGORY_IDS) {
    const bootstrapped = bootstrapSignalsFromSubcategory(subcatId);
    for (const [signal, value] of Object.entries(bootstrapped)) {
      if (value === true) {
        if (!index.has(signal)) index.set(signal, []);
        index.get(signal)!.push(subcatId);
      }
    }
  }
  return index;
}

/**
 * Return the subcategory ids where a candidate with `requires` will actually
 * fire: intersection of subcategories that bootstrap ALL required signals.
 * Falls back to the archetype's `typical_subcategories` when `requires` is empty.
 */
function effectiveSubcatsForCandidate(
  requires: string[],
  archetypeTypical: string[],
  signalIndex: Map<string, string[]>,
): string[] {
  if (requires.length === 0) return archetypeTypical;
  // Intersection: subcategories that fire every required signal.
  const sets = requires.map((sig) => new Set(signalIndex.get(sig) ?? []));
  const first = sets[0];
  if (!first) return archetypeTypical;
  const result: string[] = [];
  for (const subcat of first) {
    if (sets.every((s) => s.has(subcat))) result.push(subcat);
  }
  // If the intersection is empty (no subcategory fires all required signals),
  // fall back to the archetype's typical subcategories so the column isn't blank.
  return result.length > 0 ? result : archetypeTypical;
}

/**
 * GET /api/research/question-bank/export
 *
 * Returns the full question bank as a UTF-8 CSV file. One row per bundle
 * candidate. Columns: subcategory, bundle, intent, archetype,
 * question_template, required_signals, preferred_signals, mandatory, page_types.
 *
 * - `subcategory`  — subcategories where this candidate actually fires (via
 *                    signal bootstrap intersection for gated candidates, or
 *                    archetype typical_subcategories for ungated ones)
 * - `mandatory`    — "yes" if the bundle slot is `required: true` in any page template
 * - `page_types`   — comma-separated page template ids where this bundle appears
 */
router.get("/research/question-bank/export", (_req, res): void => {
  // Build bundle → { pageTypes, hasMandatory } index from page templates.
  const bundleInfo = new Map<BundleId, { pageTypes: string[]; hasMandatory: boolean }>();
  for (const [ptId, template] of Object.entries(PAGE_TEMPLATES)) {
    for (const slot of template.slots) {
      if (!slot.bundleId) continue;
      const bid = slot.bundleId as BundleId;
      if (!bundleInfo.has(bid)) {
        bundleInfo.set(bid, { pageTypes: [], hasMandatory: false });
      }
      const entry = bundleInfo.get(bid)!;
      if (!entry.pageTypes.includes(ptId)) entry.pageTypes.push(ptId);
      if (slot.required) entry.hasMandatory = true;
    }
  }

  const signalSubcatIndex = buildSignalSubcatIndex();

  const header = [
    "subcategory",
    "bundle",
    "intent",
    "archetype",
    "question_template",
    "required_signals",
    "preferred_signals",
    "mandatory",
    "page_types",
  ].join(",");

  const rows: string[] = [header];

  for (const bundle of Object.values(QUESTION_BUNDLES)) {
    const info = bundleInfo.get(bundle.id as BundleId);
    const mandatory = info?.hasMandatory ? "yes" : "no";
    // page_types: comma-separated inside a quoted cell.
    const pageTypes = csvCell(info?.pageTypes.join(",") ?? "");

    for (const candidate of bundle.candidates) {
      const archEntry = CHART_ARCHETYPES[candidate.archetype];
      const effectiveSubcats = effectiveSubcatsForCandidate(
        candidate.requires ?? [],
        archEntry?.typical_subcategories ?? [],
        signalSubcatIndex,
      );
      const subcats = csvCell(effectiveSubcats.join(","));
      const requiredSigs = csvCell((candidate.requires ?? []).join(","));
      const preferredSigs = csvCell((candidate.prefers ?? []).join(","));

      rows.push(
        [
          subcats,
          csvCell(bundle.id),
          csvCell(bundle.intent),
          csvCell(candidate.archetype),
          csvCell(candidate.question_template),
          requiredSigs,
          preferredSigs,
          mandatory,
          pageTypes,
        ].join(","),
      );
    }
  }

  const csv = rows.join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="question-bank.csv"',
  );
  res.send(csv);
});

export default router;
