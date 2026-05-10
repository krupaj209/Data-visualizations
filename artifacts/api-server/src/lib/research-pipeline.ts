import { ai } from "@workspace/integrations-gemini-ai";
import {
  CHART_ARCHETYPES,
  STANDARD_QUESTIONS,
  getSubcategoryBankFlexible,
  isImplementedArchetype,
  type BankQuestion,
  type BankQuestionKind,
  type ChartArchetypeId,
} from "@workspace/question-bank";
import { aiChartSchema, type AiChart } from "./chart-spec";
import { ARCHETYPE_PROMPT } from "./chart-archetype-prompts";
import { openai } from "./openai";
import { logger } from "./logger";
import {
  getCeIntelligence,
  sliceIntelForArchetype,
  formatIntelFactsForPrompt,
  type CeIntelligenceView,
} from "./ce-intelligence";
import {
  emptyRegenConstraints,
  isEmptyConstraints,
  type RegenConstraints,
} from "./regen-constraints";
import {
  isEvidenceKind,
  kindFromUrl,
  partitionDrdByKind,
  classifyDrdSnippet,
  type EvidenceKind,
} from "./evidence-kind";

const MODEL = "gemini-2.5-pro";
const VERIFIER_MODEL = "gpt-5.4";

// Deck-budget constants used by both step (4c) timing floor and step (5)
// trim. Lifted to module scope so the floor can reason about TOTAL_MAX
// before the trim runs (Task #80, code-review fix #1).
const TOTAL_MIN = 4;
const TOTAL_MAX = 7;

/**
 * Task #80: timing/booking archetype set used by the category-CE timing
 * floor (step 4c) and the booking_window standards auto-restore branch.
 * A category-CE deck must always carry at least one chart from this set
 * unless every candidate fails the DRD signal check.
 */
export const TIMING_ARCHETYPES = new Set<ChartArchetypeId>([
  "daily_pattern",
  "hourly_heatmap",
  "weekly_pattern",
  "booking_window",
  "seasonal_curve",
  "optimal_departure",
]);

/**
 * Reasons a `dropped` entry counts as a hard data-signal skip — meaning
 * the candidate should NOT be auto-restored by the timing floor. Matched
 * via case-insensitive substring against the recorded drop reason.
 */
const HARD_SKIP_REASON_PATTERNS: RegExp[] = [
  /drd_flag/i,
  /unlimited_capacity/i,
  /no_data_signal/i,
  /drd_low_confidence/i,
];

function isHardSkipReason(reason: string): boolean {
  return HARD_SKIP_REASON_PATTERNS.some((re) => re.test(reason));
}

/**
 * Deterministic check used by the category-CE booking_window
 * auto-restore branch (Task #80, code-review fix #2). Returns true when
 * the DRD itself surfaces phrasing that implies the operator is
 * effectively walk-up / never-sells-out, in which case we MUST NOT
 * auto-restore booking_window even if the model didn't record an
 * explicit unlimited_capacity drop.
 *
 * Patterns are conservative — they aim to fire only when the DRD makes
 * the claim explicitly so we don't suppress booking_window for genuine
 * sell-out CEs whose DRDs happen to mention walk-ups in passing.
 */
const UNLIMITED_CAPACITY_PATTERNS: RegExp[] = [
  /\bunlimited capacity\b/i,
  /\bnever sells? out\b/i,
  /\bdoes not sell out\b/i,
  /\bdo(?:es)? not sell out\b/i,
  /\bno booking (?:required|needed)\b/i,
  /\bwalk[- ]up only\b/i,
  /\bturn[- ]up and go\b/i,
  /\bturn[- ]up-and-go\b/i,
  /\bhop[- ]on hop[- ]off (?:freely|without booking)\b/i,
];

export function drdImpliesUnlimitedCapacity(drdMarkdown: string): boolean {
  if (!drdMarkdown || !drdMarkdown.trim()) return false;
  return UNLIMITED_CAPACITY_PATTERNS.some((re) => re.test(drdMarkdown));
}

/**
 * Pure decision helper for the category-CE timing floor (step 4c).
 *
 * Returns the candidate that should be auto-restored as the deck's lone
 * timing chart, or `null` when the deck already carries one or no
 * surviving candidate exists. Exposed so the unit suite in
 * `scripts/src/test-cruise-timing-floor.mts` can pin the deterministic
 * behaviour without spinning up the full Gemini pipeline.
 */
export interface TimingFloorCandidateInput {
  question: string;
  archetype: ChartArchetypeId;
  kind: BankQuestionKind;
  topic_id?: string;
  source: "bank" | "standard";
}

export interface TimingFloorPick {
  pick: TimingFloorCandidateInput;
  /** Question text to remove from `dropped` if it was previously recorded there. */
  removeFromDropped?: string;
}

export function pickCategoryCeTimingFloor(args: {
  isCategoryCe: boolean;
  selectedArchetypes: ChartArchetypeId[];
  bankQuestions: BankQuestion[];
  standardQuestions: BankQuestion[];
  dropped: { question: string; reason: string }[];
}): TimingFloorPick | null {
  if (!args.isCategoryCe) return null;
  const alreadyHasTiming = args.selectedArchetypes.some((a) =>
    TIMING_ARCHETYPES.has(a),
  );
  if (alreadyHasTiming) return null;

  const droppedByQ = new Map(args.dropped.map((d) => [d.question, d.reason]));

  const candidates: TimingFloorCandidateInput[] = [
    ...args.bankQuestions.map((q) => ({
      question: q.question,
      archetype: q.recommended_archetype,
      kind: q.kind,
      ...(q.topic_id ? { topic_id: q.topic_id } : {}),
      source: "bank" as const,
    })),
    ...args.standardQuestions.map((q) => ({
      question: q.question,
      archetype: q.recommended_archetype,
      kind: q.kind,
      ...(q.topic_id ? { topic_id: q.topic_id } : {}),
      source: "standard" as const,
    })),
  ];

  for (const c of candidates) {
    if (!TIMING_ARCHETYPES.has(c.archetype)) continue;
    if (!isImplementedArchetype(c.archetype)) continue;
    const dropReason = droppedByQ.get(c.question);
    if (dropReason && isHardSkipReason(dropReason)) continue;
    return {
      pick: c,
      ...(dropReason ? { removeFromDropped: c.question } : {}),
    };
  }
  return null;
}

/**
 * Selection entry shape used by the timing-floor application helper.
 * Mirrors `parsed.selected[i]` in `selectQuestions` (kept structural so
 * the unit suite can hand-roll inputs without importing the full
 * planner-output Zod type).
 */
export interface PlannerSelection {
  question: string;
  archetype: ChartArchetypeId;
  rationale: string;
  kind: BankQuestionKind;
  topic_id?: string;
}

export interface ApplyTimingFloorArgs {
  selected: PlannerSelection[];
  dropped: { question: string; reason: string }[];
  bankQuestions: BankQuestion[];
  standardQuestions: BankQuestion[];
  signatureMax: number;
  totalMax: number;
}

export interface ApplyTimingFloorResult {
  selected: PlannerSelection[];
  dropped: { question: string; reason: string }[];
  /** Set when the floor failed to seat a candidate. */
  warning?: "all_candidates_skipped" | "no_candidate_in_bank_or_standards";
}

/**
 * Apply the category-CE timing floor (Task #80, step 4c) to a planner
 * selection. Pure: returns new arrays, never mutates inputs. Caller
 * decides whether to log the `warning` field.
 *
 * Rules:
 * - If the deck already carries a TIMING archetype, return inputs unchanged.
 * - Pick the highest-priority bank-then-standards candidate whose drop
 *   reason isn't a hard data-signal skip (`pickCategoryCeTimingFloor`).
 * - Make room for the pick by displacing the lowest-ranked SIGNATURE
 *   when either (a) signature count is at `signatureMax` OR (b) total
 *   selection is at `totalMax`. Standards are NEVER displaced — they
 *   carry contractual weight that the floor must not erode.
 * - When the deck is at total cap and contains only standards (no
 *   signature available to displace), refuse to seat the pick and warn
 *   — sacrificing a contractual standard to make room for a floor pick
 *   would be a net regression in deck quality.
 */
export function applyCategoryCeTimingFloor(
  args: ApplyTimingFloorArgs,
): ApplyTimingFloorResult {
  const selected = args.selected.slice();
  let dropped = args.dropped.slice();

  const floorPick = pickCategoryCeTimingFloor({
    isCategoryCe: true,
    selectedArchetypes: selected.map((s) => s.archetype),
    bankQuestions: args.bankQuestions,
    standardQuestions: args.standardQuestions,
    dropped,
  });

  if (!floorPick) {
    const alreadyHasTiming = selected.some((s) =>
      TIMING_ARCHETYPES.has(s.archetype),
    );
    if (alreadyHasTiming) {
      return { selected, dropped };
    }
    const anyTimingCandidate = [
      ...args.bankQuestions,
      ...args.standardQuestions,
    ].some(
      (q) =>
        TIMING_ARCHETYPES.has(q.recommended_archetype) &&
        isImplementedArchetype(q.recommended_archetype),
    );
    return {
      selected,
      dropped,
      warning: anyTimingCandidate
        ? "all_candidates_skipped"
        : "no_candidate_in_bank_or_standards",
    };
  }

  // Need to make room?
  const sigCount = selected.filter((s) => s.kind !== "standard").length;
  const atSignatureCap =
    floorPick.pick.kind !== "standard" && sigCount >= args.signatureMax;
  const atTotalCap = selected.length >= args.totalMax;

  if (atSignatureCap || atTotalCap) {
    // Find the lowest-ranked SIGNATURE (last in selection order) to
    // displace. If none exists (deck is all standards at total cap),
    // refuse to seat the floor pick — see the docblock note above.
    let displaceIdx = -1;
    for (let i = selected.length - 1; i >= 0; i--) {
      if (selected[i]!.kind !== "standard") {
        displaceIdx = i;
        break;
      }
    }
    if (displaceIdx === -1) {
      return {
        selected,
        dropped,
        warning: "all_candidates_skipped",
      };
    }
    const displaced = selected.splice(displaceIdx, 1)[0]!;
    dropped = dropped.concat({
      question: displaced.question,
      reason: atSignatureCap
        ? "displaced by category-CE timing floor (signature_max budget)"
        : "displaced by category-CE timing floor (total_max budget)",
    });
  }

  if (floorPick.removeFromDropped) {
    dropped = dropped.filter(
      (d) => d.question !== floorPick.removeFromDropped,
    );
  }

  selected.push({
    question: floorPick.pick.question,
    archetype: floorPick.pick.archetype,
    rationale: "auto-restored timing floor for category-CE",
    kind: floorPick.pick.kind,
    ...(floorPick.pick.topic_id ? { topic_id: floorPick.pick.topic_id } : {}),
  });

  return { selected, dropped };
}

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
   * Sticky writer-feedback constraints (parsed + merged). When supplied
   * the selector hard-enforces banned archetypes/topics/phrases and biases
   * toward must-include topics. Empty constraints are a no-op.
   */
  regenConstraints?: RegenConstraints;
  /**
   * Topic_ids whose chronically-weak prior charts (low rating / repeated
   * issue feedback) should be retired this run. Selector drops any
   * candidate carrying one of these topic ids and records the reason.
   */
  retireTopics?: string[];
  /** Same as `retireTopics` but for whole archetypes (rare — used for "wrong_data" repeats). */
  retireArchetypes?: ChartArchetypeId[];
}

/**
 * Enriched per-chart snapshot fed to the selector. Lets the prompt and
 * the deterministic post-LLM step reason about what shipped before, what
 * the writer edited, and where reviewers complained.
 */
export interface ExistingChartSnapshot {
  question: string;
  chartType: string;
  status?: string | null;
  /** Archetype id pulled from `chart_type` (mirrored verbatim today). */
  archetype?: ChartArchetypeId;
  /** From `provenance.topic_id` if present — used to detect topic-overlap. */
  topicId?: string;
  /** First sentence of the chart's `insight` field — gives the LLM context. */
  insight?: string;
  /** Compact spec digest (first 320 chars of JSON.stringify) — keeps prompt bounded. */
  specDigest?: string;
  /** Aggregated open-feedback signal for this chart. */
  feedback?: {
    rating?: number | null;
    /** Most-severe issue category seen on open feedback. */
    issue?: string | null;
    /** Number of edits the writer made to this chart since generation. */
    editCount?: number;
    /** Concatenated open-feedback notes (first ~240 chars) for the LLM. */
    note?: string;
  };
}

/**
 * A DRD snippet citation. Legacy rows store bare strings; new rows from
 * the Task #63 pipeline store the tagged shape so writers can see WHICH
 * DRD section a quoted phrase came from. UI renderers must accept both.
 */
export type DrdSnippet = string | { text: string; kind?: EvidenceKind };

export interface WebSource {
  title: string;
  url: string;
  /** Evidence kind classified from the URL (or set explicitly by the model). */
  kind?: EvidenceKind;
}

export interface EstimateNote {
  field: string;
  reasoning: string;
  /** Always "estimate" for new rows; absent on legacy rows. */
  kind?: EvidenceKind;
}

export interface ChartProvenance {
  status: "drd_grounded" | "web_grounded" | "estimated";
  drd_snippets: DrdSnippet[];
  web_sources: WebSource[];
  estimates: EstimateNote[];
  verifier_notes: string;
  /** "standard" (S1-S4) or "signature" (subcat-specific). Optional for legacy rows. */
  kind?: BankQuestionKind;
  /** Shared id for questions that travel together (e.g. S1a/S1b → "crowd_timing"). */
  topic_id?: string;
  /**
   * CE-intelligence facts referenced when generating this chart. Each entry
   * is either a bare fact id (legacy shape) or `{ id, kind }` carrying the
   * EvidenceKind taxonomy tag (Task #63). Resolves back to facts in the
   * `ce_intelligence` table for citations.
   */
  intelligence_refs?: (string | IntelRef)[];
}

/** Tagged CE-intelligence reference (Task #63). */
export interface IntelRef {
  id: string;
  kind: EvidenceKind;
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
  /**
   * What this run honored from writer feedback / retire signals — surfaced
   * back to the UI so the writer can confirm we caught the right intent.
   * Always present on a regen call; an empty `honoredFeedback` array means
   * no parsed constraints were active.
   */
  regen_summary: RegenSummary;
}

export interface RegenSummary {
  /** Plain-English bullets of what was applied (one per parsed signal). */
  honoredFeedback: string[];
  /** Archetype ids that were hard-blocked from selection this run. */
  suppressedArchetypes: ChartArchetypeId[];
  /** Topics whose chronically-weak prior charts were retired. */
  retiredTopics: string[];
  /** Number of selected questions that overlap the prior deck. */
  priorDeckOverlap: number;
  /** Total prior charts considered (= existingCharts.length). */
  priorDeckSize: number;
}

/* -------------------------------------------------------------------------- */
/* Step 1 — Adapt the question bank to the specific CE                        */
/* -------------------------------------------------------------------------- */

interface SelectedQuestion {
  question: string;
  archetype: ChartArchetypeId;
  rationale: string;
  kind: BankQuestionKind;
  topic_id?: string;
}

interface SubProduct {
  name: string;
  positioning: string;
}

interface QuestionSelection {
  summary: string;
  emoji: string;
  selected: SelectedQuestion[];
  dropped: { question: string; reason: string }[];
  proposed_hero: BankQuestion[];
  /**
   * True when the DRD describes 3+ named sub-products with distinct
   * positioning (e.g. Thames cruises = Uber Boat / sightseeing /
   * Greenwich / dining / HOHO). Triggers the comparison-archetype bias
   * and the deterministic slot_compare floor in post-processing.
   */
  is_category_ce?: boolean;
  sub_products?: SubProduct[];
  /**
   * Telemetry from the deterministic constraint-enforcement and
   * diversification passes. Folded into RegenSummary by runResearchPipeline.
   */
  regen_summary?: RegenSummary;
}

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

function isCategoryLikeSubcategory(subcategoryId: string): boolean {
  return CATEGORY_CE_SUBCATEGORIES.has(subcategoryId);
}

function normalizeQuestionKey(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function looksLikeDynamicPriceQuestion(question: string): boolean {
  return /\b(price|fare|cost|cheap|cheapest|expensive|value|deal|ticket|tier|pass|book|advance|sold out|sell out)\b/i.test(
    question,
  );
}

function writerExplicitlyAskedForPrice(feedback: string): boolean {
  return /\b(price|fare|cost|cheap|cheapest|expensive|value|ticket|tier|pass)\b/i.test(
    feedback,
  );
}

function categoryCeSelectionPriority(s: SelectedQuestion): number {
  const preferredIdx = CATEGORY_CE_PREFERRED_ARCHETYPES.indexOf(s.archetype);
  if (preferredIdx >= 0) return preferredIdx;
  if (s.archetype === "history_timeline") return 7;
  if (s.archetype === "stat_grid") return 8;
  if (CATEGORY_CE_PRICE_ARCHETYPES.has(s.archetype)) return 30;
  if (s.kind === "standard") return 40;
  return 20;
}

async function selectQuestions(
  input: ResearchPipelineInput,
): Promise<QuestionSelection> {
  const bank = getSubcategoryBankFlexible(
    input.subcategoryId,
    input.subcategoryLabel,
    input.subcategoryDescription,
  );

  const archetypeIds = Object.keys(CHART_ARCHETYPES) as ChartArchetypeId[];

  const writerTopics = (input.writerTopics ?? [])
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const standards = STANDARD_QUESTIONS;
  const signatures = bank.questions;
  const regenerationFeedback = input.regenerationFeedback?.trim() ?? "";
  const existingCharts = input.existingCharts ?? [];
  const constraints = input.regenConstraints ?? emptyRegenConstraints();
  const retireTopics = (input.retireTopics ?? []).map((s) => s.toLowerCase());
  const retireArchetypes = input.retireArchetypes ?? [];
  const categoryLikeSubcategory = isCategoryLikeSubcategory(input.subcategoryId);
  const feedbackAsksForPrice = writerExplicitlyAskedForPrice(regenerationFeedback);

  // Render the prior-deck snapshot with feedback signals folded in so the
  // LLM can see WHY a chart was weak, not just that it existed.
  function renderExisting(c: ExistingChartSnapshot): string {
    const tags: string[] = [];
    if (c.feedback?.rating != null) tags.push(`rating=${c.feedback.rating}`);
    if (c.feedback?.issue) tags.push(`issue=${c.feedback.issue}`);
    if (c.feedback?.editCount && c.feedback.editCount > 0)
      tags.push(`edits=${c.feedback.editCount}`);
    if (c.topicId) tags.push(`topic=${c.topicId}`);
    const tagStr = tags.length > 0 ? ` (${tags.join(", ")})` : "";
    const noteStr = c.feedback?.note ? `\n    note: ${c.feedback.note}` : "";
    const insightStr = c.insight ? `\n    insight: ${c.insight}` : "";
    return `- [${c.status ?? "unknown"}] ${c.archetype ?? c.chartType}: ${c.question}${tagStr}${insightStr}${noteStr}`;
  }
  const existingBlock =
    existingCharts.length > 0
      ? `Existing deck to improve/diversify from:\n${existingCharts.map(renderExisting).join("\n")}`
      : "";

  // Constraint block — only emitted when at least one signal is set so
  // the prompt stays tight on first-time generations.
  const constraintLines: string[] = [];
  if (constraints.bannedArchetypes.length > 0) {
    constraintLines.push(
      `- BANNED ARCHETYPES (writer asked to drop): ${constraints.bannedArchetypes.join(", ")}. Do NOT pick any of these. If a standard question's recommended_archetype is on this list, record it in \`dropped\` with reason \`writer_feedback: archetype banned\`.`,
    );
  }
  if (constraints.bannedTopics.length > 0) {
    constraintLines.push(
      `- BANNED TOPICS: ${constraints.bannedTopics.join(", ")}. Do NOT pick any question whose topic_id matches one of these.`,
    );
  }
  if (constraints.bannedQuestionPhrases.length > 0) {
    constraintLines.push(
      `- BANNED PHRASES: ${constraints.bannedQuestionPhrases.map((p) => `"${p}"`).join(", ")}. Do NOT pick any question whose text contains one of these substrings.`,
    );
  }
  if (constraints.mustIncludeTopics.length > 0) {
    constraintLines.push(
      `- LEAN INTO these topics: ${constraints.mustIncludeTopics.join(", ")}. If the DRD has supporting evidence, prefer questions / propose heroes that cover them.`,
    );
  }
  if (constraints.toneNotes.length > 0) {
    constraintLines.push(
      `- WRITER NOTES (verbatim, latest first): ${constraints.toneNotes.slice().reverse().slice(0, 3).map((n) => `"${truncate(n, 220)}"`).join(" | ")}`,
    );
  }
  if (retireTopics.length > 0) {
    constraintLines.push(
      `- RETIRE these topics this run (chronically weak in prior runs): ${retireTopics.join(", ")}. Drop any candidate carrying one of these topic_ids with reason \`retire_signal: <topic>\`.`,
    );
  }
  if (retireArchetypes.length > 0) {
    constraintLines.push(
      `- RETIRE these archetypes this run: ${retireArchetypes.join(", ")}.`,
    );
  }
  if (constraints.diversifyRequested && existingCharts.length > 0) {
    constraintLines.push(
      `- DIVERSIFY: at least HALF of selected questions must be NEW (i.e. not present in the existing deck above). Repeating an exact prior question text is allowed only when no alternative exists in the bank or proposed_hero.`,
    );
  }
  const constraintBlock =
    constraintLines.length > 0
      ? `STICKY WRITER CONSTRAINTS — these override default selection. Honor them all:\n${constraintLines.join("\n")}\n`
      : "";

  const prompt = `You are designing a Headout listing-page visualization deck.

CE: ${input.ce.name} (${input.ce.city}, ${input.ce.country})
Subcategory: ${bank.subcategory.label} — ${bank.subcategory.description}
${bank.unratified ? "(NOTE: this subcategory has no curated bank yet — bootstrap a draft signature set entirely from the DRD via proposed_hero[]. Standard questions still apply.)" : ""}

You receive TWO question lists:

(A) STANDARD questions — these are the universal asks every CE inherits. For EACH, decide whether to KEEP or SKIP based on the Deep Research Doc. SKIP only when the structured \`skip_if\` predicate is satisfied by the DRD; otherwise keep. Record skipped standards in \`dropped\` with the reason. Questions that share a \`topic_id\` MUST be kept-or-skipped TOGETHER (e.g. S1a + S1b both carry topic_id "crowd_timing" — never keep one without the other).

Standard questions:
${JSON.stringify(standards, null, 2)}

(B) SIGNATURE questions — subcategory-specific. Pick 1-3 of the most CE-relevant ones. SKIP a signature when its \`skip_if\` predicate is satisfied OR when the DRD genuinely lacks the data behind it. Record skipped signatures in \`dropped\` with a one-line reason.

DRD-CONFIDENCE RULE (apply to BOTH standards and signatures): If the DRD itself rates the relevant topic as Low confidence, calls it out as an "Honest Gap", flags it as anecdotal/operator-marketing, or simply doesn't carry the evidence behind it, SKIP that question. Record it in \`dropped\` with a reason that begins \`drd_low_confidence: \` followed by a one-line explanation citing the DRD section. This is preferred over generating a chart that the verifier will then have to challenge.

CATEGORY-CE DETECTION: Read the DRD's product/sub-product map. If it describes 3+ named sub-products with materially different positioning (e.g. an Uber Boat commuter ride vs a narrated sightseeing cruise vs a Greenwich destination cruise vs a dinner cruise vs a HOHO river pass), set \`is_category_ce\` to true and populate \`sub_products\` with one entry per named offering ({name, positioning}). When \`is_category_ce\` is true, BIAS THE BULK OF YOUR PICKS toward route, landmark, duration, pier/stop, time-of-day, best-for, and itinerary charts — especially \`route_profile\`, \`slot_compare\`, \`duration_stat\`, \`time_split\`, \`optimal_departure\`, \`compare_zones\`, and \`stop_frequency\`. Avoid generic crowd/weather charts unless the DRD has direct, specific evidence. You MUST include at least one \`slot_compare\` whose slots are the named sub-products and one route/itinerary-style chart when the DRD has ordered stops, piers, routes, or landmarks. HOWEVER, the deck must NOT lose all timing/booking coverage: keep EXACTLY ONE timing chart (\`daily_pattern\` / \`hourly_heatmap\` / \`weekly_pattern\` / \`booking_window\` / \`seasonal_curve\` / \`optimal_departure\`) when the DRD carries direct numeric or operator-grounded backing for it (named lead-time windows, named sell-out windows, named popular-times signals, named seasonal sunset slots). Skip the timing chart only when no such grounding exists. If \`is_category_ce\` is false (single-product CE), pick normally.

REGENERATION QUALITY RULE: If writer feedback says the deck is generic, too similar, poor, or asks for an Accademia-level result, do NOT repeat the existing deck. Treat the existing deck as the thing to improve away from, not a template to copy. Prefer CE-specific questions anchored in named routes, piers, sub-products, departure slots, seating/deck choices, itinerary split, best-for choices, or landmark coverage. Avoid exact-repeat questions and avoid generic crowd/weather charts unless the DRD has direct, specific evidence.

DYNAMIC PRICE RULE: For cruises, tours, transport, or date-based tickets, weak price charts are worse than no price chart. Do NOT select \`ticket_ladder\`, \`month_calendar\`, \`price_curve\`, \`booking_window\`, or \`seasonal_curve\` just to compare dynamic fares. Use \`ticket_ladder\` only for stable inclusions/access differences across fixed tiers. Use \`month_calendar\` or \`price_curve\` only when the DRD or live facts contain direct date/week/month fare evidence and the writer specifically asked for price/fare guidance.

Signature questions for this subcategory:
${signatures.length > 0 ? JSON.stringify(signatures, null, 2) : "(none — bootstrap signatures via proposed_hero[])"}

Available chart archetypes (you may only use these ids; do NOT invent new ones): ${archetypeIds.join(", ")}

${writerTopics.length > 0 ? `Writer-supplied hero topics that MUST be turned into selected questions: ${writerTopics.join("; ")}` : ""}

${regenerationFeedback ? `Writer regeneration feedback to address:\n${regenerationFeedback}` : ""}

${constraintBlock}

${existingBlock}${existingCharts.length > 0 ? `\nOn regeneration, avoid selecting the same question again unless it is the only evidence-backed way to answer an important traveler decision.` : ""}

After filtering, propose 0-2 ADDITIONAL hero questions tailored to THIS specific CE (e.g. a famous named room, a signature ride, a sunset slot) — anchored in the DRD, not invented. These go in proposed_hero[]. Each must carry kind:"signature".

Also produce a 2-sentence visitor-facing summary of the CE and pick a single emoji.

Return JSON ONLY (no markdown), shape:
{
  "summary": "...",
  "emoji": "📍",
  "is_category_ce": true | false,
  "sub_products": [ { "name": "...", "positioning": "one-line role / who it's for" }, ... ],
  "selected": [
    { "question": "...", "archetype": "<one of the ids>", "kind": "standard"|"signature", "topic_id": "..."|null, "rationale": "one line" },
    ...
  ],
  "dropped": [ { "question": "...", "reason": "one line" }, ... ],
  "proposed_hero": [ { "question": "...", "recommended_archetype": "...", "kind": "signature", "notes": "..." }, ... ]
}

Rules:
- Sentence case for all visitor-facing copy.
- Reference the CE by name in summary.
- DO NOT enforce uniqueness by archetype — multiple selected questions MAY share the same archetype (e.g. a weekly_pattern for crowd AND a weekly_pattern for price availability).
- Keep the S1a/S1b crowd_timing pair together; never split.
- Output \`topic_id\` exactly as it appears on the source question, or null if none.

Deep Research Doc:
"""
${truncate(input.drdMarkdown, 16000)}
"""`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      temperature: 0.4,
      // 8k accommodates the expanded prompt (sub_products list +
      // category-CE branch + DRD-confidence reasons) without truncating
      // the JSON envelope. 4k routinely truncated category-CE responses.
      maxOutputTokens: 8192,
    },
  });

  const raw = response.text ?? "";
  if (!raw) throw new Error("Question selection returned empty response");

  const parsed = safeJson<QuestionSelection>(raw);
  if (!parsed) {
    logger.warn(
      { slug: input.ce.slug, raw_preview: raw.slice(0, 800) },
      "Question selection produced invalid JSON",
    );
    throw new Error("Question selection produced invalid JSON");
  }
  if (!Array.isArray(parsed.selected) || parsed.selected.length === 0) {
    throw new Error("Question selection returned no charts");
  }

  parsed.dropped = Array.isArray(parsed.dropped) ? parsed.dropped : [];
  parsed.proposed_hero = Array.isArray(parsed.proposed_hero)
    ? parsed.proposed_hero
    : [];
  parsed.is_category_ce = !!parsed.is_category_ce;
  parsed.sub_products = Array.isArray(parsed.sub_products)
    ? parsed.sub_products.filter(
        (p): p is SubProduct =>
          !!p && typeof p.name === "string" && p.name.trim().length > 0,
      )
    : [];
  // Defence-in-depth: if the model claimed category-CE but only listed
  // 0-2 sub-products, downgrade. The downstream slot_compare floor needs
  // ≥3 distinct named slots to be meaningful.
  if (parsed.is_category_ce && parsed.sub_products.length < 3) {
    parsed.is_category_ce = false;
  }
  const categoryCeMode = parsed.is_category_ce || categoryLikeSubcategory;
  if (categoryCeMode) parsed.is_category_ce = true;

  // Build authoritative lookups for kind inference. Standards are
  // matched by exact question text; signatures by exact text against
  // the curated bank. Anything not in either list is treated as a
  // proposed_hero (kind:"signature").
  const standardQuestionTexts = new Set(standards.map((s) => s.question));
  const signatureQuestionTexts = new Set(
    bank.questions.map((q) => q.question),
  );

  // Filter selections: drop unknown archetypes; gate unimplemented archetypes
  // (record them in `dropped` with viz_not_yet_built so writers see the
  // reason in the triage view).
  parsed.selected = parsed.selected.filter((s) => {
    if (!archetypeIds.includes(s.archetype)) {
      parsed.dropped.push({
        question: s.question,
        reason: `unknown archetype "${s.archetype}" — dropped`,
      });
      return false;
    }
    if (!isImplementedArchetype(s.archetype)) {
      parsed.dropped.push({
        question: s.question,
        reason: `viz_not_yet_built: archetype "${s.archetype}" is reserved but its renderer hasn't landed yet`,
      });
      return false;
    }
    // Authoritative kind inference: don't trust the LLM's `kind` flag
    // alone. Match the question text against the curated lists so a
    // standard never gets misclassified as a signature (which would
    // skip the S1 pairing path and the kind-tagged provenance).
    if (standardQuestionTexts.has(s.question)) {
      s.kind = "standard";
      // Restore topic_id from the canonical standard if the LLM dropped it.
      if (!s.topic_id) {
        const std = standards.find((q) => q.question === s.question);
        if (std?.topic_id) s.topic_id = std.topic_id;
      }
    } else if (signatureQuestionTexts.has(s.question)) {
      s.kind = "signature";
    } else if (s.kind !== "standard" && s.kind !== "signature") {
      // Proposed-hero or otherwise unknown — treat as signature.
      s.kind = "signature";
    }
    return true;
  });

  const isRegeneration =
    regenerationFeedback.length > 0 || existingCharts.length > 0;
  const existingQuestionKeys = new Set(
    existingCharts.map((c) => normalizeQuestionKey(c.question)),
  );

  // Guardrail over the model: category pages like Thames cruises should not
  // regenerate back into static price/ticket cards or exact repeats. Those
  // outputs look plausible but age badly because fares vary by operator/date.
  parsed.selected = parsed.selected.filter((s) => {
    const repeatQuestion = existingQuestionKeys.has(
      normalizeQuestionKey(s.question),
    );
    if (isRegeneration && repeatQuestion) {
      parsed.dropped.push({
        question: s.question,
        reason:
          "regeneration_diversity: already exists in the deck; selecting a more specific replacement",
      });
      return false;
    }

    const weakPriceDefault =
      categoryCeMode &&
      CATEGORY_CE_PRICE_ARCHETYPES.has(s.archetype) &&
      looksLikeDynamicPriceQuestion(s.question) &&
      !feedbackAsksForPrice;
    if (weakPriceDefault) {
      parsed.dropped.push({
        question: s.question,
        reason:
          "category_ce_price_guardrail: skipped weak dynamic price/ticket chart; prefer route, duration, pier, time-of-day, or best-fit visuals unless price evidence was explicitly requested",
      });
      return false;
    }

    return true;
  });

  if (categoryCeMode) {
    parsed.selected.sort(
      (a, b) => categoryCeSelectionPriority(a) - categoryCeSelectionPriority(b),
    );
  }

  /* ---------- Deterministic post-LLM enforcement ---------- */

  // Helper: did the LLM record an explicit dropped reason for this question?
  const droppedQuestions = new Set(parsed.dropped.map((d) => d.question));

  // (1) Re-add any STANDARD the LLM silently omitted (i.e. didn't pick AND
  // didn't record in `dropped`). The orchestrator contract is "all four
  // standards minus explicit skips" — it isn't allowed to vanish a standard
  // by accident. Skipped peers in a topic_id pair are handled in step (2).
  const selectedQuestions = new Set(parsed.selected.map((s) => s.question));
  for (const std of standards) {
    if (selectedQuestions.has(std.question)) continue;
    if (droppedQuestions.has(std.question)) continue;
    if (!isImplementedArchetype(std.recommended_archetype)) continue;
    if (parsed.is_category_ce) {
      // Task #80: belt-and-braces with the step (4c) timing floor — allow
      // the booking_window standard (S2) to auto-restore for category-CEs
      // when (a) no other timing chart was kept, (b) the LLM didn't drop
      // it for unlimited_capacity, AND (c) the DRD itself doesn't carry
      // explicit unlimited-capacity / walk-up phrasing. Condition (c) is
      // a deterministic DRD check (`drdImpliesUnlimitedCapacity`) so the
      // restore stays correct even when the model omits the standard
      // entirely without recording any drop reason. Other standards keep
      // today's category-specificity behaviour.
      const isBookingWindow =
        std.recommended_archetype === "booking_window";
      const droppedForUnlimited = parsed.dropped.some(
        (d) =>
          d.question === std.question && /unlimited_capacity/i.test(d.reason),
      );
      const hasTimingChart = parsed.selected.some((s) =>
        TIMING_ARCHETYPES.has(s.archetype),
      );
      const drdSaysUnlimited = drdImpliesUnlimitedCapacity(input.drdMarkdown);
      if (
        !isBookingWindow ||
        droppedForUnlimited ||
        hasTimingChart ||
        drdSaysUnlimited
      ) {
        parsed.dropped.push({
          question: std.question,
          reason:
            "category_ce_specificity: not auto-restored; category experiences need direct evidence for generic standard charts",
        });
        continue;
      }
      // Fall through to restore booking_window for the category-CE deck.
    }
    parsed.selected.push({
      question: std.question,
      archetype: std.recommended_archetype,
      rationale: parsed.is_category_ce
        ? "auto-restored standard booking_window for category-CE (no other timing chart kept)"
        : "auto-restored standard (LLM neither kept nor explicitly skipped)",
      kind: "standard",
      ...(std.topic_id ? { topic_id: std.topic_id } : {}),
    });
    selectedQuestions.add(std.question);
  }

  // (2) Enforce S1a/S1b co-emission: if either crowd_timing entry survived,
  // keep both (or drop both). Belt-and-braces over the prompt rule.
  const standardCrowdTopic = standards.filter(
    (q) => q.topic_id === "crowd_timing",
  );
  if (standardCrowdTopic.length === 2) {
    const haveByArchetype = new Map(
      parsed.selected
        .filter((s) => s.kind === "standard" && s.topic_id === "crowd_timing")
        .map((s) => [s.archetype, s] as const),
    );
    const someKept = haveByArchetype.size > 0;
    const allKept = haveByArchetype.size === 2;
    if (someKept && !allKept) {
      for (const peer of standardCrowdTopic) {
        if (
          !haveByArchetype.has(peer.recommended_archetype) &&
          isImplementedArchetype(peer.recommended_archetype)
        ) {
          parsed.selected.push({
            question: peer.question,
            archetype: peer.recommended_archetype,
            rationale: "co-emitted with crowd_timing peer",
            kind: "standard",
            topic_id: "crowd_timing",
          });
          // Remove from dropped if the LLM placed it there.
          parsed.dropped = parsed.dropped.filter(
            (d) => d.question !== peer.question,
          );
        }
      }
    }
  }

  // (3) Cap signatures at 3, deterministically. LLMs sometimes pick more
  // when many curated questions look applicable. Keep the first three in
  // selection order (the LLM's ranking) and push the rest into `dropped`
  // with a budget reason so they show up in the writer's triage view.
  const standardSelections = parsed.selected.filter(
    (s) => s.kind === "standard",
  );
  let signatureSelections = parsed.selected.filter(
    (s) => s.kind !== "standard",
  );
  const SIGNATURE_MIN = parsed.is_category_ce ? 3 : 1;
  const SIGNATURE_MAX = parsed.is_category_ce ? 5 : 3;
  if (signatureSelections.length > SIGNATURE_MAX) {
    const kept = signatureSelections.slice(0, SIGNATURE_MAX);
    const dropped = signatureSelections.slice(SIGNATURE_MAX);
    for (const d of dropped) {
      parsed.dropped.push({
        question: d.question,
        reason: `signature_budget: capped at ${SIGNATURE_MAX} per CE`,
      });
    }
    signatureSelections = kept;
  }

  // (4) Enforce signature MINIMUM: every CE deck needs at least one
  // CE-specific question. If the LLM kept zero, pull the highest-ranked
  // bank candidate (or proposed_hero) whose archetype is implemented and
  // wasn't explicitly skipped via `dropped`. If we still can't find one,
  // log a warning — generation will proceed standards-only and the
  // writer's triage view will show the gap.
  if (signatureSelections.length < SIGNATURE_MIN) {
    const droppedQs = new Set(parsed.dropped.map((d) => d.question));
    const candidates = [
      ...bank.questions.map((q) => ({
        question: q.question,
        archetype: q.recommended_archetype,
      })),
      ...parsed.proposed_hero.map((p) => ({
        question: p.question,
        archetype: p.recommended_archetype,
      })),
    ];
    for (const c of candidates) {
      if (signatureSelections.length >= SIGNATURE_MIN) break;
      if (droppedQs.has(c.question)) continue;
      if (
        isRegeneration &&
        existingQuestionKeys.has(normalizeQuestionKey(c.question))
      ) {
        continue;
      }
      if (!archetypeIds.includes(c.archetype)) continue;
      if (!isImplementedArchetype(c.archetype)) continue;
      if (
        categoryCeMode &&
        CATEGORY_CE_PRICE_ARCHETYPES.has(c.archetype) &&
        looksLikeDynamicPriceQuestion(c.question) &&
        !feedbackAsksForPrice
      ) {
        continue;
      }
      signatureSelections.push({
        question: c.question,
        archetype: c.archetype,
        rationale:
          "auto-restored signature (deck needs >=1 CE-specific question)",
        kind: "signature",
      });
    }
    if (signatureSelections.length < SIGNATURE_MIN) {
      logger.warn(
        { slug: input.ce.slug, subcategoryId: input.subcategoryId },
        "Research pipeline: could not satisfy signature_min — bank empty or all candidates skipped",
      );
    }
  }

  parsed.selected = [...standardSelections, ...signatureSelections];

  // (4b) CATEGORY-CE floor: if the LLM flagged this CE as a category-CE
  // (3+ named sub-products) but didn't actually pick a slot_compare,
  // promote one from the bank. This is the head-to-head sub-product
  // comparison the deck must always carry. Falls back gracefully if no
  // slot_compare candidate exists in the bank.
  if (parsed.is_category_ce) {
    const promoteCategoryCandidate = (
      archetypes: ChartArchetypeId[],
      reason: string,
    ): boolean => {
      const droppedQs = new Set(parsed.dropped.map((d) => d.question));
      const alreadyHas = parsed.selected.some((s) =>
        archetypes.includes(s.archetype),
      );
      if (alreadyHas) return true;

      const candidate = [...bank.questions, ...parsed.proposed_hero].find(
        (q) =>
          archetypes.includes(q.recommended_archetype) &&
          !droppedQs.has(q.question) &&
          !(
            isRegeneration &&
            existingQuestionKeys.has(normalizeQuestionKey(q.question))
          ) &&
          isImplementedArchetype(q.recommended_archetype) &&
          !(
            CATEGORY_CE_PRICE_ARCHETYPES.has(q.recommended_archetype) &&
            looksLikeDynamicPriceQuestion(q.question) &&
            !feedbackAsksForPrice
          ),
      );
      if (!candidate) return false;

      parsed.selected.push({
        question: candidate.question,
        archetype: candidate.recommended_archetype,
        rationale: reason,
        kind: "signature",
      });
      return true;
    };

    const hasSlotCompare = parsed.selected.some(
      (s) => s.archetype === "slot_compare",
    );
    if (!hasSlotCompare) {
      const droppedQs = new Set(parsed.dropped.map((d) => d.question));
      const slotCompareCandidate = [
        ...bank.questions,
        ...parsed.proposed_hero,
      ].find(
        (q) =>
          q.recommended_archetype === "slot_compare" &&
          !droppedQs.has(q.question) &&
          !(
            isRegeneration &&
            existingQuestionKeys.has(normalizeQuestionKey(q.question))
          ) &&
          isImplementedArchetype(q.recommended_archetype),
      );
      if (slotCompareCandidate) {
        parsed.selected.push({
          question: slotCompareCandidate.question,
          archetype: "slot_compare",
          rationale:
            "auto-promoted slot_compare for category-CE (3+ named sub-products)",
          kind: "signature",
        });
      } else {
        logger.warn(
          {
            slug: input.ce.slug,
            sub_products: parsed.sub_products?.length,
          },
          "Research pipeline: category-CE flagged but no slot_compare candidate in bank — deck will lack a head-to-head sub-product chart",
        );
      }
    }

    promoteCategoryCandidate(
      ["route_profile"],
      "auto-promoted route_profile for category-CE route, pier, stop, or landmark coverage",
    );
    promoteCategoryCandidate(
      ["duration_stat", "time_split"],
      "auto-promoted duration/itinerary chart for category-CE planning depth",
    );
    promoteCategoryCandidate(
      ["optimal_departure", "compare_zones", "stop_frequency"],
      "auto-promoted practical choice chart for category-CE time-of-day, pier, or seating decision",
    );
  }

  if (categoryCeMode) {
    parsed.selected.sort(
      (a, b) => categoryCeSelectionPriority(a) - categoryCeSelectionPriority(b),
    );
  }

  // (4c) CATEGORY-CE TIMING FLOOR (Task #80): the category-CE bias above
  // strips every standard timing chart and discourages the LLM from
  // picking single-curve generics. That cost the Thames cruise deck 100%
  // of timing/booking coverage. Reserve one slot here: if no chart with
  // a TIMING archetype survived, restore the highest-priority candidate
  // (bank first, standards second) whose drop reason isn't a hard data
  // signal. Mirrors the slot_compare floor immediately above.
  if (parsed.is_category_ce) {
    const floorResult = applyCategoryCeTimingFloor({
      selected: parsed.selected,
      dropped: parsed.dropped,
      bankQuestions: bank.questions,
      standardQuestions: standards,
      signatureMax: SIGNATURE_MAX,
      totalMax: TOTAL_MAX,
    });
    parsed.selected = floorResult.selected;
    parsed.dropped = floorResult.dropped;
    if (floorResult.warning) {
      logger.warn(
        {
          slug: input.ce.slug,
          subcategoryId: input.subcategoryId,
          had_candidates: floorResult.warning === "all_candidates_skipped",
        },
        floorResult.warning === "all_candidates_skipped"
          ? "Research pipeline: category-CE timing floor — every timing candidate failed the DRD signal check; deck will ship without a timing chart"
          : "Research pipeline: category-CE timing floor — no implemented timing candidate available in bank+standards",
      );
    }
  }

  // (5) Enforce 4–7 total budget. We don't pad beyond what the bank
  // can support, but we DO trim and we DO log when we're under-budget
  // so the writer's triage view surfaces the contract miss.
  // (TOTAL_MIN/TOTAL_MAX are also referenced by step 4c above via the
  // module-level DECK_TOTAL_* constants.)
  if (parsed.selected.length > TOTAL_MAX) {
    const overflow = parsed.selected.slice(TOTAL_MAX);
    parsed.selected = parsed.selected.slice(0, TOTAL_MAX);
    for (const d of overflow) {
      parsed.dropped.push({
        question: d.question,
        reason: `total_budget: capped at ${TOTAL_MAX} per CE`,
      });
    }
  }
  if (parsed.selected.length < TOTAL_MIN) {
    logger.warn(
      {
        slug: input.ce.slug,
        subcategoryId: input.subcategoryId,
        kept: parsed.selected.length,
        target_min: TOTAL_MIN,
      },
      "Research pipeline: under total_budget min — bank/DRD didn't yield enough viable questions",
    );
  }

  /* ---------- (6) Hard-enforce sticky writer constraints + retire signals -- */
  // The prompt asks the LLM to honor these, but we re-apply deterministically
  // so a missed instruction doesn't ship a banned chart. Each filtered
  // selection is moved into `dropped` with a reason prefix the UI can
  // surface back to the writer.
  const summary: RegenSummary = {
    honoredFeedback: [],
    suppressedArchetypes: [],
    retiredTopics: [],
    priorDeckOverlap: 0,
    priorDeckSize: existingCharts.length,
  };

  if (
    !isEmptyConstraints(constraints) ||
    retireTopics.length > 0 ||
    retireArchetypes.length > 0
  ) {
    const banArch = new Set<string>(constraints.bannedArchetypes);
    const banTopic = new Set<string>(constraints.bannedTopics);
    const banPhrase = constraints.bannedQuestionPhrases;
    const retireTopicSet = new Set<string>(retireTopics);
    const retireArchSet = new Set<string>(retireArchetypes);

    const kept: SelectedQuestion[] = [];
    for (const s of parsed.selected) {
      const qLower = s.question.toLowerCase();
      const topicLower = (s.topic_id ?? "").toLowerCase();

      let dropReason: string | null = null;
      if (banArch.has(s.archetype)) {
        dropReason = `writer_feedback: archetype "${s.archetype}" was banned`;
        if (!summary.suppressedArchetypes.includes(s.archetype)) {
          summary.suppressedArchetypes.push(s.archetype);
        }
      } else if (topicLower && banTopic.has(topicLower)) {
        dropReason = `writer_feedback: topic "${topicLower}" was banned`;
      } else {
        const matchedPhrase = banPhrase.find((p) => qLower.includes(p));
        if (matchedPhrase) {
          dropReason = `writer_feedback: question contains banned phrase "${matchedPhrase}"`;
        } else if (topicLower && retireTopicSet.has(topicLower)) {
          dropReason = `retire_signal: topic "${topicLower}" retired this run`;
          if (!summary.retiredTopics.includes(topicLower)) {
            summary.retiredTopics.push(topicLower);
          }
        } else if (retireArchSet.has(s.archetype)) {
          dropReason = `retire_signal: archetype "${s.archetype}" retired this run`;
          if (!summary.suppressedArchetypes.includes(s.archetype)) {
            summary.suppressedArchetypes.push(s.archetype);
          }
        }
      }

      if (dropReason) {
        parsed.dropped.push({ question: s.question, reason: dropReason });
      } else {
        kept.push(s);
      }
    }
    parsed.selected = kept;

    // Backfill anything the bans removed using bank candidates that
    // satisfy the constraints. Cap at TOTAL_MAX so we don't blow the budget.
    if (parsed.selected.length < TOTAL_MIN) {
      const droppedSet = new Set(parsed.dropped.map((d) => d.question));
      const selectedSet = new Set(parsed.selected.map((s) => s.question));
      const candidates: { question: string; archetype: ChartArchetypeId; kind: BankQuestionKind; topic_id?: string }[] = [
        ...bank.questions.map((q) => ({
          question: q.question,
          archetype: q.recommended_archetype,
          kind: q.kind,
          ...(q.topic_id ? { topic_id: q.topic_id } : {}),
        })),
        ...parsed.proposed_hero.map((p) => ({
          question: p.question,
          archetype: p.recommended_archetype,
          kind: p.kind,
        })),
      ];
      for (const c of candidates) {
        if (parsed.selected.length >= TOTAL_MAX) break;
        if (selectedSet.has(c.question) || droppedSet.has(c.question)) continue;
        if (!archetypeIds.includes(c.archetype)) continue;
        if (!isImplementedArchetype(c.archetype)) continue;
        if (banArch.has(c.archetype)) continue;
        if (retireArchSet.has(c.archetype)) continue;
        const cTopic = (c.topic_id ?? "").toLowerCase();
        if (cTopic && (banTopic.has(cTopic) || retireTopicSet.has(cTopic))) continue;
        const cQ = c.question.toLowerCase();
        if (banPhrase.some((p) => cQ.includes(p))) continue;
        parsed.selected.push({
          question: c.question,
          archetype: c.archetype,
          rationale:
            "auto-backfilled after writer-constraint enforcement removed prior pick",
          kind: c.kind,
          ...(c.topic_id ? { topic_id: c.topic_id } : {}),
        });
        selectedSet.add(c.question);
      }
    }
  }

  /* ---------- (7) Diversification: half the picks must be NEW vs prior ---- */
  if (
    constraints.diversifyRequested &&
    existingCharts.length > 0 &&
    parsed.selected.length > 0
  ) {
    const priorQs = new Set(
      existingCharts.map((c) => c.question.trim().toLowerCase()),
    );
    const priorTopics = new Set(
      existingCharts
        .map((c) => (c.topicId ?? "").toLowerCase())
        .filter((t) => t.length > 0),
    );

    const isOverlap = (s: SelectedQuestion): boolean => {
      const qLower = s.question.trim().toLowerCase();
      if (priorQs.has(qLower)) return true;
      const topicLower = (s.topic_id ?? "").toLowerCase();
      if (topicLower && priorTopics.has(topicLower)) return true;
      return false;
    };

    let overlapCount = parsed.selected.filter(isOverlap).length;
    const targetMaxOverlap = Math.floor(parsed.selected.length / 2);

    if (overlapCount > targetMaxOverlap) {
      const droppedSet = new Set(parsed.dropped.map((d) => d.question));
      const selectedSet = new Set(parsed.selected.map((s) => s.question));
      const candidates: { question: string; archetype: ChartArchetypeId; kind: BankQuestionKind; topic_id?: string }[] = [
        ...parsed.proposed_hero.map((p) => ({
          question: p.question,
          archetype: p.recommended_archetype,
          kind: p.kind,
        })),
        ...bank.questions.map((q) => ({
          question: q.question,
          archetype: q.recommended_archetype,
          kind: q.kind,
          ...(q.topic_id ? { topic_id: q.topic_id } : {}),
        })),
      ];

      const constraintOk = (c: { question: string; archetype: ChartArchetypeId; topic_id?: string }): boolean => {
        if (!archetypeIds.includes(c.archetype)) return false;
        if (!isImplementedArchetype(c.archetype)) return false;
        if (constraints.bannedArchetypes.includes(c.archetype)) return false;
        if (retireArchetypes.includes(c.archetype)) return false;
        const t = (c.topic_id ?? "").toLowerCase();
        if (t && (constraints.bannedTopics.includes(t) || retireTopics.includes(t))) return false;
        const q = c.question.toLowerCase();
        if (constraints.bannedQuestionPhrases.some((p) => q.includes(p))) return false;
        return true;
      };

      for (let i = 0; i < parsed.selected.length && overlapCount > targetMaxOverlap; i++) {
        const s = parsed.selected[i]!;
        if (!isOverlap(s)) continue;
        if (s.kind === "standard" && s.topic_id === "crowd_timing") continue; // never split S1 pair
        const swap = candidates.find(
          (c) =>
            !selectedSet.has(c.question) &&
            !droppedSet.has(c.question) &&
            !priorQs.has(c.question.trim().toLowerCase()) &&
            !((c.topic_id ?? "").toLowerCase() && priorTopics.has((c.topic_id ?? "").toLowerCase())) &&
            constraintOk(c),
        );
        if (!swap) break;
        parsed.dropped.push({
          question: s.question,
          reason: `regen_diversify: replaced repeat of prior deck (overlap ${overlapCount}/${parsed.selected.length})`,
        });
        parsed.selected[i] = {
          question: swap.question,
          archetype: swap.archetype,
          rationale: "auto-swapped to diversify against prior deck",
          kind: swap.kind,
          ...(swap.topic_id ? { topic_id: swap.topic_id } : {}),
        };
        selectedSet.delete(s.question);
        selectedSet.add(swap.question);
        overlapCount--;
      }
    }

    summary.priorDeckOverlap = parsed.selected.filter(isOverlap).length;
  } else {
    summary.priorDeckOverlap = 0;
  }

  // Build honoredFeedback bullets (deterministic — based on what was
  // actually applied, not what was requested).
  if (constraints.bannedArchetypes.length > 0) {
    summary.honoredFeedback.push(
      `Suppressed archetypes: ${constraints.bannedArchetypes.join(", ")}`,
    );
  }
  if (constraints.bannedTopics.length > 0) {
    summary.honoredFeedback.push(
      `Suppressed topics: ${constraints.bannedTopics.join(", ")}`,
    );
  }
  if (constraints.bannedQuestionPhrases.length > 0) {
    summary.honoredFeedback.push(
      `Suppressed question phrases: ${constraints.bannedQuestionPhrases.map((p) => `"${p}"`).join(", ")}`,
    );
  }
  if (constraints.mustIncludeTopics.length > 0) {
    summary.honoredFeedback.push(
      `Asked to lean into: ${constraints.mustIncludeTopics.join(", ")}`,
    );
  }
  if (retireTopics.length > 0) {
    summary.honoredFeedback.push(
      `Retired chronically-weak topics: ${retireTopics.join(", ")}`,
    );
  }
  if (retireArchetypes.length > 0) {
    summary.honoredFeedback.push(
      `Retired chronically-weak archetypes: ${retireArchetypes.join(", ")}`,
    );
  }
  if (
    constraints.diversifyRequested &&
    existingCharts.length > 0
  ) {
    summary.honoredFeedback.push(
      `Diversified against prior deck (${summary.priorDeckOverlap}/${parsed.selected.length} repeats remaining)`,
    );
  }

  parsed.regen_summary = summary;
  return parsed;
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

const KIND_GUIDANCE = `Each citation MUST carry an evidence "kind" tag from this taxonomy:
- "official"    — operator/official ticketing site, government/museum page, transit operator
- "marketplace" — OTA/reseller (GetYourGuide, Viator, Headout, Klook, Tiqets, Musement)
- "review"      — review platform / forum / community (TripAdvisor, Reddit, Yelp, Lonely Planet)
- "inferred"    — DRD analyst inference / extrapolation (e.g. snippet from an "Honest gap" or synthesis section)
- "estimate"    — generator estimate, no external source (always use this kind for entries in provenance.estimates)`;

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
1. PREFER numbers from the Deep Research Doc below. When you use a fact from the DRD, capture the exact phrase you used in provenance.drd_snippets, tagging each with the section kind it came from.
2. If the DRD doesn't cover it but a CE Intelligence fact does, use that fact and capture its id in provenance.intelligence_refs.
3. If neither covers it BUT the Live Web Findings below do, use the web finding and capture the source URL/domain in provenance.web_sources (with a short title) AND tag its kind.
4. If none of the above cover it, produce an HONEST estimate a Headout local guide would broadly agree with — and explicitly list which fields you estimated in provenance.estimates with a one-line reasoning. Always tag estimate entries with kind:"estimate".
5. Set provenance.status to "drd_grounded" if every numeric field came from the DRD; "web_grounded" if at least one came from the live web findings or an intelligence fact; "estimated" otherwise.
6. Do NOT invent specific weather scores, price scores, or visitor-mix percentages — leave optional fields blank rather than fabricate. Required fields can use estimates with reasoning.

${KIND_GUIDANCE}

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
    "drd_snippets": [{ "text": "...", "kind": "official|marketplace|review|inferred|unknown" }],
    "web_sources": [{ "title": "...", "url": "https://...", "kind": "official|marketplace|review|inferred|unknown" }],
    "estimates": [{ "field": "spec.days[3].score", "reasoning": "...", "kind": "estimate" }],
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
      input.drdMarkdown,
      new Map(intelSlice.facts.map((f) => [f.id, f.kind ?? "unknown"])),
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
1. PREFER numbers from the Deep Research Doc below. Capture the exact phrase you used in provenance.drd_snippets, tagging each with the section kind it came from.
2. If the DRD doesn't cover it BUT the Live Web Findings below do, use the web finding and capture the source URL/domain in provenance.web_sources AND tag its kind.
3. Otherwise produce an HONEST estimate a Headout local guide would broadly agree with — list which fields you estimated in provenance.estimates with kind:"estimate".
4. Set provenance.status to "drd_grounded" if every numeric field came from the DRD; "web_grounded" if at least one came from the live web findings; "estimated" otherwise.
5. The two charts MUST agree: same opening/closing hours, same weekly pattern (the quietest day in A is the quietest row in B).

${KIND_GUIDANCE}

Output STRICT JSON (no markdown). Each provenance entry shape: drd_snippets:[{text,kind}], web_sources:[{title,url,kind}], estimates:[{field,reasoning,kind:"estimate"}].
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
        input.drdMarkdown,
      ),
    },
    hourly: {
      spec: hourlyChart.data,
      provenance: normalizeProvenance(
        parsed.hourly.provenance,
        result.researchResponse,
        input.drdMarkdown,
      ),
    },
  };
}

function normalizeProvenance(
  raw: ChartProvenance | undefined,
  geminiResponse: unknown,
  drdMarkdown?: string,
  intelKindByFactId?: Map<string, EvidenceKind>,
): ChartProvenance {
  // Tag DRD snippets: accept author-provided objects (with kind) AND legacy
  // bare strings; classify untagged snippets via the DRD section partition.
  const partitioned = drdMarkdown ? partitionDrdByKind(drdMarkdown) : null;
  const drd_snippets: DrdSnippet[] = Array.isArray(raw?.drd_snippets)
    ? (raw!.drd_snippets as unknown[]).flatMap((entry) => {
        if (typeof entry === "string") {
          if (!entry.trim()) return [];
          const kind = partitioned ? classifyDrdSnippet(entry, partitioned) : "unknown";
          return [{ text: entry, kind } as DrdSnippet];
        }
        if (entry && typeof entry === "object") {
          const obj = entry as { text?: unknown; kind?: unknown };
          const text = typeof obj.text === "string" ? obj.text : "";
          if (!text.trim()) return [];
          let kind: EvidenceKind = isEvidenceKind(obj.kind) ? obj.kind : "unknown";
          if (kind === "unknown" && partitioned) {
            kind = classifyDrdSnippet(text, partitioned);
          }
          return [{ text, kind }];
        }
        return [];
      })
    : [];

  // Tag web sources: trust the model's `kind` if it picked a valid one;
  // otherwise classify from the URL.
  const web_sources: WebSource[] = Array.isArray(raw?.web_sources)
    ? (raw!.web_sources as unknown[]).flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const obj = entry as { title?: unknown; url?: unknown; kind?: unknown };
        const url = typeof obj.url === "string" ? obj.url : "";
        if (!url) return [];
        const title = typeof obj.title === "string" ? obj.title : url;
        const kind: EvidenceKind = isEvidenceKind(obj.kind) ? obj.kind : kindFromUrl(url);
        return [{ title, url, kind }];
      })
    : [];

  // Estimates always carry kind:"estimate" — that's the entire taxonomy
  // distinction these entries exist to mark.
  const estimates: EstimateNote[] = Array.isArray(raw?.estimates)
    ? (raw!.estimates as unknown[]).flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const obj = entry as { field?: unknown; reasoning?: unknown };
        const field = typeof obj.field === "string" ? obj.field : "";
        const reasoning = typeof obj.reasoning === "string" ? obj.reasoning : "";
        if (!field && !reasoning) return [];
        return [{ field, reasoning, kind: "estimate" as EvidenceKind }];
      })
    : [];

  const out: ChartProvenance = {
    status: raw?.status ?? "estimated",
    drd_snippets,
    web_sources,
    estimates,
    verifier_notes: typeof raw?.verifier_notes === "string" ? raw!.verifier_notes : "",
    ...(Array.isArray(raw?.intelligence_refs)
      ? {
          intelligence_refs: (raw!.intelligence_refs as unknown[]).flatMap(
            (entry): (string | IntelRef)[] => {
              if (typeof entry === "string") {
                const k = intelKindByFactId?.get(entry);
                return k ? [{ id: entry, kind: k }] : [{ id: entry, kind: "unknown" }];
              }
              if (entry && typeof entry === "object") {
                const obj = entry as { id?: unknown; kind?: unknown };
                if (typeof obj.id !== "string" || !obj.id) return [];
                const fromMap = intelKindByFactId?.get(obj.id);
                const kind: EvidenceKind = fromMap
                  ?? (isEvidenceKind(obj.kind) ? obj.kind : "unknown");
                return [{ id: obj.id, kind }];
              }
              return [];
            },
          ),
        }
      : {}),
  };

  // Pull any Google-search grounding sources Gemini surfaced on the response
  // and merge them into web_sources so writers can see the real citations.
  const grounded = extractGroundingSources(geminiResponse);
  for (const g of grounded) {
    if (!out.web_sources.find((s) => s.url === g.url)) {
      out.web_sources.push({ ...g, kind: kindFromUrl(g.url) });
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

Also sanity-check the provenance evidence-kind tags. Each citation in drd_snippets/web_sources/estimates carries a kind from this taxonomy:
- "official" (operator/government), "marketplace" (OTA), "review" (review/forum), "inferred" (DRD analyst inference), "estimate" (generator estimate), "unknown" (unclassified).
Flag any citation whose kind looks wrong (e.g. a TripAdvisor URL tagged "official", or a DRD "Honest Gap" snippet tagged "official" instead of "inferred").

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

  /* ------- Grouped generation for the S1 crowd_timing pair (S1a + S1b) ----- */
  // Take the pair OUT of the main loop and emit them via a single Gemini
  // call so the two views stay numerically consistent. They're inserted
  // FIRST so they sit adjacent at the top of the deck.
  const crowdPair = selection.selected.filter(
    (s) => s.kind === "standard" && s.topic_id === "crowd_timing",
  );
  const remaining = selection.selected.filter(
    (s) => !(s.kind === "standard" && s.topic_id === "crowd_timing"),
  );

  if (crowdPair.length === 2) {
    const weeklySel = crowdPair.find((s) => s.archetype === "weekly_pattern");
    const hourlySel = crowdPair.find((s) => s.archetype === "hourly_heatmap");
    if (weeklySel && hourlySel) {
      try {
        logger.info(
          { slug: input.ce.slug, topic_id: "crowd_timing" },
          "Research pipeline: generating crowd_timing pair (grouped)",
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
            provenance: {
              ...verified,
              kind: "standard",
              topic_id: "crowd_timing",
            },
          });
        }
      } catch (err) {
        // Fall back to two independent calls if the grouped path fails —
        // we still get adjacent insertion order.
        logger.warn(
          { err, slug: input.ce.slug },
          "Crowd-timing grouped generation failed; falling back to per-chart",
        );
        for (const sel of [weeklySel, hourlySel]) {
          try {
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
              provenance: {
                ...verified,
                kind: "standard",
                topic_id: "crowd_timing",
              },
            });
          } catch (err2) {
            logger.warn(
              { err: err2, archetype: sel.archetype },
              "Research pipeline: crowd-timing fallback failed",
            );
          }
        }
      }
    }
  } else {
    // Pair was incomplete — process whatever the orchestrator kept via the
    // normal loop (defensive; selectQuestions normally enforces this).
    remaining.unshift(...crowdPair);
  }

  for (const sel of remaining) {
    // Belt-and-braces: never call Gemini for an unimplemented archetype.
    // selectQuestions already filters these out, but a stray entry from
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
          kind: sel.kind,
          topic_id: sel.topic_id,
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
      const provenance: ChartProvenance = {
        ...verified,
        kind: sel.kind,
        ...(sel.topic_id ? { topic_id: sel.topic_id } : {}),
      };
      charts.push({
        ...generated.spec,
        recommended_archetype: sel.archetype,
        source_question: sel.question,
        provenance,
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

  return {
    summary: selection.summary || `${input.ce.name} — research-grounded deck.`,
    emoji: selection.emoji || "📍",
    charts,
    dropped_questions: selection.dropped,
    proposed_hero_questions: selection.proposed_hero,
    regen_summary: selection.regen_summary ?? {
      honoredFeedback: [],
      suppressedArchetypes: [],
      retiredTopics: [],
      priorDeckOverlap: 0,
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
}): Promise<{ chart: AiChart; provenance: ChartProvenance }> {
  const input: ResearchPipelineInput = {
    ce: args.ce,
    subcategoryId: "single_chart_regen",
    drdMarkdown: args.drdMarkdown,
  };
  const question = args.feedback?.trim()
    ? `${args.question}\n\nWriter feedback to address in this regeneration:\n${args.feedback.trim()}\n\nRegenerate this chart so it directly fixes that feedback while keeping the same visitor question and archetype unless the existing framing is the problem.`
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
