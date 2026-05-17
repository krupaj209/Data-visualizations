import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  cesTable,
  chartsTable,
  drdsTable,
  type Chart,
} from "@workspace/db";
import {
  buildDeck,
  deckTemplates,
  PageType,
  type CEIntelligence,
  type PageType as PageTypeT,
} from "@workspace/page-decks";

const router: IRouter = Router();

const PAGE_TYPES = PageType.options;

function isPageType(v: string): v is PageTypeT {
  return (PAGE_TYPES as readonly string[]).includes(v);
}

/**
 * Adapter: build a CEIntelligence from what we actually have in the DB.
 *
 * The CE schema in this repo doesn't (yet) carry rich signals like
 * hasMultipleEntrances / hasSkipTheLine / typicalVisitDuration. Until those
 * fields exist on `cesTable` (or are derived from the DRD), we apply
 * conservative defaults so the scorer can run.
 */
function buildIntelligence(
  ce: typeof cesTable.$inferSelect,
): CEIntelligence {
  return {
    slug: ce.slug,
    name: ce.name,
    category: ce.category,
    visitorVolume: "high",
    hasSeasonalVariation: true,
    hasMultipleEntrances: false,
    hasSkipTheLine: true,
    hasAudioGuide: false,
    hasGuidedTours: false,
    hasRestrictedItems: true,
    hasAccessibilityNeeds: false,
    typicalVisitDurationMin: 60,
    typicalVisitDurationMax: 180,
    subProductCount: 1,
    drdConfidence: {
      timing: 0.8,
      duration: 0.7,
      logistics: 0.6,
      value: 0.7,
      experience: 0.5,
      context: 0.6,
      practical: 0.8,
      social: 0.5,
      navigation: 0.6,
    },
  };
}

/**
 * Map a real chart type (or curated slug) to the question-graph question IDs
 * that should reuse it. Several graph nodes use synthetic IDs that don't
 * match the chart types we actually persist, so without this aliasing the
 * builder would never find a match and the section would degrade to a
 * "pending-generation" stub even though we already have the chart.
 *
 * Keep this list small and explicit — only add an entry when we have a
 * real renderer for the chart type AND the question semantics line up.
 */
const CHART_TYPE_TO_QUESTION_IDS: Record<string, string[]> = {
  weekly_pattern: ["weekly_pattern"],
  hourly_heatmap: ["hourly_heatmap"],
  history_timeline: ["story_timeline"],
  ticket_ladder: ["ticket_ladder", "time_value_matrix"],
  duration_profiles: ["duration_stat"],
  entrance_lanes: ["queue_compare", "entrance_queue_map"],
};

/**
 * Adapter: the deck builder reuses an existing chart when it finds an entry
 * whose `questionId` matches the section's question. The returned object is
 * assigned directly into `section.chartSpec`, so it MUST be a valid chart
 * spec (i.e. carry a top-level `type`). We spread the persisted spec onto
 * the projection so the renderer sees the right shape; `questionId` is just
 * a lookup tag the builder strips by reference.
 */
function projectCharts(charts: Chart[]) {
  return charts.flatMap((c) => {
    const aliased = CHART_TYPE_TO_QUESTION_IDS[c.chartType] ?? [];
    const ids = new Set<string>(
      [c.chartType, c.slug, ...aliased].filter(Boolean),
    );
    return Array.from(ids).map((qid) => ({
      ...(c.spec as Record<string, unknown>),
      questionId: qid,
    }));
  });
}

// GET /api/page-decks/templates — list available page deck templates
router.get("/page-decks/templates", (_req, res) => {
  const templates = Object.values(deckTemplates).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    sectionCount: t.sections.length,
    minTotalSections: t.minTotalSections,
    maxTotalSections: t.maxTotalSections,
  }));
  // Dedup (some PageType ids fall back to the same template object today)
  const seen = new Set<string>();
  const unique = templates.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
  res.json({ templates: unique });
});

// GET /api/page-decks/:ceSlug/:pageType — build a deck for a CE + page type
router.get("/page-decks/:ceSlug/:pageType", async (req, res): Promise<void> => {
  const ceSlug = req.params["ceSlug"];
  const pageType = req.params["pageType"];

  if (!ceSlug || !pageType) {
    res.status(400).json({ error: "ceSlug and pageType are required" });
    return;
  }
  if (!isPageType(pageType)) {
    res.status(400).json({
      error: `Invalid pageType "${pageType}". Must be one of: ${PAGE_TYPES.join(", ")}`,
    });
    return;
  }

  try {
    const [ce] = await db
      .select()
      .from(cesTable)
      .where(eq(cesTable.slug, ceSlug));
    if (!ce) {
      res.status(404).json({ error: "CE not found" });
      return;
    }

    const [drd] = await db
      .select()
      .from(drdsTable)
      .where(eq(drdsTable.ceSlug, ceSlug));

    const charts = await db
      .select()
      .from(chartsTable)
      .where(eq(chartsTable.ceId, ce.id));

    const deck = await buildDeck(
      buildIntelligence(ce),
      pageType,
      drd?.markdown ?? "",
      projectCharts(charts),
    );
    res.json(deck);
  } catch (err) {
    req.log.error({ err, ceSlug, pageType }, "Failed to build page deck");
    res.status(500).json({
      error: "Failed to build deck",
      details: (err as Error).message,
    });
  }
});

export default router;
