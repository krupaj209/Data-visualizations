import { ai } from "@workspace/integrations-gemini-ai";
import {
  CHART_ARCHETYPES,
  assembleDeck,
  extractSignals,
  isImplementedArchetype,
  resolveSubcategoryMeta,
  DEFAULT_PAGE_TYPE,
  type AssembledDeck,
  type AssembledQuestion,
  type BankQuestion,
  type BankQuestionKind,
  type ChartArchetypeId,
  type ContextSignals,
  type OverrideAction,
  type OverrideSource,
  type PageType,
} from "@workspace/question-bank";
import { aiChartSchema, type AiChart } from "./chart-spec";
import { loadOverridesFor } from "./question-overrides";
import { ARCHETYPE_PROMPT } from "./chart-archetype-prompts";
import { openai } from "./openai";
import { logger } from "./logger";
import {
  getCeIntelligence,
  sliceIntelForArchetype,
  formatIntelFactsForPrompt,
  type CeIntelligenceView,
} from "./ce-intelligence";

const MODEL = "gemini-2.5-pro";
const VERIFIER_MODEL = "gpt-5.4";

export interface ResearchPipelineInput {
  ce: { name: string; city: string; country: string; slug: string };
  /**
   * Subcategory id. Known ids resolve to a curated bank; unknown ids are
   * accepted and bootstrapped as `unratified` (orchestrator runs with only
   * cross-cutting + DRD-derived hero questions).
   */
  subcategoryId: string;
  /** Optional human label/description for unknown long-tail subcategories. */
  subcategoryLabel?: string;
  subcategoryDescription?: string;
  drdMarkdown: string;
  /**
   * Optional writer-supplied topics that should be turned into hero
   * questions in addition to the curated bank.
   */
  writerTopics?: string[];
  /**
   * Writer feedback from a deck-level regeneration request. Used to steer
   * question selection away from stale/generic repeats.
   */
  regenerationFeedback?: string;
  /** Current deck snapshot so regenerate can intentionally diversify. */
  existingCharts?: ExistingChartSnapshot[];
  /**
   * Optional pre-loaded CE intelligence view. The orchestrator loads this
   * once and slices per archetype on each `generateOneChart` call.
   */
  intel?: CeIntelligenceView | null;
  /**
   * Optional persisted regen constraints (negative writer feedback) the
   * selector should honor. Shape is owned by `regen-constraints.ts` but
   * left loose here to avoid a cyclic import.
   */
  regenConstraints?: unknown;
  /**
   * Topic IDs (from prior charts' provenance) that should be retired this
   * run because of chronically weak feedback.
   */
  retireTopics?: string[];
  /**
   * Chart archetypes that should be suppressed entirely (e.g. because the
   * prior chart of that archetype got a high-severity "wrong data" flag).
   */
  retireArchetypes?: ChartArchetypeId[];
  /**
   * Listing-page surface this deck is being assembled for. Drives which
   * page template the bundle assembler walks. Defaults to plan-your-visit.
   */
  pageType?: PageType;
  /**
   * Pre-loaded override actions. If omitted, the pipeline loads both
   * layers from the DB itself using `subcategoryId` + `ce.slug`. Callers
   * that already have them in hand (tests, scripts) can short-circuit.
   */
  categoryOverrides?: OverrideAction[];
  ceOverrides?: OverrideAction[];
}

/**
 * Snapshot of a prior chart on a CE. Passed to the selector during
 * regeneration so it can intentionally diversify and honor retire signals.
 */
export interface ExistingChartSnapshot {
  question: string;
  chartType: string;
  status?: string | null;
  archetype?: ChartArchetypeId;
  topicId?: string;
  insight?: string;
  specDigest?: string;
  feedback?: {
    editCount: number;
    issue: string | null;
    note?: string;
  };
}

export interface ChartProvenance {
  status: "drd_grounded" | "web_grounded" | "estimated";
  drd_snippets: string[];
  web_sources: { title: string; url: string }[];
  estimates: { field: string; reasoning: string }[];
  verifier_notes: string;
  /** "standard" (S1-S4) or "signature" (subcat-specific). Optional for legacy rows. */
  kind?: BankQuestionKind;
  /** Shared id for questions that travel together (e.g. S1a/S1b → "crowd_timing"). */
  topic_id?: string;
  /**
   * IDs of CE-intelligence facts referenced when generating this chart.
   * Resolves back to facts in the `ce_intelligence` table for citations.
   */
  intelligence_refs?: string[];
  /** Bundle id this chart was assembled from (timing/duration/.../narrative). */
  bundle_id?: string;
  /** Visitor intent the bundle answers. */
  intent_id?: string;
  /** Bundle score at assembly time — surfaced in IntelPanel bundle chips. */
  bundle_score?: number;
  /** Signal keys that triggered/preferred the bundle. */
  triggering_signals?: string[];
  /** Page template the deck was built for. */
  page_type?: PageType;
  /**
   * Origin layer for the chart's question template — "code" (untouched
   * default), "category" (subcategory override), or "ce" (per-CE override).
   * Surfaced in the IntelPanel chart card so writers can tell at a glance
   * which charts they're editing through the override system.
   */
  override_source?: OverrideSource;
  /**
   * DB id of the override row that shaped this chart's question template.
   * Only set when `override_source` is "category" or "ce". Lets the
   * IntelPanel deep-link directly into the override editor.
   */
  override_id?: number;
  /**
   * ISO timestamp recorded when the research pipeline generated this
   * chart's spec + grounding. Used by the editorial overlay to surface
   * an accurate freshness badge to writers. Optional for back-compat
   * with legacy rows that predate Task #111.
   */
  generated_at?: string;
}

export interface GeneratedChart {
  spec: AiChart;
  provenance: ChartProvenance;
}

export interface ResearchChart extends AiChart {
  recommended_archetype: ChartArchetypeId;
  source_question: string;
  provenance: ChartProvenance;
}

export interface ResearchPipelineResult {
  summary: string;
  emoji: string;
  charts: ResearchChart[];
  /** Any question-bank entries the LLM declined to use, with reasons. */
  dropped_questions: { question: string; reason: string }[];
  /** Hero questions the LLM proposed in addition to the curated bank. */
  proposed_hero_questions: BankQuestion[];
  /** Per-run summary of how regen constraints + retire signals were honored. */
  regen_summary: {
    honoredFeedback: string[];
    suppressedArchetypes: string[];
    retiredTopics: string[];
    priorDeckOverlap: number;
    priorDeckSize: number;
  };
}

/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Pipeline-level override loader                                              */
/* -------------------------------------------------------------------------- */

/**
 * Resolve the active category + CE override actions for this pipeline run
 * and mutate `input` in place so downstream steps (`selectQuestions` →
 * `assembleDeck`) see them. Soft-fails: a DB error just falls back to
 * code defaults. Exported for unit testing the wiring contract.
 *
 * Skipped entirely when the caller already pre-populated the override
 * arrays (tests / scripts that want a deterministic deck).
 */
export async function resolvePipelineOverrides(
  input: ResearchPipelineInput,
): Promise<void> {
  if (
    input.categoryOverrides !== undefined ||
    input.ceOverrides !== undefined
  ) {
    return;
  }
  try {
    const loaded = await loadOverridesFor({
      ceSlug: input.ce.slug,
      subcategoryId: input.subcategoryId,
    });
    input.categoryOverrides = loaded.categoryActions;
    input.ceOverrides = loaded.ceActions;
  } catch (err) {
    logger.warn(
      { err, slug: input.ce.slug },
      "Could not load question overrides — pipeline will run with code defaults",
    );
    input.categoryOverrides = [];
    input.ceOverrides = [];
  }
}

/**
 * Merge an assembled question's intent + override metadata onto the
 * verifier-augmented provenance. Exported so the override contract
 * (override_source / override_id flowing into chart provenance) is
 * unit-testable without invoking the real Gemini pipeline.
 */
export function buildChartProvenance(
  sel: AssembledQuestion,
  verified: ChartProvenance,
  pageType: PageType,
): ChartProvenance {
  return {
    ...verified,
    kind: sel.kind,
    ...(sel.topic_id ? { topic_id: sel.topic_id } : {}),
    bundle_id: sel.bundle_id,
    intent_id: sel.intent_id,
    bundle_score: sel.bundle_score,
    triggering_signals: sel.triggering_signals,
    page_type: pageType,
    override_source: sel.override_source,
    ...(sel.override_id !== undefined ? { override_id: sel.override_id } : {}),
    generated_at: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/* Step 1 — Assemble the deck (deterministic intent-driven engine)             */
/* -------------------------------------------------------------------------- */

/**
 * Pipeline-internal alias for the assembler's output, augmented with the
 * tiny LLM-derived summary + emoji + proposed_hero suggestions. The
 * orchestrator only needs {summary, emoji, selected, dropped, proposed_hero,
 * page_type, signals, bundle_audit} — kept intentionally narrow so the
 * "selection.X" call sites further down stay simple.
 */
interface QuestionSelection {
  summary: string;
  emoji: string;
  selected: AssembledQuestion[];
  dropped: { question: string; reason: string }[];
  proposed_hero: BankQuestion[];
  signals: ContextSignals;
  page_type: PageType;
  bundle_audit: AssembledDeck["bundle_audit"];
}

function normalizeQuestionKey(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Tiny LLM call that produces ONLY the visitor-facing summary, the emoji,
 * and optional CE-specific hero question proposals. Selection itself is
 * deterministic via `assembleDeck` — the LLM never picks archetypes.
 *
 * Soft-fails: any error falls back to a generated default summary so the
 * pipeline still ships a deck.
 */
async function summarizeCe(
  input: ResearchPipelineInput,
  selected: AssembledQuestion[],
  signals: ContextSignals,
): Promise<{ summary: string; emoji: string; proposed_hero: BankQuestion[] }> {
  const ceLine = `${input.ce.name} (${input.ce.city}, ${input.ce.country})`;
  const selectedLines = selected
    .map((s) => `- [${s.bundle_id}] ${s.archetype}: ${s.question}`)
    .join("\n");
  const signalLines = Object.entries(signals)
    .filter(([k, v]) => k !== "sub_products" && k !== "typical_visit_minutes" && Boolean(v))
    .map(([k]) => `- ${k}`)
    .join("\n");

  const prompt = `You are summarising a Headout listing page deck.

CE: ${ceLine}

The intent-driven assembler already selected these charts (you do NOT pick — only summarise):
${selectedLines || "(no charts selected yet)"}

Context signals extracted from the DRD:
${signalLines || "(none)"}

Output STRICT JSON (no markdown):
{
  "summary": "2-sentence visitor-facing summary that names the CE, sentence case",
  "emoji": "one emoji",
  "proposed_hero": [
    { "question": "...", "recommended_archetype": "<one archetype id from the selected list above>", "kind": "signature", "notes": "one line" }
  ]
}

Rules:
- proposed_hero is OPTIONAL (0-2 entries). Only suggest hero questions if the DRD has direct, specific evidence beyond what the assembler already picked.
- Do NOT propose questions for archetypes not in the selected list above.
- Sentence case throughout.

Deep Research Doc:
"""
${truncate(input.drdMarkdown, 8000)}
"""`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.4,
        maxOutputTokens: 2048,
      },
    });
    const raw = response.text ?? "";
    const parsed = safeJson<{
      summary?: string;
      emoji?: string;
      proposed_hero?: BankQuestion[];
    }>(raw);
    return {
      summary:
        parsed?.summary?.trim() ||
        `${input.ce.name} — research-grounded deck.`,
      emoji: parsed?.emoji?.trim() || "📍",
      proposed_hero: Array.isArray(parsed?.proposed_hero)
        ? parsed!.proposed_hero
            .filter(
              (p): p is BankQuestion =>
                !!p &&
                typeof p.question === "string" &&
                typeof p.recommended_archetype === "string",
            )
            .slice(0, 2)
        : [],
    };
  } catch (err) {
    logger.warn(
      { err, slug: input.ce.slug },
      "CE summariser LLM call failed; using fallback summary",
    );
    return {
      summary: `${input.ce.name} — research-grounded deck.`,
      emoji: "📍",
      proposed_hero: [],
    };
  }
}

async function selectQuestions(
  input: ResearchPipelineInput,
): Promise<QuestionSelection> {
  // Resolve subcategory meta (back-compat lookup; long-tail/unknown ids OK).
  resolveSubcategoryMeta(
    input.subcategoryId,
    input.subcategoryLabel,
    input.subcategoryDescription,
  );

  // (a) Deterministic signal extraction from the DRD. No LLM.
  const signals = extractSignals(input.drdMarkdown);

  // Build de-dup set from the existing deck so the assembler can prefer
  // a different archetype within the same bundle on regeneration.
  const existingArchetypes: ChartArchetypeId[] = (input.existingCharts ?? [])
    .map((c) => c.archetype)
    .filter((a): a is ChartArchetypeId => !!a);

  const pageType = input.pageType ?? DEFAULT_PAGE_TYPE;

  // (b) Walk the page template, score bundles, pick archetypes.
  const deck = assembleDeck({
    ceName: input.ce.name,
    signals,
    pageType,
    retireArchetypes: input.retireArchetypes,
    existingArchetypes,
    categoryOverrides: input.categoryOverrides,
    ceOverrides: input.ceOverrides,
  });

  // Regeneration: drop exact-question repeats vs the prior deck so
  // regenerate intentionally diversifies.
  const existingQuestionKeys = new Set(
    (input.existingCharts ?? []).map((c) => normalizeQuestionKey(c.question)),
  );
  const isRegen =
    (input.regenerationFeedback?.trim().length ?? 0) > 0 ||
    (input.existingCharts?.length ?? 0) > 0;
  if (isRegen) {
    const survivors: AssembledQuestion[] = [];
    for (const sel of deck.selected) {
      if (existingQuestionKeys.has(normalizeQuestionKey(sel.question))) {
        deck.dropped.push({
          question: sel.question,
          reason:
            "regeneration_diversity: already exists in the prior deck — assembler reserved a more specific slot",
        });
        continue;
      }
      survivors.push(sel);
    }
    deck.selected = survivors;
  }

  logger.info(
    {
      slug: input.ce.slug,
      page_type: pageType,
      bundles_fired: deck.bundle_audit.filter((b) => b.fired).map((b) => b.bundle_id),
      kept: deck.selected.length,
      dropped: deck.dropped.length,
    },
    "Research pipeline: deck assembled",
  );

  if (deck.selected.length === 0) {
    throw new Error(
      "Intent-driven assembler kept zero charts. Check that the DRD has enough signal coverage for the page template.",
    );
  }

  // (c) Tiny LLM call for summary + emoji + proposed_hero.
  const { summary, emoji, proposed_hero } = await summarizeCe(
    input,
    deck.selected,
    signals,
  );

  return {
    summary,
    emoji,
    selected: deck.selected,
    dropped: deck.dropped,
    proposed_hero,
    signals,
    page_type: pageType,
    bundle_audit: deck.bundle_audit,
  };
}

/* -------------------------------------------------------------------------- */
/* Step 2 — Generate one chart spec, grounded in the DRD + web search          */
/* -------------------------------------------------------------------------- */

export interface GeneratedChart {
  spec: AiChart;
  provenance: ChartProvenance;
}

/**
 * Two-step grounded JSON helper.
 *
 * Gemini rejects the combination of `responseMimeType: "application/json"`
 * with the `googleSearch` tool ("controlled generation is not supported with
 * Search tool"). To get BOTH grounding and a strict JSON spec, we split
 * each grounded chart-generation into two calls:
 *
 *   1. Research call — `googleSearch` tool ON, free-form text out. The
 *      response carries grounding metadata (the actual source URLs Gemini
 *      consulted) which we surface into `provenance.web_sources`.
 *   2. Spec call — `responseMimeType: "application/json"`, no tools. Takes
 *      the research brief from step 1 plus the DRD and produces strict JSON.
 *
 * Returns the parsed spec JSON, the raw research-brief text, and the
 * research response so callers can run grounding sources through
 * `normalizeProvenance`.
 */
async function groundedJsonCall<T>(args: {
  /** Free-form prompt for the grounded research step (web search ON). */
  researchPrompt: string;
  /** Builds the JSON-mode spec prompt given the research brief. */
  buildSpecPrompt: (researchBrief: string) => string;
  /** Token budget for the spec call. */
  specMaxTokens?: number;
  /** Token budget for the research call. */
  researchMaxTokens?: number;
  /** Spec-call temperature (defaults to 0.5). */
  specTemperature?: number;
  /**
   * Optional spec-step retry. Receives the raw spec text and parsed JSON
   * (or null) and returns either a follow-up prompt to try again with, or
   * null when the result is acceptable. Only the spec call is retried — the
   * research step is reused.
   */
  retry?: (
    rawText: string,
    parsed: T | null,
    researchBrief: string,
  ) => string | null;
}): Promise<{
  parsed: T;
  rawText: string;
  researchBrief: string;
  researchResponse: unknown;
}> {
  // Step 1: grounded research (free-form text out, googleSearch ON).
  const researchResponse = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: args.researchPrompt }] }],
    config: {
      temperature: 0.4,
      maxOutputTokens: args.researchMaxTokens ?? 2048,
      tools: [{ googleSearch: {} }],
    },
  });
  const researchBrief = (researchResponse.text ?? "").trim();
  // Soft-fail: an empty brief is still usable — the spec step can lean on
  // the DRD alone. We log so writers can spot grounding gaps.
  if (!researchBrief) {
    logger.warn(
      "groundedJsonCall: research step returned empty brief; spec step will run DRD-only",
    );
  }

  // Step 2: strict-JSON spec call (no tools, responseMimeType set).
  const specPrompt = args.buildSpecPrompt(researchBrief);
  const specResponse = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: specPrompt }] }],
    config: {
      responseMimeType: "application/json",
      temperature: args.specTemperature ?? 0.5,
      maxOutputTokens: args.specMaxTokens ?? 6144,
    },
  });
  let rawText = specResponse.text ?? "";
  let parsed = safeJson<T>(rawText);

  // Optional one-shot retry of just the spec step.
  if (args.retry) {
    const retryPrompt = args.retry(rawText, parsed, researchBrief);
    if (retryPrompt) {
      const retryResp = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: retryPrompt }] }],
        config: {
          responseMimeType: "application/json",
          temperature: Math.max(0.2, (args.specTemperature ?? 0.5) - 0.2),
          maxOutputTokens: args.specMaxTokens ?? 6144,
        },
      });
      rawText = retryResp.text ?? "";
      parsed = safeJson<T>(rawText);
    }
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Grounded JSON call produced invalid JSON");
  }

  return {
    parsed: parsed as T,
    rawText,
    researchBrief,
    researchResponse,
  };
}

export async function generateOneChart(
  input: ResearchPipelineInput,
  question: string,
  archetype: ChartArchetypeId,
): Promise<GeneratedChart> {
  const archetypeBlock = ARCHETYPE_PROMPT[archetype];
  const today = new Date().toISOString().slice(0, 10);
  const drdBlock = truncate(input.drdMarkdown, 14000);
  const intelSlice = sliceIntelForArchetype(input.intel ?? null, archetype);
  const intelBlock =
    intelSlice.facts.length > 0
      ? `

CE Intelligence facts (use ONLY when grounding a numeric or named claim — capture each fact id you used in provenance.intelligence_refs):
${formatIntelFactsForPrompt(intelSlice.facts)}`
      : "";

  const researchPrompt = `Gather the live numeric facts needed to answer this visitor question for ${input.ce.name} (${input.ce.city}, ${input.ce.country}).

Question: "${question}"
Target chart archetype: ${archetype}

Use Google Search to surface the most current authoritative numbers (operator pages, official ticketing sites, recent reviews/news). Look for the specific quantitative facts the archetype needs — for example:
- weekly_pattern: which weekday is busiest/quietest, any closed days
- hourly_heatmap: opening/closing hours, peak-of-day window
- booking_window: how far ahead tickets typically sell out
- seasonal_curve / month_calendar: monthly visitation/weather/price trend
- ticket_ladder / savings_breakdown: current ticket tiers and prices in local currency
- compare_zones / queue_compare: typical waits per entrance/zone
- duration_*: typical visit duration ranges
- stat_grid: top 3-6 headline numbers visitors care about
- and so on for the other archetypes

Return a SHORT research brief (8-15 bullet lines) of CURRENT facts you actually grounded via search. Format each line as:
- <fact, with the specific number> (source domain)

If the DRD below already covers a fact, you can still confirm it with search but prefer to call out anything that contradicts the DRD. If search returned nothing useful for some fields, say so explicitly so the spec step knows to estimate.

Today is ${today}.

Deep Research Doc (for context only — do NOT just copy from this; the goal is to ground/refresh from live web sources):
"""
${drdBlock}
"""`;

  const buildSpecPrompt = (researchBrief: string) => `Design a SINGLE chart that answers this visitor question for ${input.ce.name}.

Question: "${question}"
Required archetype: ${archetype}

Chart-spec schema for this archetype (fill EVERY required field exactly):
${archetypeBlock}

Grounding rules (very important):
1. PREFER numbers from the Deep Research Doc below. When you use a fact from the DRD, capture the exact phrase you used in provenance.drd_snippets.
2. If the DRD doesn't cover it but a CE Intelligence fact does, use that fact and capture its id in provenance.intelligence_refs.
3. If neither covers it BUT the Live Web Findings below do, use the web finding and capture the source URL/domain in provenance.web_sources (with a short title).
4. If none of the above cover it, produce an HONEST estimate a Headout local guide would broadly agree with — and explicitly list which fields you estimated in provenance.estimates with a one-line reasoning.
5. Set provenance.status to "drd_grounded" if every numeric field came from the DRD; "web_grounded" if at least one came from the live web findings or an intelligence fact; "estimated" otherwise.
6. Do NOT invent specific weather scores, price scores, or visitor-mix percentages — leave optional fields blank rather than fabricate. Required fields can use estimates with reasoning.

Output STRICT JSON (no markdown), shape:
{
  "chart": {
    "slug": "kebab-case",
    "question": "${escape(question)}",
    "title": "2-5 word internal title, sentence case",
    "subtitle": "one short clarifying line, sentence case",
    "insight": "single most useful one-sentence takeaway, sentence case",
    "spec": { ...the archetype spec from above... }
  },
  "provenance": {
    "status": "drd_grounded" | "web_grounded" | "estimated",
    "drd_snippets": ["..."],
    "web_sources": [{ "title": "...", "url": "https://..." }],
    "estimates": [{ "field": "spec.days[3].score", "reasoning": "..." }],
    "intelligence_refs": ["<fact id>", ...],
    "verifier_notes": ""
  }
}

Today is ${today} (use as the start_date for month_calendar).
${intelBlock}

Live Web Findings (from a fresh google search — treat as authoritative for any fact the DRD doesn't cover):
"""
${researchBrief || "(no live findings — rely on the DRD)"}
"""

Deep Research Doc:
"""
${drdBlock}
"""`;

  const result = await groundedJsonCall<{
    chart: unknown;
    provenance?: ChartProvenance;
  }>({
    researchPrompt,
    buildSpecPrompt,
    specTemperature: 0.6,
    specMaxTokens: 6144,
    retry: (_raw, parsed, researchBrief) => {
      // Validate to decide whether to retry.
      if (!parsed) {
        return null; // already handled by caller — will throw below
      }
      const chartParsed = aiChartSchema.safeParse(parsed.chart);
      if (chartParsed.success) return null;
      const issues = chartParsed.error.issues
        .slice(0, 6)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      // Rebuild the spec prompt with the SAME research brief so retry doesn't
      // lose grounding context (each generateContent call is stateless).
      return `${buildSpecPrompt(researchBrief)}\n\nThe previous response was invalid: ${issues}\n\nRegenerate the FULL JSON, fixing the issues. Output ONLY the JSON object.`;
    },
  });

  const chartParsed = aiChartSchema.safeParse(result.parsed.chart);
  if (!chartParsed.success) {
    const issues = chartParsed.error.issues
      .slice(0, 6)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(
      `Chart generation failed schema for ${archetype}: ${issues}`,
    );
  }

  return {
    spec: chartParsed.data,
    // Pull grounding metadata from the RESEARCH response (the call where
    // googleSearch actually ran). The spec call has no tools, so its
    // response carries no groundingMetadata.
    provenance: normalizeProvenance(
      result.parsed.provenance,
      result.researchResponse,
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Step 2b — Grouped generation for the S1 crowd_timing pair                  */
/* -------------------------------------------------------------------------- */

/**
 * One Gemini call that returns BOTH the weekly_pattern and hourly_heatmap
 * specs for the same CE, so the two views of "when do the crowds show?"
 * stay numerically consistent (e.g. if Monday is the weekly low, the
 * Monday row of the heatmap should agree).
 *
 * Falls back to two independent `generateOneChart` calls if the grouped
 * call fails to produce both valid specs.
 */
export async function generateCrowdTimingPair(
  input: ResearchPipelineInput,
  weeklyQuestion: string,
  hourlyQuestion: string,
): Promise<{ weekly: GeneratedChart; hourly: GeneratedChart }> {
  const weeklyBlock = ARCHETYPE_PROMPT["weekly_pattern"];
  const hourlyBlock = ARCHETYPE_PROMPT["hourly_heatmap"];
  const today = new Date().toISOString().slice(0, 10);
  const drdBlock = truncate(input.drdMarkdown, 14000);

  const researchPrompt = `Gather the live numeric facts needed to answer "when do the crowds show?" for ${input.ce.name} (${input.ce.city}, ${input.ce.country}). The findings will feed TWO charts that MUST be numerically consistent — a weekly pattern (Mon-Sun crowd levels) AND an hourly heatmap (24-hour crowd intensity per weekday).

Use Google Search to surface CURRENT facts (operator pages, official ticketing sites, recent reviews/news). Specifically look for:
- Opening and closing hours (and any closed days of the week)
- Which weekday is busiest and which is quietest
- The peak time(s) of day, and any reliable quiet windows (e.g. first-thing morning, late afternoon)
- Any seasonal/day-specific quirks worth flagging (free admission days, late nights, group surges)

Return a SHORT research brief (8-15 bullets) of CURRENT facts you actually grounded. Format:
- <fact, with the specific number/day/hour> (source domain)

If the DRD already covers a fact, still confirm it with search and call out anything that contradicts. If search returned nothing useful for a field, say so explicitly.

Today is ${today}.

Deep Research Doc (context only):
"""
${drdBlock}
"""`;

  const buildSpecPrompt = (researchBrief: string) => `Design TWO charts that together answer "when do the crowds show?" for ${input.ce.name}. They MUST be numerically consistent — the weekly view's quietest day should be the heatmap's quietest day, opening hours should match, etc.

Question A (weekly view): "${weeklyQuestion}"
Required archetype A: weekly_pattern
Schema A:
${weeklyBlock}

Question B (hourly view): "${hourlyQuestion}"
Required archetype B: hourly_heatmap
Schema B:
${hourlyBlock}

Grounding rules (apply to BOTH charts):
1. PREFER numbers from the Deep Research Doc below. Capture the exact phrase you used in provenance.drd_snippets.
2. If the DRD doesn't cover it BUT the Live Web Findings below do, use the web finding and capture the source URL/domain in provenance.web_sources.
3. Otherwise produce an HONEST estimate a Headout local guide would broadly agree with — list which fields you estimated in provenance.estimates.
4. Set provenance.status to "drd_grounded" if every numeric field came from the DRD; "web_grounded" if at least one came from the live web findings; "estimated" otherwise.
5. The two charts MUST agree: same opening/closing hours, same weekly pattern (the quietest day in A is the quietest row in B).

Output STRICT JSON (no markdown), shape:
{
  "weekly": {
    "chart": { "slug": "kebab-case", "question": "...", "title": "...", "subtitle": "...", "insight": "...", "spec": { ...weekly_pattern spec... } },
    "provenance": { "status": "...", "drd_snippets": [...], "web_sources": [...], "estimates": [...], "verifier_notes": "" }
  },
  "hourly": {
    "chart": { "slug": "kebab-case", "question": "...", "title": "...", "subtitle": "...", "insight": "...", "spec": { ...hourly_heatmap spec... } },
    "provenance": { "status": "...", "drd_snippets": [...], "web_sources": [...], "estimates": [...], "verifier_notes": "" }
  }
}

Today is ${today}.

Live Web Findings (from a fresh google search — treat as authoritative for any fact the DRD doesn't cover):
"""
${researchBrief || "(no live findings — rely on the DRD)"}
"""

Deep Research Doc:
"""
${drdBlock}
"""`;

  type PairShape = {
    weekly?: { chart: unknown; provenance?: ChartProvenance };
    hourly?: { chart: unknown; provenance?: ChartProvenance };
  };

  const result = await groundedJsonCall<PairShape>({
    researchPrompt,
    buildSpecPrompt,
    specTemperature: 0.5,
    specMaxTokens: 8192,
    retry: (_raw, parsed, researchBrief) => {
      if (!parsed?.weekly?.chart || !parsed?.hourly?.chart) {
        return `${buildSpecPrompt(researchBrief)}\n\nThe previous response was missing one of the required {weekly, hourly} entries. Regenerate the FULL JSON with BOTH entries present. Output ONLY the JSON object.`;
      }
      const w = aiChartSchema.safeParse(parsed.weekly.chart);
      const h = aiChartSchema.safeParse(parsed.hourly.chart);
      if (
        w.success &&
        h.success &&
        w.data.spec.type === "weekly_pattern" &&
        h.data.spec.type === "hourly_heatmap"
      ) {
        return null;
      }
      const issues: string[] = [];
      if (!w.success) {
        issues.push(
          "weekly: " +
            w.error.issues
              .slice(0, 4)
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; "),
        );
      } else if (w.data.spec.type !== "weekly_pattern") {
        issues.push(`weekly.spec.type must be "weekly_pattern"`);
      }
      if (!h.success) {
        issues.push(
          "hourly: " +
            h.error.issues
              .slice(0, 4)
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; "),
        );
      } else if (h.data.spec.type !== "hourly_heatmap") {
        issues.push(`hourly.spec.type must be "hourly_heatmap"`);
      }
      return `${buildSpecPrompt(researchBrief)}\n\nThe previous response was invalid: ${issues.join(" | ")}\n\nRegenerate the FULL JSON, fixing the issues. Output ONLY the JSON object.`;
    },
  });

  const parsed = result.parsed;
  if (!parsed?.weekly?.chart || !parsed?.hourly?.chart) {
    throw new Error("Crowd-timing pair generation produced malformed JSON");
  }

  const weeklyChart = aiChartSchema.safeParse(parsed.weekly.chart);
  const hourlyChart = aiChartSchema.safeParse(parsed.hourly.chart);
  if (!weeklyChart.success || !hourlyChart.success) {
    throw new Error("Crowd-timing pair failed schema validation");
  }
  if (
    weeklyChart.data.spec.type !== "weekly_pattern" ||
    hourlyChart.data.spec.type !== "hourly_heatmap"
  ) {
    throw new Error("Crowd-timing pair returned wrong spec types");
  }

  return {
    weekly: {
      spec: weeklyChart.data,
      provenance: normalizeProvenance(
        parsed.weekly.provenance,
        result.researchResponse,
      ),
    },
    hourly: {
      spec: hourlyChart.data,
      provenance: normalizeProvenance(
        parsed.hourly.provenance,
        result.researchResponse,
      ),
    },
  };
}

function normalizeProvenance(
  raw: ChartProvenance | undefined,
  geminiResponse: unknown,
): ChartProvenance {
  const out: ChartProvenance = {
    status: raw?.status ?? "estimated",
    drd_snippets: Array.isArray(raw?.drd_snippets) ? raw!.drd_snippets : [],
    web_sources: Array.isArray(raw?.web_sources) ? raw!.web_sources : [],
    estimates: Array.isArray(raw?.estimates) ? raw!.estimates : [],
    verifier_notes: typeof raw?.verifier_notes === "string" ? raw!.verifier_notes : "",
    ...(Array.isArray(raw?.intelligence_refs)
      ? {
          intelligence_refs: (raw!.intelligence_refs as unknown[]).filter(
            (x): x is string => typeof x === "string",
          ),
        }
      : {}),
  };

  // Pull any Google-search grounding sources Gemini surfaced on the response
  // and merge them into web_sources so writers can see the real citations.
  const grounded = extractGroundingSources(geminiResponse);
  for (const g of grounded) {
    if (!out.web_sources.find((s) => s.url === g.url)) {
      out.web_sources.push(g);
    }
  }
  if (out.web_sources.length > 0 && out.status === "estimated") {
    out.status = "web_grounded";
  }
  return out;
}

interface GroundingChunk {
  web?: { uri?: string; title?: string };
}

function extractGroundingSources(
  resp: unknown,
): { title: string; url: string }[] {
  // Gemini SDK shape: response.candidates[0].groundingMetadata.groundingChunks[]
  // Defensive walk — schema occasionally shifts across SDK versions.
  const candidates = (resp as { candidates?: unknown[] } | undefined)
    ?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  const meta = (candidates[0] as { groundingMetadata?: unknown })
    ?.groundingMetadata;
  const chunks = (meta as { groundingChunks?: unknown[] } | undefined)
    ?.groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const out: { title: string; url: string }[] = [];
  for (const c of chunks as GroundingChunk[]) {
    if (c?.web?.uri) {
      out.push({
        title: c.web.title ?? c.web.uri,
        url: c.web.uri,
      });
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Step 3 — OpenAI verification pass                                           */
/* -------------------------------------------------------------------------- */

export interface VerifierStructuredResult {
  verified: boolean;
  issues: string[];
  suggestions: string[];
  /**
   * Optional full chart-spec the verifier proposes as a fix. The route
   * layer must re-validate this with `chartSpecSchema` before persisting
   * — the verifier is encouraged to produce one when it can but is not
   * required to.
   */
  suggestedSpec: unknown | null;
  verifier_notes: string;
}

/**
 * Like `verifyChart`, but returns the structured verifier output instead of
 * collapsing it into a single string. Used by the on-demand verify endpoint
 * so the UI can render issues/suggestions cleanly and offer an "apply
 * suggested spec" action.
 */
export async function verifyChartStructured(
  input: ResearchPipelineInput,
  chart: AiChart,
): Promise<VerifierStructuredResult> {
  if (!openai) {
    return {
      verified: true,
      issues: [],
      suggestions: [],
      suggestedSpec: null,
      verifier_notes: "skipped: openai not configured",
    };
  }

  // Fresh web check (Step 3a). Before handing the chart to the OpenAI
  // verifier, ask Gemini with `googleSearch` enabled to surface live
  // findings about the question for THIS CE — what current operator
  // pages, recent reviews, and ticketing sites say. This catches
  // staleness the DRD alone would miss (e.g. a price changed last
  // month, a closure was added, hours shifted). Soft-fails on any
  // error so the verifier still runs.
  let webFindings = "(no fresh web findings — google search unavailable)";
  try {
    const findingsResp = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Search the live web for the most current information about this question for ${input.ce.name} (${input.ce.city}, ${input.ce.country}):

Question: "${chart.question}"

Return 3-6 short bullet points of CURRENT facts you found (with the source domain in parentheses). Focus on numbers, prices, hours, closures, or seasonal patterns that would be relevant to fact-checking a chart answering this question. Do NOT speculate — only report what you actually found via search. If search returned nothing useful, say so.

Today is ${new Date().toISOString().slice(0, 10)}.`,
            },
          ],
        },
      ],
      config: {
        temperature: 0.2,
        maxOutputTokens: 1024,
        tools: [{ googleSearch: {} }],
      },
    });
    const text = findingsResp.text?.trim();
    if (text) webFindings = text;
  } catch (err) {
    logger.warn(
      { err, slug: input.ce.slug },
      "Fresh-web pre-check failed; falling back to DRD-only verify",
    );
  }

  const prompt = `You are verifying a single Headout chart spec against a Deep Research Doc AND fresh web findings.

CE: ${input.ce.name} (${input.ce.city}, ${input.ce.country})
Question being answered: ${chart.question}

The chart spec (JSON):
${JSON.stringify(chart.spec)}

Cross-reference the spec against BOTH sources below. Look for any data points that CONTRADICT either the DRD or the fresh web findings, OR that are clearly wrong for this CE. Be strict but pragmatic — small rounding is fine, factual contradictions and stale numbers are not. If the fresh web findings disagree with the DRD on a numeric fact, prefer the fresh findings.

If you find at least one issue AND can confidently propose a corrected version, set "suggested_spec" to a FULL replacement spec object (same "type" as the original). The replacement must be complete and self-contained — the writer will be able to apply it with one click. If you can't confidently fix it, set "suggested_spec" to null.

Return JSON ONLY:
{
  "verified": true | false,
  "issues": ["one line per problem found"],
  "suggestions": ["one line per fix recommendation"],
  "suggested_spec": null | { "type": "${chart.spec.type}", ... }
}

Fresh web findings (Gemini + googleSearch, ${new Date().toISOString().slice(0, 10)}):
"""
${truncate(webFindings, 4000)}
"""

Deep Research Doc:
"""
${truncate(input.drdMarkdown, 12000)}
"""`;

  try {
    const response = await openai.chat.completions.create({
      model: VERIFIER_MODEL,
      max_completion_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const text = response.choices[0]?.message?.content ?? "{}";
    const parsed = safeJson<{
      verified?: boolean;
      issues?: string[];
      suggestions?: string[];
      suggested_spec?: unknown;
    }>(text);
    const issues = parsed?.issues ?? [];
    const suggestions = parsed?.suggestions ?? [];
    const verified = !!parsed?.verified && issues.length === 0;
    const notes = verified
      ? "verifier: ok"
      : `verifier: ${issues.length} issue(s)` +
        (issues.length > 0 ? ` — ${issues.join(" | ")}` : "") +
        (suggestions.length > 0
          ? ` | suggestions: ${suggestions.join(" | ")}`
          : "");
    return {
      verified,
      issues,
      suggestions,
      suggestedSpec: parsed?.suggested_spec ?? null,
      verifier_notes: notes,
    };
  } catch (err) {
    logger.warn({ err }, "OpenAI verifier (structured) failed");
    return {
      verified: false,
      issues: [],
      suggestions: [],
      suggestedSpec: null,
      verifier_notes: `verifier failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}

export async function verifyChart(
  input: ResearchPipelineInput,
  chart: AiChart,
  provenance: ChartProvenance,
): Promise<ChartProvenance> {
  if (!openai) {
    return { ...provenance, verifier_notes: "skipped: openai not configured" };
  }

  const prompt = `You are verifying a single Headout chart spec against a Deep Research Doc.

CE: ${input.ce.name} (${input.ce.city}, ${input.ce.country})
Question being answered: ${chart.question}

The chart spec (JSON):
${JSON.stringify(chart.spec)}

Author's provenance claims:
${JSON.stringify(provenance)}

Re-read the DRD below. Look for any data points in the spec that CONTRADICT the DRD or that are claimed as "drd_grounded" but are not actually supported. Be strict but pragmatic — small rounding is fine, factual contradictions are not.

Return JSON ONLY:
{
  "verified": true | false,
  "issues": ["one line per problem found"],
  "suggestions": ["one line per fix recommendation"]
}

Deep Research Doc:
"""
${truncate(input.drdMarkdown, 14000)}
"""`;

  try {
    const response = await openai.chat.completions.create({
      model: VERIFIER_MODEL,
      max_completion_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const text = response.choices[0]?.message?.content ?? "{}";
    const parsed = safeJson<{
      verified?: boolean;
      issues?: string[];
      suggestions?: string[];
    }>(text);
    const issues = parsed?.issues ?? [];
    const suggestions = parsed?.suggestions ?? [];
    const summary =
      parsed?.verified && issues.length === 0
        ? "verifier: ok"
        : `verifier: ${issues.length} issue(s)` +
          (issues.length > 0 ? ` — ${issues.join(" | ")}` : "") +
          (suggestions.length > 0
            ? ` | suggestions: ${suggestions.join(" | ")}`
            : "");
    return { ...provenance, verifier_notes: summary };
  } catch (err) {
    logger.warn({ err }, "OpenAI verifier failed; continuing without it");
    return {
      ...provenance,
      verifier_notes: `verifier failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Orchestrator                                                                */
/* -------------------------------------------------------------------------- */

export async function runResearchPipeline(
  input: ResearchPipelineInput,
): Promise<ResearchPipelineResult> {
  if (!input.drdMarkdown.trim()) {
    throw new Error("DRD is empty — upload one before running the pipeline.");
  }

  // Load DB-backed overrides once if not pre-supplied. Soft-fails: a
  // miss just means the pipeline runs with code defaults only. The
  // resolved actions are then forwarded into `assembleDeck` via
  // `selectQuestions` so writer edits (category- or CE-scope) shape the
  // questions Gemini is actually prompted with.
  await resolvePipelineOverrides(input);

  // Read intelligence layer once if not pre-supplied. Soft-fails: missing
  // intel just means the pipeline runs without it (DRD-only).
  if (input.intel === undefined) {
    try {
      input.intel = await getCeIntelligence(input.ce.slug);
    } catch (err) {
      logger.warn(
        { err, slug: input.ce.slug },
        "Could not load CE intelligence — pipeline will run without it",
      );
      input.intel = null;
    }
  }

  logger.info(
    { slug: input.ce.slug, subcategory: input.subcategoryId, intelFacts: input.intel?.facts.length ?? 0 },
    "Research pipeline: selecting questions",
  );
  const selection = await selectQuestions(input);

  const charts: ResearchChart[] = [];

  // Helper: assembler-derived provenance for one chart. Merges the
  // intent/bundle metadata from the assembled question with the
  // verifier-augmented provenance returned from Step 2/3. The
  // override_source / override_id fields ride through from the assembler
  // so writers can see which charts their override edits shaped.
  const buildProvenance = (
    sel: AssembledQuestion,
    verified: ChartProvenance,
  ): ChartProvenance =>
    buildChartProvenance(sel, verified, selection.page_type);

  /* ------- Grouped generation for the timing pair (weekly + hourly) ------- */
  // If the assembler happened to keep BOTH weekly_pattern AND hourly_heatmap
  // (rare — they're alternatives inside the same `timing` bundle, but a
  // future page template might pull both), emit them via a single Gemini
  // call so the two views stay numerically consistent. They are inserted
  // FIRST so they sit adjacent at the top of the deck.
  const weeklySel = selection.selected.find((s) => s.archetype === "weekly_pattern");
  const hourlySel = selection.selected.find((s) => s.archetype === "hourly_heatmap");
  const remaining = selection.selected.filter(
    (s) => s !== weeklySel && s !== hourlySel,
  );

  if (weeklySel && hourlySel) {
    try {
      logger.info(
        { slug: input.ce.slug, bundle: "timing" },
        "Research pipeline: generating timing pair (grouped)",
      );
      const pair = await generateCrowdTimingPair(
        input,
        weeklySel.question,
        hourlySel.question,
      );
      for (const [sel, gen] of [
        [weeklySel, pair.weekly] as const,
        [hourlySel, pair.hourly] as const,
      ]) {
        const verified = await verifyChart(input, gen.spec, gen.provenance);
        charts.push({
          ...gen.spec,
          recommended_archetype: sel.archetype,
          source_question: sel.question,
          provenance: buildProvenance(sel, verified),
        });
      }
    } catch (err) {
      logger.warn(
        { err, slug: input.ce.slug },
        "Timing-pair grouped generation failed; falling back to per-chart",
      );
      remaining.unshift(weeklySel, hourlySel);
    }
  } else if (weeklySel) {
    remaining.unshift(weeklySel);
  } else if (hourlySel) {
    remaining.unshift(hourlySel);
  }

  for (const sel of remaining) {
    // Belt-and-braces: never call Gemini for an unimplemented archetype.
    // assembleDeck already filters these out, but a stray entry from
    // proposed_hero or a future code path shouldn't slip through.
    if (!isImplementedArchetype(sel.archetype)) {
      selection.dropped.push({
        question: sel.question,
        reason: `viz_not_yet_built: archetype "${sel.archetype}" is reserved`,
      });
      continue;
    }
    try {
      logger.info(
        {
          slug: input.ce.slug,
          archetype: sel.archetype,
          question: sel.question,
          bundle_id: sel.bundle_id,
          intent_id: sel.intent_id,
        },
        "Research pipeline: generating chart",
      );
      const generated = await generateOneChart(
        input,
        sel.question,
        sel.archetype,
      );
      const verified = await verifyChart(
        input,
        generated.spec,
        generated.provenance,
      );
      charts.push({
        ...generated.spec,
        recommended_archetype: sel.archetype,
        source_question: sel.question,
        provenance: buildProvenance(sel, verified),
      });
    } catch (err) {
      logger.warn(
        { err, archetype: sel.archetype },
        "Research pipeline: skipping chart due to generation error",
      );
    }
  }

  if (charts.length === 0) {
    throw new Error(
      "Research pipeline produced zero valid charts. Check DRD content and try again.",
    );
  }

  // De-dupe slugs deterministically. With v3 we no longer enforce
  // uniqueness-by-archetype (e.g. two weekly_pattern charts can co-exist),
  // so suffix the archetype first, then a numeric counter if still colliding.
  const seenSlugs = new Set<string>();
  for (const c of charts) {
    let candidate = c.slug;
    if (seenSlugs.has(candidate)) {
      candidate = `${c.slug}-${c.recommended_archetype}`;
    }
    let n = 2;
    while (seenSlugs.has(candidate)) {
      candidate = `${c.slug}-${c.recommended_archetype}-${n++}`;
    }
    c.slug = candidate;
    seenSlugs.add(candidate);
  }

  const priorQuestionSet = new Set(
    (input.existingCharts ?? []).map((c) => normalizeQuestionKey(c.question)),
  );
  const priorDeckOverlap = charts.reduce(
    (n, c) => (priorQuestionSet.has(normalizeQuestionKey(c.source_question)) ? n + 1 : n),
    0,
  );

  return {
    summary: selection.summary || `${input.ce.name} — research-grounded deck.`,
    emoji: selection.emoji || "📍",
    charts,
    dropped_questions: selection.dropped,
    proposed_hero_questions: selection.proposed_hero,
    regen_summary: {
      honoredFeedback: [],
      suppressedArchetypes: (input.retireArchetypes ?? []).map(String),
      retiredTopics: input.retireTopics ?? [],
      priorDeckOverlap,
      priorDeckSize: input.existingCharts?.length ?? 0,
    },
  };
}

/**
 * Regenerate a SINGLE chart in place. Used by the per-chart regenerate
 * action in the Triage page. Reuses the same per-archetype prompt + DRD
 * grounding + OpenAI verifier as the full pipeline so the result is
 * comparable in quality.
 */
export async function regenerateSingleChart(args: {
  ce: { name: string; city: string; country: string; slug: string };
  question: string;
  archetype: ChartArchetypeId;
  drdMarkdown: string;
  feedback?: string;
  /**
   * Structured feedback from an inline "Send & regenerate" action on a
   * chart's feedback popover. Surfaced to the model as an explicit critique
   * block so the new spec actually responds to the writer's complaint.
   */
  feedbackContext?: {
    note?: string;
    issueCategory?: string;
  };
}): Promise<{ chart: AiChart; provenance: ChartProvenance }> {
  const input: ResearchPipelineInput = {
    ce: args.ce,
    subcategoryId: "single_chart_regen",
    drdMarkdown: args.drdMarkdown,
  };
  const ctxNote = args.feedbackContext?.note?.trim() ?? "";
  const ctxCategory = args.feedbackContext?.issueCategory?.trim() ?? "";
  const ctxBlock =
    ctxNote || ctxCategory
      ? `A writer flagged this chart${
          ctxCategory ? ` as \`${ctxCategory}\`` : ""
        }${ctxNote ? ` and wrote: "${ctxNote}"` : ""}. Address this critique directly in the new version — change layout, data shape, copy, or chart-specific knobs as needed so the new spec visibly fixes the complaint.`
      : "";
  const freeFeedback = args.feedback?.trim() ?? "";
  const combined = [ctxBlock, freeFeedback].filter(Boolean).join("\n\n");
  const question = combined
    ? `${args.question}\n\nWriter feedback to address in this regeneration:\n${combined}\n\nRegenerate this chart so it directly fixes that feedback while keeping the same visitor question and archetype unless the existing framing is the problem.`
    : args.question;
  const generated = await generateOneChart(input, question, args.archetype);
  const provenance = await verifyChart(input, generated.spec, generated.provenance);
  return { chart: generated.spec, provenance };
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + "\n\n…[truncated]";
}

function escape(s: string): string {
  return s.replace(/"/g, '\\"');
}

function safeJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    // Try to recover from accidentally fenced output.
    const fence = text.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (fence?.[1]) {
      try {
        return JSON.parse(fence[1]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
