/**
 * Research Pipeline v2
 *
 * Page-type-aware deck generator. For each requested page type:
 *   1. Build the deck skeleton with @workspace/page-decks (`buildDeck`).
 *   2. For each section whose chart isn't already covered by an existing
 *      chart on this CE, ask Gemini to generate the chart spec using the
 *      per-archetype prompts from @workspace/prompts.
 *   3. Ask Gemini for an editorial overlay (headline / subheadline / CTA /
 *      confidence / tip / warning) for the generated chart.
 *   4. Persist as a draft chart with `pageType` and `sectionId` so the v1
 *      pipeline output and curated/published charts are not disturbed.
 *
 * v2 runs ALONGSIDE v1 — it never deletes prior v1 rows. Toggle per-CE via
 * the `?v2=1` query param (or `useV2: true` in the request body) on the
 * existing `POST /api/research/generate-v2` route.
 */

import { and, eq } from "drizzle-orm";
import {
  db,
  cesTable,
  chartsTable,
  drdsTable,
  type Ce,
  type Chart,
} from "@workspace/db";
import {
  buildDeck,
  type CEIntelligence,
  type PageType,
  type ResolvedSection,
} from "@workspace/page-decks";
import {
  EDITORIAL_OVERLAY_PROMPT,
  getChartPrompt,
} from "@workspace/prompts";
import { ai } from "@workspace/integrations-gemini-ai";
import { logger } from "./logger";

const MODEL = "gemini-2.5-pro";

export interface PipelineV2Options {
  ceSlug: string;
  pageTypes: PageType[];
  /**
   * When true (default), reuse existing charts on the CE so already-generated
   * specs are not regenerated. When false, every section is generated fresh.
   */
  useExistingCharts?: boolean;
}

export interface PipelineV2SectionResult {
  pageType: PageType;
  sectionId: string;
  chartType: string;
  status: "generated" | "reused" | "skipped";
  chartId?: number;
  reason?: string;
}

export interface PipelineV2Result {
  ceSlug: string;
  pageTypes: PageType[];
  sections: PipelineV2SectionResult[];
}

function safeJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Some Gemini responses wrap JSON in ```json fences even when we asked
    // for application/json. Strip the most common offenders before bailing.
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced && fenced[1]) {
      try {
        return JSON.parse(fenced[1]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Adapter: build a CEIntelligence from what we actually have in the DB.
 * The CE schema doesn't carry rich signals yet, so we use conservative
 * defaults (matching the existing page-decks route).
 */
function buildIntelligence(ce: Ce): CEIntelligence {
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
 * Map the persisted chart shape into objects the deck builder can match
 * against — each entry carries a `questionId` so `buildDeck` can detect
 * "already covered" sections without re-calling Gemini.
 */
function projectChartsForDeck(charts: Chart[]) {
  return charts.flatMap((c) => {
    const ids = new Set<string>([c.chartType, c.slug].filter(Boolean));
    return Array.from(ids).map((qid) => ({
      ...(c.spec as Record<string, unknown>),
      questionId: qid,
    }));
  });
}

async function generateChartSpec(
  section: ResolvedSection,
  ce: Ce,
): Promise<Record<string, unknown> | null> {
  const promptTemplate = getChartPrompt(section.chartType);
  if (!promptTemplate) return null;

  const prompt = promptTemplate.replaceAll("{ceName}", ce.name);
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  });

  const raw = response.text ?? "";
  if (!raw) return null;
  return safeJson<Record<string, unknown>>(raw);
}

async function generateEditorialOverlay(
  section: ResolvedSection,
  pageType: PageType,
  ce: Ce,
  chartSpec: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const prompt = EDITORIAL_OVERLAY_PROMPT
    .replaceAll("{ceName}", ce.name)
    .replaceAll("{chartType}", section.chartType)
    .replaceAll("{pageType}", pageType)
    .replaceAll("{chartData}", JSON.stringify(chartSpec).slice(0, 8000))
    .replaceAll(
      "{ceData}",
      JSON.stringify({
        slug: ce.slug,
        name: ce.name,
        city: ce.city,
        country: ce.country,
        category: ce.category,
      }),
    )
    .replaceAll("{visitorContext}", "{}");

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      temperature: 0.5,
      maxOutputTokens: 2048,
    },
  });

  const raw = response.text ?? "";
  if (!raw) return null;
  return safeJson<Record<string, unknown>>(raw);
}

export async function runPipelineV2(
  options: PipelineV2Options,
): Promise<PipelineV2Result> {
  const { ceSlug, pageTypes } = options;
  const useExistingCharts = options.useExistingCharts ?? true;

  const [ce] = await db.select().from(cesTable).where(eq(cesTable.slug, ceSlug));
  if (!ce) throw new Error(`CE not found: ${ceSlug}`);

  const [drd] = await db
    .select()
    .from(drdsTable)
    .where(eq(drdsTable.ceSlug, ceSlug));

  const existingCharts = useExistingCharts
    ? await db.select().from(chartsTable).where(eq(chartsTable.ceId, ce.id))
    : [];
  const projectedExisting = projectChartsForDeck(existingCharts);
  const intelligence = buildIntelligence(ce);

  const results: PipelineV2SectionResult[] = [];
  const draftSortBase = 2000;
  let insertIndex = 0;

  for (const pageType of pageTypes) {
    let deck;
    try {
      deck = await buildDeck(
        intelligence,
        pageType,
        drd?.markdown ?? "",
        projectedExisting,
      );
    } catch (err) {
      logger.error(
        { err, ceSlug, pageType },
        "v2: buildDeck failed for page type",
      );
      continue;
    }

    // Clear any prior v2 drafts for this CE + pageType so re-runs don't
    // stack duplicates. Only ever touches `status='draft'` rows with this
    // exact `pageType` — published and v1 drafts are never affected.
    await db
      .delete(chartsTable)
      .where(
        and(
          eq(chartsTable.ceId, ce.id),
          eq(chartsTable.status, "draft"),
          eq(chartsTable.pageType, pageType),
        ),
      );

    for (const section of deck.sections) {
      const spec = section.chartSpec as
        | (Record<string, unknown> & { status?: string })
        | null;

      if (spec && spec.status !== "pending-generation") {
        results.push({
          pageType,
          sectionId: section.id,
          chartType: section.chartType,
          status: "reused",
        });
        continue;
      }

      let chartSpec: Record<string, unknown> | null = null;
      try {
        chartSpec = await generateChartSpec(section, ce);
      } catch (err) {
        logger.error(
          { err, ceSlug, pageType, sectionId: section.id },
          "v2: chart spec generation failed",
        );
      }

      if (!chartSpec) {
        results.push({
          pageType,
          sectionId: section.id,
          chartType: section.chartType,
          status: "skipped",
          reason: "no chart prompt available or model returned invalid JSON",
        });
        continue;
      }

      let editorial: Record<string, unknown> | null = null;
      try {
        editorial = await generateEditorialOverlay(
          section,
          pageType,
          ce,
          chartSpec,
        );
      } catch (err) {
        logger.warn(
          { err, ceSlug, pageType, sectionId: section.id },
          "v2: editorial overlay generation failed — saving without overlay",
        );
      }

      const editorialHeadline =
        (editorial && typeof editorial["headline"] === "string"
          ? (editorial["headline"] as string)
          : undefined) ?? section.editorial.headline;
      const editorialSubheadline =
        (editorial && typeof editorial["subheadline"] === "string"
          ? (editorial["subheadline"] as string)
          : undefined) ?? section.editorial.subheadline;

      const ensuredSpec: Record<string, unknown> = {
        ...chartSpec,
        type: chartSpec["type"] ?? section.chartType,
      };

      const [inserted] = await db
        .insert(chartsTable)
        .values({
          ceId: ce.id,
          slug: `${pageType}--${section.id}`,
          question: section.question.questionId,
          title: editorialHeadline,
          subtitle: editorialSubheadline,
          insight: "",
          chartType: section.chartType,
          spec: ensuredSpec,
          status: "draft",
          pageType,
          sectionId: section.id,
          editorial,
          provenance: {
            status: "v2_pipeline",
            page_type: pageType,
            section_id: section.id,
            archetype: section.archetype,
            question_id: section.question.questionId,
            ai_rationale: section.generationMetadata.aiRationale,
          },
          sortOrder: draftSortBase + insertIndex,
        })
        .returning();

      insertIndex += 1;
      results.push({
        pageType,
        sectionId: section.id,
        chartType: section.chartType,
        status: "generated",
        chartId: inserted?.id,
      });
    }
  }

  return { ceSlug, pageTypes, sections: results };
}
