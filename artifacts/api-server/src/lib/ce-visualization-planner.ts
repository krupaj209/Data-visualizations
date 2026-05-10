import { ai } from "@workspace/integrations-gemini-ai";
import {
  CHART_ARCHETYPES,
  STANDARD_QUESTIONS,
  getSubcategoryBankFlexible,
  isImplementedArchetype,
  type BankQuestion,
  type ChartArchetypeId,
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

const MODEL = "gemini-2.5-pro";

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
  };
  priority: number;
}

export interface RejectedVisualization {
  question: string;
  archetype?: ChartArchetypeId;
  reason: string;
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

function isArchetypeId(id: unknown): id is ChartArchetypeId {
  return (
    typeof id === "string" &&
    Object.prototype.hasOwnProperty.call(CHART_ARCHETYPES, id)
  );
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

function questionSeedBlock(subcategoryId: string, label?: string, description?: string): string {
  const bank = getSubcategoryBankFlexible(subcategoryId, label, description);
  const questions: BankQuestion[] = [...STANDARD_QUESTIONS, ...bank.questions];
  return questions
    .map((q) => `- ${q.question} -> ${q.recommended_archetype} (${q.kind})`)
    .join("\n");
}

async function gatherPlannerLiveNotes(input: PlannerInput): Promise<string> {
  if (input.includeLiveSearch === false) return "(live search disabled)";

  const prompt = `You are researching what travelers need to know before booking this Headout experience.

CE: ${input.ce.name} (${input.ce.city}, ${input.ce.country})

Use Google Search to find current, visitor-facing facts that would help decide which data visualizations to create. Prefer official/operator pages, current ticket pages, attraction pages, and recent high-signal review/forum summaries.

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
- Category-style experiences (cruises, day trips, HOHO, combos) should favor comparison, route, fare-window, duration, and best-fit questions over generic crowd charts.
- For cruises, tours, transport, or date-based tickets, do not recommend ticket_ladder for price comparison when fares vary by date/week. Use month_calendar for date/week fare windows or price_curve for monthly/lead-time price movement. Use ticket_ladder only for stable inclusions across fixed ticket tiers.
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

  const recommended: PlannerVisualization[] = [];
  for (const v of parsed.recommended_visualizations ?? []) {
    if (!v.question || !isArchetypeId(v.archetype)) continue;
    if (!isImplementedArchetype(v.archetype)) continue;
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
      priority: clampInt(v.priority ?? recommended.length + 1, 1, 99),
    });
  }

  const rejected: RejectedVisualization[] = [];
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
