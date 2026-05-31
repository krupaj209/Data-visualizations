import { ai } from "@workspace/integrations-gemini-ai";
import {
  CHART_ARCHETYPES,
  QUESTION_BUNDLES,
  DEFAULT_PAGE_TYPE,
  assembleDeck,
  extractSignals,
  isImplementedArchetype,
  type ChartArchetypeId,
  type PageType,
} from "@workspace/question-bank";
import {
  formatIntelFactsForPrompt,
  type CeIntelligenceView,
  type IntelBucketId,
  type IntelFact,
} from "./ce-intelligence";
import {
  buildStructuredEvidenceInventory,
  formatEvidenceInventoryForPrompt,
  type EvidenceInventory,
} from "./ce-evidence-inventory";
import { logger } from "./logger";
import {
  buildEditorialBlock,
  type EditorialBlock,
} from "./editorial-verdict";

const MODEL = "gemini-2.5-pro";

const CATEGORY_CE_SUBCATEGORIES = new Set([
  "sightseeing_cruises",
  "day_trips",
  "hop_on_hop_off",
  "combos",
  "city_cards",
  "multi_day_tours",
]);

const CATEGORY_CE_PREFERRED_ARCHETYPES: ChartArchetypeId[] = [
  "route_profile",
  "slot_compare",
  "duration_stat",
  "time_split",
  "optimal_departure",
  "compare_zones",
  "stop_frequency",
];

const CATEGORY_CE_PRICE_ARCHETYPES = new Set<ChartArchetypeId>([
  "ticket_ladder",
  "price_curve",
  "month_calendar",
  "booking_window",
  "seasonal_curve",
]);

export type PlannerEvidenceStatus =
  | "strong"
  | "partial"
  | "weak"
  | "missing";

export interface PlannerEvidenceBucket {
  id: IntelBucketId | "drd_history" | "routes" | "accessibility" | "weather";
  label: string;
  fact_count: number;
  confidence: PlannerEvidenceStatus;
  sample_facts: string[];
}

export interface PlannerQuestion {
  question: string;
  user_intent: string;
  recommended_archetype: ChartArchetypeId;
  chartable: boolean;
  evidence_status: PlannerEvidenceStatus;
  evidence_reason: string;
  confidence: number;
  source_refs: string[];
}

export interface PlannerVisualization {
  question: string;
  archetype: ChartArchetypeId;
  why_it_matters: string;
  data_needed: string[];
  evidence_refs: string[];
  quality_score: {
    traveler_usefulness: number;
    evidence_strength: number;
    uniqueness: number;
    visual_fit: number;
    ce_specificity: number;
    cms_value: number;
    verifier_risk: number;
    overall: number;
    label:
      | "recommended"
      | "needs_evidence"
      | "not_worth_charting"
      | "good_but_duplicate";
    rationale: string;
    /** Optional editorial judgement block attached when an idea has been
     *  re-scored by the targeted recheck pipeline. */
    editorial?: import("./editorial-verdict").EditorialJudgements;
    editorial_verdict?: import("./editorial-verdict").EditorialVerdict;
  };
  priority: number;
  /**
   * True when this visualization fills a template-forced or required slot for
   * the target page (mandatory — always generated). False/undefined means it is
   * an optional ("dynamic") chart the writer can toggle off on the intel-first
   * review step. Derived deterministically from the assembler deck, not the LLM.
   */
  mandatory?: boolean;
  /**
   * Assembler signals that caused this archetype to fire (e.g. "has_long_queues",
   * "page_template_forced"). Populated from the deterministic deck — undefined for
   * archetypes the assembler did not select (LLM-only suggestions).
   */
  triggering_signals?: string[];
  /**
   * Assembler bundle score for the matched slot (higher = better signal match).
   * Undefined for LLM-only suggestions.
   */
  bundle_score?: number;
  /** Set when this idea was originally rejected and promoted back into
   *  the recommended list by a targeted recheck. */
  promoted_from_rejected?: boolean;
  recheck_findings?: string[];
  recheck_status?: "found" | "partial" | "not_found";
}

export interface RejectedVisualization {
  question: string;
  archetype?: ChartArchetypeId;
  reason: string;
  /** Editorial verdict + judgements attached after a targeted recheck. */
  editorial?: import("./editorial-verdict").EditorialJudgements;
  editorial_verdict?: import("./editorial-verdict").EditorialVerdict;
  recheck_findings?: string[];
  recheck_status?: "found" | "partial" | "not_found";
}

export interface CeVisualizationPlan {
  ceSlug: string;
  summary: string;
  evidence_inventory: PlannerEvidenceBucket[];
  evidence_inventory_detailed: EvidenceInventory;
  traveler_questions: PlannerQuestion[];
  recommended_visualizations: PlannerVisualization[];
  rejected_visualizations: RejectedVisualization[];
  live_search_notes: { finding: string; source_url?: string }[];
  generatedAt: string;
}

interface PlannerInput {
  ce: { name: string; city: string; country: string; slug: string };
  subcategoryId: string;
  subcategoryLabel?: string;
  subcategoryDescription?: string;
  drdMarkdown: string;
  intel?: CeIntelligenceView | null;
  includeLiveSearch?: boolean;
  /** Target listing-page template; controls which slots are mandatory. */
  pageType?: PageType;
}

const EVIDENCE_LABELS: Record<string, string> = {
  hours_programme: "Opening hours & programme",
  tickets: "Ticket types & prices",
  crowd_patterns: "Crowd patterns",
  wait_times: "Wait times",
  zones: "Popular zones & highlights",
  co_bookings: "Nearby & co-booked venues",
  sentiment: "Sentiment themes",
  ops_notes: "Operational notes",
  drd_history: "History & chronology",
  routes: "Routes, stops & coverage",
  accessibility: "Accessibility & constraints",
  weather: "Weather & seasonality",
};

const DRD_SIGNAL_PATTERNS: {
  id: PlannerEvidenceBucket["id"];
  pattern: RegExp;
}[] = [
  {
    id: "drd_history",
    pattern:
      /\b(history|built|opened|founded|construction|restoration|medieval|ancient|timeline|century|unesco)\b/i,
  },
  {
    id: "routes",
    pattern:
      /\b(route|routes|stop|stops|pier|departure|itinerary|landmark|coverage|passes|cruise)\b/i,
  },
  {
    id: "accessibility",
    pattern:
      /\b(accessible|wheelchair|step-free|lift|stairs|mobility|restriction|height restriction)\b/i,
  },
  {
    id: "weather",
    pattern: /\b(weather|rain|wind|season|seasonal|summer|winter|sunset)\b/i,
  },
];

function safeJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
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

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 80)}\n\n[...truncated for planner...]`;
}

function clampInt(v: unknown, lo: number, hi: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function normalizeStatus(v: unknown): PlannerEvidenceStatus {
  if (v === "strong" || v === "partial" || v === "weak" || v === "missing") {
    return v;
  }
  return "partial";
}

/**
 * Build a map from each chart archetype to the set of ALL bundles that list it
 * as a candidate. Used to decide whether an LLM-recommended visualization
 * fulfils a mandatory (template-forced/required) slot, without depending on
 * which exact archetype the deterministic deck happened to pick for that slot.
 * An archetype can appear in multiple bundles, so we keep every bundle it
 * belongs to — mapping to only the first would misclassify shared archetypes.
 */
function buildArchetypeBundleMap(): Map<ChartArchetypeId, Set<string>> {
  const map = new Map<ChartArchetypeId, Set<string>>();
  for (const bundle of Object.values(QUESTION_BUNDLES)) {
    for (const candidate of bundle.candidates) {
      let bundles = map.get(candidate.archetype);
      if (!bundles) {
        bundles = new Set<string>();
        map.set(candidate.archetype, bundles);
      }
      bundles.add(bundle.id);
    }
  }
  return map;
}

/**
 * Run the deterministic assembler once and return both:
 * - `isMandatory`: predicate — true when an archetype fills a mandatory slot
 *   (template-forced or required-bundle) for the given CE + page.
 * - `annotations`: per-archetype metadata (triggering_signals + bundle_score)
 *   from the first assembled candidate for each archetype. Attached to LLM
 *   recommendations so the plan review UI can show "why it was selected".
 */
function buildAssemblerData(
  drdMarkdown: string,
  ceName: string,
  pageType: PageType,
): {
  isMandatory: (archetype: ChartArchetypeId) => boolean;
  annotations: Map<string, { triggering_signals: string[]; bundle_score: number }>;
} {
  try {
    const signals = extractSignals(drdMarkdown);
    const deck = assembleDeck({ ceName, signals, pageType });
    const mandatorySelected = deck.selected.filter((q) => q.mandatory);
    const mandatoryBundleIds = new Set(
      mandatorySelected.map((q) => q.bundle_id),
    );
    const mandatoryForcedArchetypes = new Set<ChartArchetypeId>(
      mandatorySelected
        .filter((q) => q.bundle_id === "narrative")
        .map((q) => q.archetype as ChartArchetypeId),
    );
    const archetypeToBundles = buildArchetypeBundleMap();
    const isMandatory = (archetype: ChartArchetypeId): boolean => {
      if (mandatoryForcedArchetypes.has(archetype)) return true;
      const bundleIds = archetypeToBundles.get(archetype);
      if (!bundleIds) return false;
      for (const bundleId of bundleIds) {
        if (mandatoryBundleIds.has(bundleId)) return true;
      }
      return false;
    };
    // First assembled candidate per archetype wins.
    const annotations = new Map<
      string,
      { triggering_signals: string[]; bundle_score: number }
    >();
    for (const q of deck.selected) {
      if (!annotations.has(q.archetype)) {
        annotations.set(q.archetype, {
          triggering_signals: q.triggering_signals,
          bundle_score: q.bundle_score,
        });
      }
    }
    return { isMandatory, annotations };
  } catch (err) {
    logger.warn(
      { err, ceName, pageType },
      "assembler data build failed; mandatory + signals unavailable",
    );
    return { isMandatory: () => false, annotations: new Map() };
  }
}

function isArchetypeId(id: unknown): id is ChartArchetypeId {
  return (
    typeof id === "string" &&
    Object.prototype.hasOwnProperty.call(CHART_ARCHETYPES, id)
  );
}

function looksLikeDynamicPriceQuestion(question: string): boolean {
  return /\b(price|fare|cost|cheap|cheapest|expensive|value|deal|ticket|tier|pass|book|advance|sold out|sell out)\b/i.test(
    question,
  );
}

function isCategoryLikeSubcategory(subcategoryId: string): boolean {
  return CATEGORY_CE_SUBCATEGORIES.has(subcategoryId);
}

function categoryCePriority(archetype: ChartArchetypeId): number {
  const idx = CATEGORY_CE_PREFERRED_ARCHETYPES.indexOf(archetype);
  if (idx >= 0) return idx;
  if (archetype === "history_timeline") return 7;
  if (archetype === "stat_grid") return 8;
  if (CATEGORY_CE_PRICE_ARCHETYPES.has(archetype)) return 30;
  return 20;
}

function buildEvidenceInventory(
  drdMarkdown: string,
  intel: CeIntelligenceView | null | undefined,
): PlannerEvidenceBucket[] {
  const byBucket = new Map<string, IntelFact[]>();
  for (const fact of intel?.facts ?? []) {
    const arr = byBucket.get(fact.bucket) ?? [];
    arr.push(fact);
    byBucket.set(fact.bucket, arr);
  }

  const out: PlannerEvidenceBucket[] = [];
  for (const [bucket, facts] of byBucket.entries()) {
    const avg =
      facts.reduce((sum, fact) => sum + fact.confidence, 0) /
      Math.max(1, facts.length);
    out.push({
      id: bucket as IntelBucketId,
      label: EVIDENCE_LABELS[bucket] ?? bucket,
      fact_count: facts.length,
      confidence: avg >= 80 ? "strong" : avg >= 60 ? "partial" : "weak",
      sample_facts: facts
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3)
        .map((f) => `[${f.id}] ${f.value}`),
    });
  }

  for (const signal of DRD_SIGNAL_PATTERNS) {
    const matches = drdMarkdown.match(signal.pattern);
    if (!matches) continue;
    out.push({
      id: signal.id,
      label: EVIDENCE_LABELS[signal.id] ?? signal.id,
      fact_count: 1,
      confidence: "partial",
      sample_facts: [`DRD contains ${EVIDENCE_LABELS[signal.id] ?? signal.id} signals.`],
    });
  }

  return out.sort((a, b) => {
    const rank: Record<PlannerEvidenceStatus, number> = {
      strong: 3,
      partial: 2,
      weak: 1,
      missing: 0,
    };
    return rank[b.confidence] - rank[a.confidence] || b.fact_count - a.fact_count;
  });
}

function archetypeCatalog(): string {
  return Object.values(CHART_ARCHETYPES)
    .filter((a) => a.implemented)
    .map(
      (a) =>
        `- ${a.id}: ${a.label}. Answers: ${a.answers}. Needs: ${a.data_shape.join("; ")}`,
    )
    .join("\n");
}

function questionSeedBlock(_subcategoryId: string, _label?: string, _description?: string): string {
  // Bundle-based seed: list each intent bundle and its candidate archetypes so
  // the planner LLM has the same intent palette the deterministic assembler
  // uses (one chart per fired bundle). The planner is free to ignore bundles
  // not supported by the CE's evidence — the deterministic assembler is the
  // ground truth at deck-generation time.
  return Object.values(QUESTION_BUNDLES)
    .map((b) => {
      const candidates = b.candidates
        .map((c) => `${c.archetype}`)
        .join(", ");
      return `- [${b.id}] ${b.label} → ${candidates}`;
    })
    .join("\n");
}

async function gatherPlannerLiveNotes(input: PlannerInput): Promise<string> {
  if (input.includeLiveSearch === false) return "(live search disabled)";

  const prompt = `You are researching what travelers need to know before booking this Headout experience.

CE: ${input.ce.name} (${input.ce.city}, ${input.ce.country})

Use Google Search to find current, visitor-facing facts that would help decide which data visualizations to create. Use a balanced source mix:
- official/operator pages for hours, access rules, routes, and policies
- Headout/GetYourGuide/Viator/other OTA pages for ticket options, durations, inclusions, live availability, and price dynamics
- TripAdvisor/Reddit/review/forum sources for sentiment, crowd anecdotes, queue pain points, and traveler anxieties
- tourism/government/reputable travel sources for seasonality and practical context

Do not rely only on official pages unless the question is strictly operational. When the potential chart is about queues, value, sentiment, price movement, “best for”, or what visitors worry about, include non-official sources too.

Return 8-12 concise bullets. Each bullet must name the fact and the source domain in parentheses. Focus on facts that can become charts: ticket tiers, routes/stops, timings, seasonal patterns, crowds, waits, duration, accessibility, restrictions, history/timeline, and comparison dimensions.

Today is ${new Date().toISOString().slice(0, 10)}.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.35,
        maxOutputTokens: 2048,
        tools: [{ googleSearch: {} }],
      },
    });
    return response.text?.trim() || "(no useful live findings returned)";
  } catch (err) {
    logger.warn(
      { err, slug: input.ce.slug },
      "CE visualization planner live-search pass failed",
    );
    return "(live search failed; plan uses DRD and CE Intelligence only)";
  }
}

export async function buildCeVisualizationPlan(
  input: PlannerInput,
): Promise<CeVisualizationPlan> {
  const inventory = buildEvidenceInventory(input.drdMarkdown, input.intel);
  const detailedInventory = buildStructuredEvidenceInventory({
    drdMarkdown: input.drdMarkdown,
    intel: input.intel,
  });
  const categoryCeMode = isCategoryLikeSubcategory(input.subcategoryId);
  const liveNotes = await gatherPlannerLiveNotes(input);
  const intelFacts = input.intel?.facts ?? [];
  const intelBlock =
    intelFacts.length > 0
      ? formatIntelFactsForPrompt(
          [...intelFacts].sort((a, b) => b.confidence - a.confidence).slice(0, 40),
        )
      : "(no CE Intelligence facts yet)";

  const prompt = `You are the CE Intelligence Planner for Headout's visualization tool.

Your job: decide which traveler questions are BEST answered visually for this specific experience, and reject questions that are tempting but not evidence-backed.

CE: ${input.ce.name} (${input.ce.city}, ${input.ce.country})
Subcategory id: ${input.subcategoryId}

Implemented chart archetypes:
${archetypeCatalog()}

Question-bank seeds:
${questionSeedBlock(input.subcategoryId, input.subcategoryLabel, input.subcategoryDescription)}

Evidence buckets already detected:
${JSON.stringify(inventory, null, 2)}

Structured evidence inventory:
${formatEvidenceInventoryForPrompt(detailedInventory)}

CE Intelligence facts:
${intelBlock}

Live search notes:
${liveNotes}

Deep Research Doc:
"""
${truncate(input.drdMarkdown, 14000)}
"""

Return STRICT JSON only, shape:
{
  "summary": "2-sentence internal summary of the visualization opportunity",
  "traveler_questions": [
    {
      "question": "visitor-facing question",
      "user_intent": "choose_ticket|choose_time|choose_route|avoid_crowds|plan_duration|understand_history|compare_options|reduce_risk|other",
      "recommended_archetype": "<implemented archetype id>",
      "chartable": true,
      "evidence_status": "strong|partial|weak|missing",
      "evidence_reason": "why the evidence is or is not enough",
      "confidence": 0-100,
      "source_refs": ["DRD: short phrase", "fact-id", "source domain"]
    }
  ],
  "recommended_visualizations": [
    {
      "question": "must match one traveler_questions.question",
      "archetype": "<implemented archetype id>",
      "why_it_matters": "one sentence",
      "data_needed": ["specific fields the chart needs"],
      "evidence_refs": ["DRD phrase, fact id, or source domain"],
      "quality_score": {
        "traveler_usefulness": 0-100,
        "evidence_strength": 0-100,
        "uniqueness": 0-100,
        "visual_fit": 0-100,
        "ce_specificity": 0-100,
        "cms_value": 0-100,
        "verifier_risk": 0-100,
        "overall": 0-100,
        "label": "recommended|needs_evidence|not_worth_charting|good_but_duplicate",
        "rationale": "short reason for the score"
      },
      "priority": 1
    }
  ],
  "rejected_visualizations": [
    {
      "question": "question we should NOT chart yet",
      "archetype": "<implemented archetype id, if applicable>",
      "reason": "specific missing/weak evidence reason"
    }
  ],
  "live_search_notes": [
    { "finding": "short fact", "source_url": "https://..." }
  ]
}

Rules:
- Recommend 4-8 visualizations total.
- Include at least 2 rejected visualizations when there are evidence gaps. This is how we avoid fake charts.
- Prefer question-bank seeds, but add CE-specific questions when the DRD/search clearly supports them.
- If a chart would require unsupported day-by-day/hour-by-hour crowd data, reject it instead of estimating.
- Treat the structured evidence inventory as the contract for what is chartable. Prefer evidence item ids in source_refs/evidence_refs.
- If a category says "missing", reject charts that need that category unless live search notes explicitly fill the gap.
- Do not recommend unimplemented archetypes.
- History/origin/construction/restoration narratives should use history_timeline.
- Category-style experiences (cruises, day trips, HOHO, combos, city cards, multi-day tours) should favor route, landmark coverage, duration, pier/stop, time-of-day, best-for, itinerary, and comparison questions over generic crowd or price charts.
- For category-style experiences, weak price visuals are worse than no price visual. Do not recommend ticket_ladder, month_calendar, price_curve, booking_window, or seasonal_curve just to compare dynamic fares. Use ticket_ladder only for stable access/inclusion tiers, and use price_curve/month_calendar only when direct dated fare evidence exists.
- For Thames-style cruise CEs, prefer questions like: "What will I see on the main route?", "Single cruise or hop-on hop-off pass?", "Short loop or destination cruise?", "Which departure time gives the best views?", "Where should I sit for the best view?", and "How is the cruise time actually used?"
- Use evidence_status "strong" only when multiple sources or a very explicit DRD/source supports the chart data.
- Use "partial" when a chart is directionally supportable but will need careful verification.
- Use "weak" or "missing" for rejected items.
- Score every recommended candidate across traveler usefulness, evidence strength, uniqueness, visual fit, CE specificity, CMS/page value, and verifier risk.
- verifier_risk means risk of unsupported/stale/misleading claims; lower is better. overall should penalize high verifier risk and weak evidence.
- Only use quality_score.label "recommended" for strong overall candidates. Use "needs_evidence" when useful but under-supported, "good_but_duplicate" when it overlaps an existing/recommended chart, and "not_worth_charting" only if it slips into recommendations despite low page value.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      temperature: 0.35,
      maxOutputTokens: 8192,
    },
  });

  const raw = response.text ?? "";
  const parsed = safeJson<{
    summary?: string;
    traveler_questions?: Partial<PlannerQuestion>[];
    recommended_visualizations?: Partial<PlannerVisualization>[];
    rejected_visualizations?: Partial<RejectedVisualization>[];
    live_search_notes?: { finding?: string; source_url?: string }[];
  }>(raw);

  if (!parsed) {
    logger.warn(
      { slug: input.ce.slug, raw_preview: raw.slice(0, 800) },
      "CE visualization planner produced invalid JSON",
    );
    throw new Error("CE visualization planner produced invalid JSON");
  }

  const travelerQuestions: PlannerQuestion[] = [];
  for (const q of parsed.traveler_questions ?? []) {
    if (!q.question || !isArchetypeId(q.recommended_archetype)) continue;
    const implemented = isImplementedArchetype(q.recommended_archetype);
    travelerQuestions.push({
      question: String(q.question).slice(0, 180),
      user_intent: String(q.user_intent ?? "other").slice(0, 40),
      recommended_archetype: q.recommended_archetype,
      chartable: implemented && q.chartable !== false,
      evidence_status: normalizeStatus(q.evidence_status),
      evidence_reason: String(q.evidence_reason ?? "").slice(0, 260),
      confidence: clampInt(q.confidence ?? 50, 0, 100),
      source_refs: Array.isArray(q.source_refs)
        ? q.source_refs.map((r) => String(r).slice(0, 160)).slice(0, 6)
        : [],
    });
  }

  const { isMandatory: isMandatoryArchetype, annotations: assemblerAnnotations } =
    buildAssemblerData(
      input.drdMarkdown,
      input.ce.name,
      input.pageType ?? DEFAULT_PAGE_TYPE,
    );

  const recommended: PlannerVisualization[] = [];
  const rejected: RejectedVisualization[] = [];
  for (const v of parsed.recommended_visualizations ?? []) {
    if (!v.question || !isArchetypeId(v.archetype)) continue;
    if (!isImplementedArchetype(v.archetype)) continue;
    if (
      categoryCeMode &&
      CATEGORY_CE_PRICE_ARCHETYPES.has(v.archetype) &&
      looksLikeDynamicPriceQuestion(String(v.question))
    ) {
      rejected.push({
        question: String(v.question).slice(0, 180),
        archetype: v.archetype,
        reason:
          "Skipped by category-CE price guardrail: dynamic fares need direct dated evidence and should not be a default chart.",
      });
      continue;
    }
    const rawScore = v.quality_score;
    const qualityScore = {
      traveler_usefulness: clampInt(rawScore?.traveler_usefulness ?? 70, 0, 100),
      evidence_strength: clampInt(rawScore?.evidence_strength ?? 60, 0, 100),
      uniqueness: clampInt(rawScore?.uniqueness ?? 70, 0, 100),
      visual_fit: clampInt(rawScore?.visual_fit ?? 70, 0, 100),
      ce_specificity: clampInt(rawScore?.ce_specificity ?? 70, 0, 100),
      cms_value: clampInt(rawScore?.cms_value ?? 70, 0, 100),
      verifier_risk: clampInt(rawScore?.verifier_risk ?? 35, 0, 100),
      overall: clampInt(rawScore?.overall ?? 70, 0, 100),
      label:
        rawScore?.label === "needs_evidence" ||
        rawScore?.label === "not_worth_charting" ||
        rawScore?.label === "good_but_duplicate" ||
        rawScore?.label === "recommended"
          ? rawScore.label
          : "recommended",
      rationale: String(rawScore?.rationale ?? "").slice(0, 180),
    };
    recommended.push({
      question: String(v.question).slice(0, 180),
      archetype: v.archetype,
      why_it_matters: String(v.why_it_matters ?? "").slice(0, 220),
      data_needed: Array.isArray(v.data_needed)
        ? v.data_needed.map((d) => String(d).slice(0, 120)).slice(0, 8)
        : [],
      evidence_refs: Array.isArray(v.evidence_refs)
        ? v.evidence_refs.map((r) => String(r).slice(0, 160)).slice(0, 8)
        : [],
      quality_score: qualityScore,
      mandatory: isMandatoryArchetype(v.archetype),
      triggering_signals: assemblerAnnotations.get(v.archetype)?.triggering_signals,
      bundle_score: assemblerAnnotations.get(v.archetype)?.bundle_score,
      priority: categoryCeMode
        ? categoryCePriority(v.archetype) * 10 + clampInt(v.priority ?? 1, 1, 9)
        : clampInt(v.priority ?? recommended.length + 1, 1, 99),
    });
  }

  for (const r of parsed.rejected_visualizations ?? []) {
    if (!r.question) continue;
    rejected.push({
      question: String(r.question).slice(0, 180),
      ...(isArchetypeId(r.archetype) ? { archetype: r.archetype } : {}),
      reason: String(r.reason ?? "Evidence is not strong enough.").slice(0, 260),
    });
  }

  for (const q of travelerQuestions) {
    if (q.chartable || q.evidence_status === "strong" || q.evidence_status === "partial") {
      continue;
    }
    if (rejected.some((r) => r.question === q.question)) continue;
    rejected.push({
      question: q.question,
      archetype: q.recommended_archetype,
      reason: q.evidence_reason || "Evidence is not strong enough.",
    });
  }

  return {
    ceSlug: input.ce.slug,
    summary:
      parsed.summary?.slice(0, 520) ??
      `${input.ce.name} has ${recommended.length} chartable visualization opportunities.`,
    evidence_inventory: inventory,
    evidence_inventory_detailed: detailedInventory,
    traveler_questions: travelerQuestions.sort(
      (a, b) => b.confidence - a.confidence,
    ),
    recommended_visualizations: recommended.sort(
      (a, b) => a.priority - b.priority,
    ),
    rejected_visualizations: rejected,
    live_search_notes: (parsed.live_search_notes ?? [])
      .filter((n) => n.finding)
      .map((n) => ({
        finding: String(n.finding).slice(0, 220),
        ...(n.source_url ? { source_url: String(n.source_url) } : {}),
      }))
      .slice(0, 12),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Build a fully deterministic visualization plan for a CE that has no DRD and
 * no CE Intelligence facts yet. Used by the intel-first creation review step so
 * a brand-new CE still lands on a reviewable deck (assembled from the page
 * template) instead of failing — the writer can toggle optional charts and
 * generate, then add a DRD later to ground them with evidence.
 *
 * No LLM is called. The deck comes straight from `assembleDeck`, so mandatory
 * (template-forced / required-slot) flags are authoritative. Evidence-derived
 * fields (evidence_refs, quality scores) are intentionally empty/neutral —
 * there is no research to cite yet.
 */
export function buildDeterministicVisualizationPlan(input: {
  ce: { name: string; city: string; country: string; slug: string };
  pageType?: PageType;
}): CeVisualizationPlan {
  const pageType = input.pageType ?? DEFAULT_PAGE_TYPE;
  const signals = extractSignals("");
  const deck = assembleDeck({ ceName: input.ce.name, signals, pageType });
  const detailedInventory = buildStructuredEvidenceInventory({
    drdMarkdown: "",
    intel: null,
  });

  const recommended: PlannerVisualization[] = deck.selected.map((q, idx) => ({
    question: q.question,
    archetype: q.archetype,
    why_it_matters: q.rationale,
    data_needed: [],
    evidence_refs: [],
    quality_score: {
      traveler_usefulness: 60,
      evidence_strength: 0,
      uniqueness: 60,
      visual_fit: 70,
      ce_specificity: 40,
      cms_value: 60,
      verifier_risk: 60,
      overall: 50,
      label: "needs_evidence",
      rationale:
        "No research doc yet — add a DRD to ground this chart with evidence.",
    },
    mandatory: q.mandatory,
    triggering_signals: q.triggering_signals,
    bundle_score: q.bundle_score,
    priority: idx + 1,
  }));

  return {
    ceSlug: input.ce.slug,
    summary: `Starter deck for ${input.ce.name} assembled from the "${pageType}" page template. Add a Deep Research Doc to ground these charts with evidence.`,
    evidence_inventory: [],
    evidence_inventory_detailed: detailedInventory,
    traveler_questions: [],
    recommended_visualizations: recommended,
    rejected_visualizations: [],
    live_search_notes: [],
    generatedAt: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/* Editorial re-scoring for the targeted gap-recheck pipeline                  */
/* -------------------------------------------------------------------------- */

/**
 * Re-score a single (recommended or rejected) idea editorially after a
 * targeted recheck has produced new evidence. Returns the deterministic
 * `EditorialBlock` (judgements + ship/hold/cut verdict).
 *
 * Today this is a lightweight heuristic stub: we map the recheck status +
 * rejection-reason signals into the five editorial judgements so the
 * deterministic verdict in `editorial-verdict.ts` is the single source of
 * truth. A future revision can promote this to a full Gemini call that
 * reads the DRD + intel facts + recheck findings, but the call-site
 * contract stays the same.
 */
export async function scoreEditorialForIdea(args: {
  ce: { name: string; city: string; country: string };
  question: string;
  archetype?: string;
  rejectionReason: string;
  drdMarkdown: string;
  intelFactsBlock: string;
  recheckFindings: string[];
  sourceRefs: string[];
}): Promise<EditorialBlock> {
  const findingCount = args.recheckFindings.filter((f) => f.trim()).length;
  const sourceCount = args.sourceRefs.filter((s) => s.trim()).length;
  const drdHasSignal = args.drdMarkdown.trim().length > 200;
  const intelHasSignal = args.intelFactsBlock.trim().length > 0;

  const verdict = (yes: boolean, weak: boolean = false) =>
    yes ? "yes" : weak ? "weak" : "no";

  const rationaleFor = (label: string, ok: boolean) =>
    ok
      ? `${label}: supported by recheck findings.`
      : `${label}: still under-evidenced after recheck.`;

  const usefulYes = findingCount >= 1 || drdHasSignal;
  const ceSpecificYes =
    findingCount >= 1 && (intelHasSignal || sourceCount >= 1);
  const betterYes = findingCount >= 2;
  const conversionYes = /\b(book|tour|ticket|wait|queue|skip|price|hour|when|crowd|busy)\b/i.test(
    args.question,
  );
  const visualYes = !!args.archetype && args.archetype.length > 0;

  return buildEditorialBlock({
    useful: {
      verdict: verdict(usefulYes, drdHasSignal),
      rationale: rationaleFor("Useful", usefulYes),
    },
    ce_specific: {
      verdict: verdict(ceSpecificYes, intelHasSignal),
      rationale: rationaleFor("CE-specific", ceSpecificYes),
    },
    better_than_existing: {
      verdict: verdict(betterYes, findingCount >= 1),
      rationale: rationaleFor("Better than existing", betterYes),
    },
    conversion_driven: {
      verdict: verdict(conversionYes, true),
      rationale: rationaleFor("Conversion-driven", conversionYes),
    },
    visually_strong: {
      verdict: verdict(visualYes, true),
      rationale: rationaleFor("Visually strong", visualYes),
    },
  });
}
