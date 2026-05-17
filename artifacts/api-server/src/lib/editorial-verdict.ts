/**
 * Pure helpers shared by the visualization planner and the targeted
 * gap-recheck endpoint.
 *
 * Two responsibilities:
 *   1. Compute the editorial ship / hold / cut verdict from the five
 *      named judgements (deterministic — never trust the model to derive it).
 *   2. Turn a free-text rejection reason + an archetype data_shape into a
 *      small, targeted set of "missing evidence" buckets and Google search
 *      queries the recheck endpoint can fan out across.
 *
 * Both are exported as pure functions so they can be unit-tested without
 * spinning up the AI client.
 */

export const EDITORIAL_JUDGEMENT_KEYS = [
  "useful",
  "ce_specific",
  "better_than_existing",
  "conversion_driven",
  "visually_strong",
] as const;

export type EditorialJudgementKey = (typeof EDITORIAL_JUDGEMENT_KEYS)[number];

export type EditorialVerdictValue = "yes" | "weak" | "no";

export interface EditorialJudgement {
  verdict: EditorialVerdictValue;
  rationale: string;
}

export type EditorialJudgements = Record<
  EditorialJudgementKey,
  EditorialJudgement
>;

export type EditorialVerdict = "ship" | "hold" | "cut";

export interface EditorialBlock {
  judgements: EditorialJudgements;
  editorial_verdict: EditorialVerdict;
}

export const EDITORIAL_QUESTIONS: Record<EditorialJudgementKey, string> = {
  useful: "Genuinely useful to a traveler about to book?",
  ce_specific: "Specific to this CE (not a generic subcategory chart)?",
  better_than_existing: "Better than what's already in the deck for this CE?",
  conversion_driven:
    "Conversion- or helpfulness-driven (nudges booking, reduces anxiety, sets expectations)?",
  visually_strong: "Visually strong in the chosen archetype?",
};

export const EDITORIAL_LABELS: Record<EditorialJudgementKey, string> = {
  useful: "Useful",
  ce_specific: "CE-specific",
  better_than_existing: "Better than deck",
  conversion_driven: "Conversion",
  visually_strong: "Visually strong",
};

const EMPTY_JUDGEMENT: EditorialJudgement = {
  verdict: "weak",
  rationale: "",
};

export function emptyJudgements(): EditorialJudgements {
  return EDITORIAL_JUDGEMENT_KEYS.reduce((acc, key) => {
    acc[key] = { ...EMPTY_JUDGEMENT };
    return acc;
  }, {} as EditorialJudgements);
}

function normalizeVerdict(v: unknown): EditorialVerdictValue {
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "yes" || s === "y" || s === "true") return "yes";
    if (s === "no" || s === "n" || s === "false") return "no";
  }
  return "weak";
}

function normalizeRationale(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, 200);
}

/**
 * Coerce arbitrary parsed JSON into the strict five-judgement shape.
 * Missing keys default to `{ verdict: "weak", rationale: "" }`.
 */
export function normalizeEditorialJudgements(
  raw: unknown,
): EditorialJudgements {
  const out = emptyJudgements();
  if (!raw || typeof raw !== "object") return out;
  const obj = raw as Record<string, unknown>;
  for (const key of EDITORIAL_JUDGEMENT_KEYS) {
    const val = obj[key];
    if (!val || typeof val !== "object") continue;
    const j = val as Record<string, unknown>;
    out[key] = {
      verdict: normalizeVerdict(j["verdict"]),
      rationale: normalizeRationale(j["rationale"]),
    };
  }
  return out;
}

/**
 * Deterministic ship / hold / cut rule, computed from the five judgements.
 *
 * Rules (in priority order):
 *   - cut  → any "no" on `useful` or `ce_specific`
 *   - ship → at least 4 "yes" verdicts AND zero "no" verdicts anywhere
 *   - hold → everything else
 *
 * Applied identically by the planner and the recheck endpoint so the UI
 * can trust a single source of truth.
 */
export function deriveEditorialVerdict(
  judgements: EditorialJudgements,
): EditorialVerdict {
  const verdicts = EDITORIAL_JUDGEMENT_KEYS.map(
    (key) => judgements[key].verdict,
  );
  if (judgements.useful.verdict === "no") return "cut";
  if (judgements.ce_specific.verdict === "no") return "cut";
  const yesCount = verdicts.filter((v) => v === "yes").length;
  const noCount = verdicts.filter((v) => v === "no").length;
  if (yesCount >= 4 && noCount === 0) return "ship";
  return "hold";
}

export function buildEditorialBlock(rawJudgements: unknown): EditorialBlock {
  const judgements = normalizeEditorialJudgements(rawJudgements);
  return {
    judgements,
    editorial_verdict: deriveEditorialVerdict(judgements),
  };
}

/* ========================================================================== */
/* Missing-evidence query derivation                                          */
/* ========================================================================== */

export interface MissingEvidenceBucket {
  /** Short tag for the type of missing evidence (used for logging/UI). */
  bucket: string;
  /** Human-readable description used in the per-bucket Gemini prompt. */
  description: string;
  /** Concrete Google-search-friendly query string. */
  query: string;
}

/**
 * Heuristic patterns that map fragments of a rejection reason to a specific
 * missing-evidence bucket. Order matters: the first match wins per bucket so
 * we don't double-count, and the `bucket` id is used to dedupe across the
 * reason and the data_shape.
 */
const REASON_PATTERNS: {
  bucket: string;
  pattern: RegExp;
  describe: (ce: string) => { description: string; query: string };
}[] = [
  {
    bucket: "wait_times",
    pattern: /\b(wait|queue|line|lane|fast.?track|skip.?the.?line)\b/i,
    describe: (ce) => ({
      description: `current queue or wait-time evidence for ${ce} (peak hours, average wait, lane comparisons)`,
      query: `${ce} queue wait time skip the line minutes 2025`,
    }),
  },
  {
    bucket: "crowd_patterns",
    pattern: /\b(crowd|busy|busiest|quiet|peak hour|peak time|when to visit)\b/i,
    describe: (ce) => ({
      description: `crowd-pattern evidence for ${ce} (best/worst day, busiest hour, seasonal peaks)`,
      query: `${ce} best time to visit crowds busy hours days`,
    }),
  },
  {
    bucket: "prices_tickets",
    pattern: /\b(price|cost|fare|tier|ticket|inclusion|admission|pass)\b/i,
    describe: (ce) => ({
      description: `current ticket tiers, prices, and inclusions for ${ce}`,
      query: `${ce} ticket types prices inclusions 2025`,
    }),
  },
  {
    bucket: "opening_hours",
    pattern: /\b(hour|opening|closing|programme|schedule|last admission|open)\b/i,
    describe: (ce) => ({
      description: `opening hours, last-admission times, and weekly schedule for ${ce}`,
      query: `${ce} opening hours last admission schedule 2025`,
    }),
  },
  {
    bucket: "duration",
    pattern: /\b(duration|how long|spend|allow|takes|minutes|hours)\b/i,
    describe: (ce) => ({
      description: `typical visit duration / time-to-experience for ${ce}`,
      query: `${ce} how long does it take typical visit duration`,
    }),
  },
  {
    bucket: "history_dates",
    pattern: /\b(history|historical|date|century|founded|built|opened|origin|restoration)\b/i,
    describe: (ce) => ({
      description: `dated historical events for ${ce} suitable for a 5-9 step timeline`,
      query: `${ce} history timeline dates founded built opened`,
    }),
  },
  {
    bucket: "routes_stops",
    pattern: /\b(route|routes|stop|stops|pier|departure|itinerary|coverage|loop)\b/i,
    describe: (ce) => ({
      description: `routes, stops, piers, or coverage details for ${ce}`,
      query: `${ce} route stops map coverage loop`,
    }),
  },
  {
    bucket: "seasonality",
    pattern: /\b(season|seasonal|month|weather|rain|wind|sunset|cancellation|when)\b/i,
    describe: (ce) => ({
      description: `month-by-month seasonality, weather windows, or cancellation risk for ${ce}`,
      query: `${ce} best month season weather cancellation risk`,
    }),
  },
  {
    bucket: "zones_compare",
    pattern: /\b(zone|area|wing|gallery|level|deck|terrace|sub.?area|compare)\b/i,
    describe: (ce) => ({
      description: `comparison of named zones/areas/levels at ${ce} (visitor share, wait, payoff)`,
      query: `${ce} zones areas compare gallery level visitor highlights`,
    }),
  },
  {
    bucket: "sentiment",
    pattern: /\b(sentiment|review|complain|complaint|feedback|opinion|worth it|overrated)\b/i,
    describe: (ce) => ({
      description: `traveler sentiment and recurring pain points for ${ce} (reviews, forums)`,
      query: `${ce} reviews common complaints worth it tripadvisor reddit`,
    }),
  },
  {
    bucket: "booking_window",
    pattern: /\b(book|booking|advance|lead.?time|sell.?out|sold.?out)\b/i,
    describe: (ce) => ({
      description: `booking-window evidence for ${ce} (how far in advance to book, sell-out risk)`,
      query: `${ce} how far in advance book sell out lead time`,
    }),
  },
  {
    bucket: "rules_items",
    pattern:
      /\b(rule|rules|bag|backpack|security|prohibited|allowed|dress|dress.?code|cover|liquid|tripod|photography)\b/i,
    describe: (ce) => ({
      description: `official visitor rules / security / dress-code policy for ${ce} (what's allowed, prohibited, required)`,
      query: `${ce} official visitor rules dress code bag policy prohibited items`,
    }),
  },
  {
    bucket: "accessibility",
    pattern:
      /\b(accessibility|accessible|wheelchair|step.?free|elevator|lift|disabled|companion|sensory|audio.?guide)\b/i,
    describe: (ce) => ({
      description: `official accessibility provisions at ${ce} (wheelchair access, elevators, sensory aids, companion tickets)`,
      query: `${ce} accessibility wheelchair step-free elevator companion services`,
    }),
  },
  {
    bucket: "transit_access",
    pattern:
      /\b(transit|metro|subway|underground|bus|tram|train|shuttle|ferry|getting.?there|nearest.?stop|how.?to.?get)\b/i,
    describe: (ce) => ({
      description: `how to get to ${ce} by public transit (modes, lines, journey time, frequency, cost)`,
      query: `${ce} how to get there metro bus directions journey time`,
    }),
  },
];

/**
 * Lightweight extra patterns keyed off an archetype's `data_shape`, so the
 * recheck pipeline can derive a query even when the rejection reason was
 * vague. Each pattern is checked against the data-shape strings joined.
 */
const DATA_SHAPE_HINTS: {
  bucket: string;
  pattern: RegExp;
  describe: (ce: string) => { description: string; query: string };
}[] = [
  {
    bucket: "hourly_wait",
    pattern: /\bhour|hourly|wait.?time|queue\b/i,
    describe: (ce) => ({
      description: `hour-by-hour wait or visitor data for ${ce}`,
      query: `${ce} hour by hour wait time crowd peak`,
    }),
  },
  {
    bucket: "monthly_pattern",
    pattern: /\bmonth|seasonal|jan|dec\b/i,
    describe: (ce) => ({
      description: `month-by-month visitor / weather pattern for ${ce}`,
      query: `${ce} monthly visitors weather best month chart`,
    }),
  },
  {
    bucket: "tiers_prices",
    pattern: /\btier|tiers|price|inclusion\b/i,
    describe: (ce) => ({
      description: `ticket tiers + prices + inclusions table for ${ce}`,
      query: `${ce} ticket tiers price comparison inclusions`,
    }),
  },
];

/**
 * Build 1–3 targeted Gemini-with-search queries for a single rejected idea.
 * The CE name is woven into every query so results stay grounded.
 *
 * Rules:
 *   - Walk the rejection reason for known buckets first (most specific).
 *   - If we still have headroom, look at the archetype data_shape for
 *     additional buckets (catches vague rejections).
 *   - Always cap at 3 queries (cost control) and dedupe by bucket id.
 *   - When nothing matches, fall back to a single CE-name + question query
 *     so the recheck still does *something* useful.
 */
export function deriveMissingEvidenceQueries(args: {
  ceName: string;
  rejectionReason: string;
  question: string;
  dataShape?: string[];
  cap?: number;
}): MissingEvidenceBucket[] {
  const cap = Math.max(1, Math.min(3, args.cap ?? 3));
  const ceName = args.ceName.trim() || "the experience";
  const reason = args.rejectionReason ?? "";
  const seen = new Set<string>();
  const out: MissingEvidenceBucket[] = [];

  for (const { bucket, pattern, describe } of REASON_PATTERNS) {
    if (out.length >= cap) break;
    if (seen.has(bucket)) continue;
    if (!pattern.test(reason)) continue;
    const built = describe(ceName);
    out.push({ bucket, ...built });
    seen.add(bucket);
  }

  if (out.length < cap) {
    const shapeText = (args.dataShape ?? []).join(" ; ");
    if (shapeText) {
      for (const { bucket, pattern, describe } of DATA_SHAPE_HINTS) {
        if (out.length >= cap) break;
        if (seen.has(bucket)) continue;
        if (!pattern.test(shapeText)) continue;
        const built = describe(ceName);
        out.push({ bucket, ...built });
        seen.add(bucket);
      }
    }
  }

  if (out.length === 0) {
    const trimmedQuestion = args.question.trim().slice(0, 120) || "evidence";
    out.push({
      bucket: "general",
      description: `evidence for ${ceName} that would resolve: ${trimmedQuestion}`,
      query: `${ceName} ${trimmedQuestion}`,
    });
  }

  return out;
}
