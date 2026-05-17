import { Router, type IRouter } from "express";
import multer from "multer";
import { and, eq, asc, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { extractPdfToMarkdown } from "../lib/extract-drd";
import {
  db,
  cesTable,
  chartsTable,
  chartFeedbackTable,
  chartEditsTable,
  drdsTable,
  ideationMessagesTable,
  type Ce,
  type Chart,
  type IdeationMessage,
} from "@workspace/db";
import { CreateCeBody, GetCeParams } from "@workspace/api-zod";
import { generateCePayload, slugify } from "../lib/generate-ce";
import { LOCKED_CE_SLUGS } from "../lib/locked-ces";
import {
  CHART_ARCHETYPES,
  isKnownSubcategory,
  PageType as QbPageType,
  type ChartArchetypeId,
} from "@workspace/question-bank";
import { openai } from "../lib/openai";
import {
  runResearchPipeline,
  type ExistingChartSnapshot,
} from "../lib/research-pipeline";
import {
  loadRegenConstraints,
  parseFeedback,
  mergeConstraints,
} from "../lib/regen-constraints";

const router: IRouter = Router();

const RegenerateCeBody = z.object({
  feedback: z.string().trim().max(4000).optional(),
  pageType: QbPageType.optional(),
});

function inferSubcategoryId(ce: Ce): string {
  const raw = (ce.category || "").trim();
  if (raw && isKnownSubcategory(raw)) return raw;

  const haystack = `${ce.name} ${ce.category} ${ce.slug}`.toLowerCase();
  if (/\b(cruise|river|boat|thames|seine|canal)\b/.test(haystack)) {
    return "sightseeing_cruises";
  }
  if (/\b(gallery|museum|uffizi|accademia|louvre|vatican)\b/.test(haystack)) {
    return "museums";
  }
  if (/\b(colosseum|tower|landmark|monument|palace)\b/.test(haystack)) {
    return "landmarks";
  }
  if (/\b(day trip|day-trip|excursion)\b/.test(haystack)) {
    return "day_trips";
  }
  return raw || "landmarks";
}

function serializeCe(
  ce: Ce,
  chartCount: number,
  draftCount = 0,
  publishedCount = chartCount,
  drdUpdatedAt: Date | null = null,
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
    drdUpdatedAt: drdUpdatedAt ? drdUpdatedAt.toISOString() : null,
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
    status: chart.status,
    provenance: chart.provenance ?? null,
    lastEditedByWriterAt: chart.lastEditedByWriterAt
      ? chart.lastEditedByWriterAt.toISOString()
      : null,
    interactive: chart.interactive,
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

function serializeIdeation(m: IdeationMessage) {
  return {
    id: m.id,
    ceId: m.ceId,
    role: m.role,
    content: m.content,
    proposals: m.proposals ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

router.get("/ces", async (req, res): Promise<void> => {
  // `drdUpdatedAt` is joined via a correlated subquery (rather than a second
  // leftJoin) so the chart aggregate row-count isn't multiplied by per-CE
  // DRD rows. MAX is safe because there's at most one DRD per ceSlug today.
  const rows = await db
    .select({
      ce: cesTable,
      chartCount: sql<number>`COALESCE(COUNT(${chartsTable.id})::int, 0)`,
      draftCount: sql<number>`COALESCE(COUNT(${chartsTable.id}) FILTER (WHERE ${chartsTable.status} = 'draft')::int, 0)`,
      publishedCount: sql<number>`COALESCE(COUNT(${chartsTable.id}) FILTER (WHERE ${chartsTable.status} = 'published')::int, 0)`,
      drdUpdatedAt: sql<Date | null>`(SELECT MAX(${drdsTable.updatedAt}) FROM ${drdsTable} WHERE ${drdsTable.ceSlug} = ${cesTable.slug})`,
    })
    .from(cesTable)
    .leftJoin(chartsTable, eq(chartsTable.ceId, cesTable.id))
    .groupBy(cesTable.id)
    .orderBy(asc(cesTable.name));

  res.json(
    rows.map(({ ce, chartCount, draftCount, publishedCount, drdUpdatedAt }) =>
      serializeCe(
        ce,
        Number(chartCount),
        Number(draftCount),
        Number(publishedCount),
        drdUpdatedAt ? new Date(drdUpdatedAt) : null,
      ),
    ),
  );
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

  let draftCount = 0;
  let publishedCount = 0;
  for (const c of charts) {
    if (c.status === "draft") draftCount += 1;
    else if (c.status === "published") publishedCount += 1;
  }

  res.json({
    ce: serializeCe(ce, charts.length, draftCount, publishedCount),
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
  const body = RegenerateCeBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
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

  const [drd] = await db
    .select()
    .from(drdsTable)
    .where(eq(drdsTable.ceSlug, ce.slug));

  if (drd?.markdown?.trim()) {
    const priorRows = await db
      .select()
      .from(chartsTable)
      .where(eq(chartsTable.ceId, ce.id))
      .orderBy(asc(chartsTable.sortOrder));

    // Aggregate per-chart feedback + edit counts so the selector's
    // enriched snapshot carries severity context, not just chart-type.
    const enrichment = await loadChartEnrichment(priorRows.map((r) => r.id));
    const feedbackNotesByChart = new Map<number, string[]>();
    if (priorRows.length > 0) {
      const fb = await db
        .select()
        .from(chartFeedbackTable)
        .where(
          inArray(
            chartFeedbackTable.chartId,
            priorRows.map((r) => r.id),
          ),
        );
      for (const f of fb) {
        if (f.status !== "open" && f.status !== "escalated") continue;
        if (!f.note?.trim()) continue;
        const arr = feedbackNotesByChart.get(f.chartId) ?? [];
        arr.push(f.note.trim());
        feedbackNotesByChart.set(f.chartId, arr);
      }
    }

    const archetypeSet = new Set(Object.keys(CHART_ARCHETYPES));
    const existingCharts: ExistingChartSnapshot[] = priorRows.map((r) => {
      const e = enrichment.get(r.id);
      const prov =
        r.provenance && typeof r.provenance === "object"
          ? (r.provenance as Record<string, unknown>)
          : null;
      const topicId =
        prov && typeof prov["topic_id"] === "string"
          ? (prov["topic_id"] as string)
          : undefined;
      const insight = (r.insight ?? "").split(/[.!?]/)[0]?.trim() || undefined;
      const specDigest = JSON.stringify(r.spec ?? {}).slice(0, 320);
      const notes = (feedbackNotesByChart.get(r.id) ?? [])
        .join(" | ")
        .slice(0, 240);
      return {
        question: r.question,
        chartType: r.chartType,
        status: r.status,
        archetype: archetypeSet.has(r.chartType)
          ? (r.chartType as ChartArchetypeId)
          : undefined,
        ...(topicId ? { topicId } : {}),
        ...(insight ? { insight } : {}),
        specDigest,
        feedback: {
          editCount: e?.editCount ?? 0,
          issue: e?.topFeedbackSeverity ?? null,
          ...(notes ? { note: notes } : {}),
        },
      };
    });

    // Parse this click's feedback, merge with whatever we persisted from
    // a prior regen run on the same CE, and derive retire signals from
    // chronically-weak prior charts.
    const stored = loadRegenConstraints(ce.regenConstraints);
    const { parsed: incoming, honored: parserNotes } = parseFeedback(
      body.data.feedback,
    );
    const merged = mergeConstraints(stored, incoming);

    // Retire-topic signal: any prior chart with rating ≤ 2 OR a high-
    // severity issue OR ≥ 2 edits AND a topic_id is treated as
    // chronically weak. The selector drops candidates carrying that
    // topic this run.
    const retireTopics = new Set<string>();
    const retireArchetypes = new Set<ChartArchetypeId>();
    for (const snap of existingCharts) {
      const fb = snap.feedback;
      const weak =
        (fb?.issue === "high") ||
        ((fb?.editCount ?? 0) >= 2 && (fb?.note?.length ?? 0) > 0);
      if (!weak) continue;
      if (snap.topicId) retireTopics.add(snap.topicId.toLowerCase());
      // Only retire the archetype outright when the issue is "wrong_data"
      // (severity high) — otherwise the topic-level retire is enough.
      if (fb?.issue === "high" && snap.archetype) {
        retireArchetypes.add(snap.archetype);
      }
    }

    let result;
    try {
      result = await runResearchPipeline({
        ce: { name: ce.name, city: ce.city, country: ce.country, slug: ce.slug },
        subcategoryId: inferSubcategoryId(ce),
        drdMarkdown: drd.markdown,
        regenerationFeedback: body.data.feedback,
        existingCharts,
        regenConstraints: merged,
        retireTopics: Array.from(retireTopics),
        retireArchetypes: Array.from(retireArchetypes),
        pageType: body.data.pageType,
      });
    } catch (err) {
      req.log.error({ err }, "Research regeneration failed");
      res.status(502).json({
        error:
          err instanceof Error
            ? `Research regeneration failed: ${err.message}`
            : "Research regeneration failed",
      });
      return;
    }

    try {
      const persisted = await db.transaction(async (tx) => {
        await tx
          .delete(chartsTable)
          .where(
            and(
              eq(chartsTable.ceId, ce.id),
              eq(chartsTable.status, "draft"),
            ),
          );

        const publishedCount = await tx.$count(
          chartsTable,
          and(
            eq(chartsTable.ceId, ce.id),
            eq(chartsTable.status, "published"),
          ),
        );

        const [updated] = await tx
          .update(cesTable)
          .set({
            summary: result.summary,
            emoji: result.emoji,
            status: publishedCount > 0 ? ce.status : "draft",
            regenConstraints: merged as unknown as Record<string, unknown>,
          })
          .where(eq(cesTable.id, ce.id))
          .returning();
        if (!updated) throw new Error("Failed to update CE");

        const draftSortBase = 1000;
        const insertedCharts = await tx
          .insert(chartsTable)
          .values(
            result.charts.map((c, idx) => ({
              ceId: ce.id,
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

        return { ce: updated, charts: insertedCharts, publishedKept: publishedCount };
      });

      // Combine the parser-side honored bullets (rule matches that fired
      // even when no chart needed dropping) with the selector-side
      // honored bullets (constraints actually applied during selection)
      // so the writer sees the union.
      const honoredFeedback = Array.from(
        new Set([
          ...parserNotes,
          ...result.regen_summary.honoredFeedback,
        ]),
      );

      res.json({
        ce: serializeCe(
          persisted.ce,
          persisted.publishedKept + persisted.charts.length,
          persisted.charts.length,
          persisted.publishedKept,
        ),
        charts: persisted.charts.map((c) => serializeChart(c)),
        publishedChartsKept: persisted.publishedKept,
        droppedQuestions: result.dropped_questions,
        proposedHeroQuestions: result.proposed_hero_questions,
        regenSummary: {
          honoredFeedback,
          suppressedArchetypes: result.regen_summary.suppressedArchetypes,
          retiredTopics: result.regen_summary.retiredTopics,
          priorDeckOverlap: result.regen_summary.priorDeckOverlap,
          priorDeckSize: result.regen_summary.priorDeckSize,
          storedConstraints: merged,
        },
      });
    } catch (err) {
      req.log.error({ err }, "Failed to persist research regeneration");
      res.status(500).json({
        error:
          err instanceof Error
            ? `Failed to persist regenerated drafts: ${err.message}`
            : "Failed to persist regenerated drafts",
      });
    }
    return;
  }

  let payload;
  try {
    payload = await generateCePayload({
      name: ce.name,
      city: ce.city,
      country: ce.country,
      category: ce.category,
      regenerationFeedback: body.data.feedback,
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

/* -------------------------------------------------------------------------- */
/* Ideation chatbot — per-CE conversation log + OpenAI assistant turns         */
/* -------------------------------------------------------------------------- */

const ideationBody = z.object({
  message: z.string().min(1).max(4000),
  writerId: z.string().max(120).optional(),
  contextText: z.string().max(200_000).optional(),
});

const ideationUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.get("/ces/:slug/ideation", async (req, res): Promise<void> => {
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
  const rows = await db
    .select()
    .from(ideationMessagesTable)
    .where(eq(ideationMessagesTable.ceId, ce.id))
    .orderBy(asc(ideationMessagesTable.id));
  res.json(rows.map(serializeIdeation));
});

router.delete("/ces/:slug/ideation", async (req, res): Promise<void> => {
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
  await db
    .delete(ideationMessagesTable)
    .where(eq(ideationMessagesTable.ceId, ce.id));
  res.sendStatus(204);
});

router.post(
  "/ces/:slug/ideation",
  ideationUpload.single("contextPdf"),
  async (req, res): Promise<void> => {
  const params = GetCeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = ideationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
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

  // Optional one-shot context (text paste + PDF upload). Not persisted —
  // we fold it into the LLM call only and store just the user's typed
  // message in the transcript so future turns don't re-pay the token cost.
  let pdfText = "";
  if (req.file) {
    try {
      pdfText = await extractPdfToMarkdown(req.file.buffer);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Could not read PDF",
      });
      return;
    }
  }
  const turnContextParts: string[] = [];
  if (parsed.data.contextText && parsed.data.contextText.trim()) {
    turnContextParts.push(
      `[Pasted context]\n${parsed.data.contextText.trim().slice(0, 60_000)}`,
    );
  }
  if (pdfText) {
    turnContextParts.push(
      `[PDF: ${req.file?.originalname ?? "context.pdf"}]\n${pdfText.slice(
        0,
        60_000,
      )}`,
    );
  }
  const turnContext = turnContextParts.join("\n\n");

  // Persist the user turn first so the transcript stays consistent even
  // if the LLM call later fails. We persist the typed message only — the
  // attached context is one-shot.
  const userContentForStorage =
    turnContextParts.length > 0
      ? `${parsed.data.message}\n\n_(attached ${turnContextParts.length} context source${
          turnContextParts.length === 1 ? "" : "s"
        })_`
      : parsed.data.message;
  await db.insert(ideationMessagesTable).values({
    ceId: ce.id,
    role: "user",
    content: userContentForStorage,
  });

  if (!openai) {
    const fallback = `OpenAI is not configured on this server, so I can't help ideate. Set AI_INTEGRATIONS_OPENAI_* env vars and try again.`;
    const [stored] = await db
      .insert(ideationMessagesTable)
      .values({ ceId: ce.id, role: "assistant", content: fallback })
      .returning();
    if (!stored) {
      res.status(500).json({ error: "Failed to store fallback message" });
      return;
    }
    res.json(serializeIdeation(stored));
    return;
  }

  const [drd] = await db
    .select()
    .from(drdsTable)
    .where(eq(drdsTable.ceSlug, ce.slug));
  const charts = await db
    .select({
      slug: chartsTable.slug,
      question: chartsTable.question,
      chartType: chartsTable.chartType,
      status: chartsTable.status,
    })
    .from(chartsTable)
    .where(eq(chartsTable.ceId, ce.id));

  const transcript = await db
    .select()
    .from(ideationMessagesTable)
    .where(eq(ideationMessagesTable.ceId, ce.id))
    .orderBy(asc(ideationMessagesTable.id));

  const archetypeMenu = Object.values(CHART_ARCHETYPES)
    .map((a) => `- ${a.id}: ${a.label} — ${a.answers}`)
    .join("\n");

  const systemPrompt = `You are Headout's chart-ideation partner for the Viz Studio writer.
Your job is NARROW: help shape ideas for data visualizations on the listing page for "${ce.name}" (${ce.city}, ${ce.country}).

You can:
- Propose 2-3 chart ideas with a clear visitor question, the right archetype, and one-line rationale.
- Critique a draft idea and suggest a sharper question.
- Recommend which existing archetype best fits an idea.

You MUST NOT:
- Invent new chart archetypes (only the ones in the menu).
- Edit subcategory base questions.
- Help with anything outside chart ideation for this CE.

Available archetypes:
${archetypeMenu}

Existing chart deck for this CE:
${charts.length > 0 ? charts.map((c) => `- [${c.status}] ${c.chartType}: ${c.question}`).join("\n") : "(empty)"}

Deep Research Doc (excerpt):
${(drd?.markdown ?? "(no DRD uploaded)").slice(0, 8000)}

When you propose chart ideas, also output a JSON block at the very end like:
\`\`\`json
{ "proposals": [ { "topic": "...", "archetype": "<one of the ids>", "rationale": "..." } ] }
\`\`\`
If you're not proposing anything (just discussing), omit the block.

Sentence case for all visitor-facing copy. Keep replies under 200 words.`;

  // Inject one-shot turn context into the LAST user message we send to the
  // LLM (without mutating what's already persisted in the transcript).
  const llmTranscript = transcript.map((m) => ({
    role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
    content: m.content,
  }));
  if (turnContext && llmTranscript.length > 0) {
    const last = llmTranscript[llmTranscript.length - 1]!;
    if (last.role === "user") {
      last.content = `${turnContext}\n\n---\n\n${parsed.data.message}`;
    }
  }
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...llmTranscript,
  ];

  // Default to a real model supported by the AI Integrations OpenAI proxy
  // (gpt-5 is listed as a general-purpose chat model). Overridable via
  // env so prod can pin a newer family member without a redeploy.
  const ideationModel =
    process.env["IDEATION_MODEL"] ?? process.env["OPENAI_MODEL"] ?? "gpt-5";
  const parsedTimeout = Number(process.env["IDEATION_TIMEOUT_MS"]);
  const ideationTimeoutMs =
    Number.isFinite(parsedTimeout) && parsedTimeout > 0
      ? parsedTimeout
      : 45_000;
  const startedAt = Date.now();
  req.log.info(
    {
      ceSlug: ce.slug,
      model: ideationModel,
      hasContextText: Boolean(parsed.data.contextText?.trim()),
      hasPdf: Boolean(req.file),
      transcriptLen: transcript.length,
    },
    "ideation turn started",
  );

  let assistantText = "";
  let proposals: unknown = null;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), ideationTimeoutMs);
  try {
    const response = await openai.chat.completions.create(
      {
        model: ideationModel,
        max_completion_tokens: 800,
        messages,
      },
      { signal: abort.signal },
    );
    assistantText = response.choices[0]?.message?.content ?? "";
    const fence = assistantText.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (fence?.[1]) {
      try {
        const parsedJson = JSON.parse(fence[1]);
        if (parsedJson && typeof parsedJson === "object" && "proposals" in parsedJson) {
          proposals = (parsedJson as { proposals: unknown }).proposals;
        }
      } catch {
        // keep proposals null
      }
    }
    req.log.info(
      {
        ceSlug: ce.slug,
        model: ideationModel,
        durationMs: Date.now() - startedAt,
        proposalsCount: Array.isArray(proposals) ? proposals.length : 0,
      },
      "ideation turn finished",
    );
  } catch (err) {
    const aborted =
      abort.signal.aborted ||
      (err instanceof Error &&
        (err.name === "AbortError" || /aborted|timeout/i.test(err.message)));
    req.log.error(
      {
        err,
        ceSlug: ce.slug,
        model: ideationModel,
        durationMs: Date.now() - startedAt,
        timedOut: aborted,
      },
      "ideation turn failed",
    );
    const reason = aborted
      ? `timed out after ${Math.round(ideationTimeoutMs / 1000)}s`
      : err instanceof Error
        ? err.message
        : "unknown error";
    const fallback = `Sorry — the ideation model couldn't respond just now (${reason}). Try again in a moment.`;
    const [stored] = await db
      .insert(ideationMessagesTable)
      .values({ ceId: ce.id, role: "assistant", content: fallback })
      .returning();
    if (!stored) {
      res.status(502).json({ error: "Ideation failed" });
      return;
    }
    res.status(200).json(serializeIdeation(stored));
    return;
  } finally {
    clearTimeout(timer);
  }

  const [stored] = await db
    .insert(ideationMessagesTable)
    .values({
      ceId: ce.id,
      role: "assistant",
      content: assistantText || "(empty response)",
      proposals:
        Array.isArray(proposals) && proposals.length > 0
          ? (proposals as Record<string, unknown>[])
          : null,
    })
    .returning();
  if (!stored) {
    res.status(500).json({ error: "Failed to store assistant message" });
    return;
  }
  res.json(serializeIdeation(stored));
  },
);

export default router;
