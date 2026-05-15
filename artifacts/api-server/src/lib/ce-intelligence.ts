import { ai } from "@workspace/integrations-gemini-ai";
import { db, ceIntelligenceTable, type CeIntelligence } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { kindFromIntelSource, type EvidenceKind } from "./evidence-kind";

/* -------------------------------------------------------------------------- */
/* Types — buckets, facts, sources                                            */
/* -------------------------------------------------------------------------- */

export const INTEL_SOURCE_IDS = [
  "official_site",
  "tripadvisor",
  "getyourguide",
  "viator",
  "reddit",
  "headout",
] as const;
export type IntelSourceId = (typeof INTEL_SOURCE_IDS)[number];

export const INTEL_BUCKET_IDS = [
  "hours_programme",
  "tickets",
  "crowd_patterns",
  "wait_times",
  "zones",
  "co_bookings",
  "sentiment",
  "ops_notes",
] as const;
export type IntelBucketId = (typeof INTEL_BUCKET_IDS)[number];

export const INTEL_BUCKET_LABELS: Record<IntelBucketId, string> = {
  hours_programme: "Opening hours & programme",
  tickets: "Ticket types & prices",
  crowd_patterns: "Crowd patterns",
  wait_times: "Wait times",
  zones: "Popular zones & highlights",
  co_bookings: "Nearby & co-booked venues",
  sentiment: "Sentiment themes",
  ops_notes: "Operational notes",
};

/**
 * Evidence-type vocabulary. Each source adapter is responsible for the
 * evidence kinds it's actually good at — official site for ground truth,
 * TripAdvisor for tips/sentiment, Reddit for trip reports, OTAs for
 * product structure & pricing. The optional `evidence_type` field on
 * IntelFact lets the chart pipeline bias toward the right kind of
 * evidence per archetype, and lets the UI surface what each source
 * uniquely contributed.
 *
 * Field is OPTIONAL — old rows without it keep working unchanged.
 */
export const EVIDENCE_TYPE_IDS = [
  "authoritative_fact",
  "visitor_tip",
  "wait_anecdote",
  "sentiment_theme",
  "trip_report",
  "product_offering",
  "price_point",
  "bundle_pattern",
  "operational_change",
  "other",
] as const;
export type EvidenceTypeId = (typeof EVIDENCE_TYPE_IDS)[number];

export const EVIDENCE_TYPE_LABELS: Record<EvidenceTypeId, string> = {
  authoritative_fact: "Authoritative fact",
  visitor_tip: "Visitor tip",
  wait_anecdote: "Wait anecdote",
  sentiment_theme: "Sentiment theme",
  trip_report: "Trip report",
  product_offering: "Product offering",
  price_point: "Price point",
  bundle_pattern: "Bundle pattern",
  operational_change: "Operational change",
  other: "Other",
};

export interface IntelFact {
  /** Stable id per fact (source + index). Used for citation refs. */
  id: string;
  /** Bucket this fact belongs to. */
  bucket: IntelBucketId;
  /** Short headline value (e.g. "Open 8:15 to 18:50, Mon-Sat"). */
  value: string;
  /** Optional verbatim quote / excerpt from the source. */
  quote?: string;
  /** Source adapter that produced this fact. */
  source: IntelSourceId;
  /** Direct URL to the source page. */
  source_url?: string;
  /** 0-100 confidence the adapter assigned. */
  confidence: number;
  /** ISO timestamp when this fact was fetched. */
  fetched_at: string;
  /**
   * What KIND of evidence this fact represents (granular, Task #61).
   * Optional — older rows predate this field and still load cleanly.
   * New rows are tagged by the source-specific extraction prompt and
   * validated against the source's allowed evidence-type set.
   */
  evidence_type?: EvidenceTypeId;
  /**
   * Higher-level evidence-kind taxonomy (Task #63). Defaulted from the
   * adapter source via `kindFromIntelSource` so the citation popover and
   * writer review screen can colour-code each fact without re-deriving.
   * Complements `evidence_type`: `kind` groups by trust tier, while
   * `evidence_type` describes the granular content category.
   */
  kind?: EvidenceKind;
}

export interface IntelSourceStatus {
  source: IntelSourceId;
  /** "ok" | "empty" | "error" — most recent run result. */
  status: "ok" | "empty" | "error" | "pending";
  /** Number of facts currently attributed to this source. */
  fact_count: number;
  /** ISO timestamp of last attempted run. */
  last_tried_at: string | null;
  /** ISO timestamp of last successful (status=ok) run. */
  last_success_at: string | null;
  /** Human-readable error from the most recent failed run, if any. */
  error: string | null;
}

export interface IntelProfile {
  facts: IntelFact[];
  visualization_plan?: unknown;
}

export interface CeIntelligenceView {
  ceSlug: string;
  facts: IntelFact[];
  sources: IntelSourceStatus[];
  visualizationPlan?: unknown;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Adapter interface                                                          */
/* -------------------------------------------------------------------------- */

export interface AdapterContext {
  ce: { name: string; city: string; country: string; slug: string };
}

export interface AdapterResult {
  source: IntelSourceId;
  facts: Omit<IntelFact, "id" | "source" | "fetched_at">[];
}

export type IntelAdapter = (ctx: AdapterContext) => Promise<AdapterResult>;

/* -------------------------------------------------------------------------- */
/* Adapters                                                                    */
/* -------------------------------------------------------------------------- */

const MODEL = "gemini-2.5-pro";

interface GroundingChunk {
  web?: { uri?: string; title?: string };
}

const SOURCE_DOMAIN_HINTS: Partial<Record<IntelSourceId, string[]>> = {
  tripadvisor: ["tripadvisor."],
  getyourguide: ["getyourguide."],
  viator: ["viator."],
  reddit: ["reddit.com"],
};

function pullGroundingUrls(resp: unknown): string[] {
  const candidates = (resp as { candidates?: unknown[] } | undefined)
    ?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  const meta = (candidates[0] as { groundingMetadata?: unknown })
    ?.groundingMetadata;
  const chunks = (meta as { groundingChunks?: unknown[] } | undefined)
    ?.groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const urls: string[] = [];
  for (const c of chunks as GroundingChunk[]) {
    if (c?.web?.uri) urls.push(c.web.uri);
  }
  return urls;
}

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

const BUCKET_HINT = INTEL_BUCKET_IDS.map(
  (b) => `- ${b}: ${INTEL_BUCKET_LABELS[b]}`,
).join("\n");

function sourceUrlMatches(url: string | undefined, hints: string[]): boolean {
  if (!url) return hints.length === 0;
  if (hints.length === 0) return true;
  const lower = url.toLowerCase();
  return hints.some((hint) => lower.includes(hint));
}

function clampInt(v: unknown, lo: number, hi: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

/* -------------------------------------------------------------------------- */
/* Source-specific adapters                                                    */
/* -------------------------------------------------------------------------- */

interface SubQuery {
  /** Short label used in logs to identify which sub-query produced what. */
  label: string;
  query: string;
}

interface SourceConfig {
  source: IntelSourceId;
  /**
   * Plain-language description of which page types on this source the
   * adapter is expected to read. Surfaced in the extraction prompt.
   */
  sourceGuidance: string;
  /** Build 2-4 targeted sub-queries to broaden coverage of this source. */
  subQueries: (ctx: AdapterContext) => SubQuery[];
  /**
   * Evidence types this source is allowed to produce. The model is told
   * to map each fact to ONE of these, and any fact tagged with anything
   * else is dropped (or coerced to "other" with low confidence).
   */
  validEvidenceTypes: EvidenceTypeId[];
  /**
   * Source-specific extraction brief explaining what to look for, what
   * to skip (because another source covers it better), and a few
   * concrete good/bad examples. Inlined into the per-source prompt.
   */
  extractionBrief: string;
}

const SOURCE_CONFIGS: Record<IntelSourceId, SourceConfig | null> = {
  official_site: {
    source: "official_site",
    sourceGuidance:
      "the operator's own website (visit-info, hours, tickets, accessibility, FAQ, news / closure pages) — this is the AUTHORITATIVE source for ground truth",
    subQueries: (ctx) => [
      {
        label: "hours_tickets",
        query: `${ctx.ce.name} ${ctx.ce.city} official site opening hours tickets`,
      },
      {
        label: "accessibility_rules",
        query: `${ctx.ce.name} ${ctx.ce.city} official accessibility visitor rules`,
      },
      {
        label: "closures_news",
        query: `${ctx.ce.name} ${ctx.ce.city} official closure schedule announcements`,
      },
    ],
    validEvidenceTypes: [
      "authoritative_fact",
      "operational_change",
      "price_point",
      "product_offering",
    ],
    extractionBrief: `Look for:
- Authoritative ground truth: opening / closing times, last-admission times, weekly closures, official ticket categories and prices, accessibility provisions, dress code or bag rules, official visitor programme (mass times, guided-tour slots).
- Operational changes the OPERATOR has announced: temporary closures, scaffolding/restoration windows, refurbishments, official policy changes.

Do NOT extract:
- Visitor opinions, "best time to visit" sentiment, ranking position — that's TripAdvisor's job.
- Trip reports, recent first-hand experiences, traveler hacks — that's Reddit's job.
- Third-party tour formats, OTA bundles, comparative pricing — that's GetYourGuide / Viator's job.

Good fact: { value: "Last entry 18:30; building closes 19:00", evidence_type: "authoritative_fact" }
Bad fact: { value: "Most visitors recommend going in the early morning to avoid crowds" } — that's a visitor tip, not authoritative ground truth, skip it.`,
  },
  tripadvisor: {
    source: "tripadvisor",
    sourceGuidance:
      "TripAdvisor only — attraction review pages, the destination forum, Q&A, traveler tips, and the ranking/category pages",
    subQueries: (ctx) => [
      {
        label: "reviews",
        query: `site:tripadvisor.com ${ctx.ce.name} ${ctx.ce.city} reviews tips`,
      },
      {
        label: "forum",
        query: `site:tripadvisor.com forum ${ctx.ce.name} ${ctx.ce.city} best time avoid crowds`,
      },
      {
        label: "qa",
        query: `site:tripadvisor.com ${ctx.ce.name} ${ctx.ce.city} questions answers wait time`,
      },
    ],
    validEvidenceTypes: [
      "visitor_tip",
      "wait_anecdote",
      "sentiment_theme",
      "trip_report",
    ],
    extractionBrief: `Look for:
- Recurring visitor TIPS in reviews and forum threads ("go right at opening", "buy the combo, not the single", "skip the audio guide").
- WAIT-TIME anecdotes with concrete numbers ("we waited 90 minutes at noon", "no line at 8:30 am").
- SENTIMENT THEMES that recur across many reviews (loved/hated patterns, common complaints, ranking position).
- Forum trip reports describing a specific visit.

Do NOT extract:
- Official opening hours, official ticket prices, ground-truth facts — those belong to the official site.
- OTA-style "this product is best for groups of X" framing — that's GetYourGuide / Viator.
- Generic city tips not tied to this CE.

Good fact: { value: "Reviewers consistently flag the 11am-2pm wait as 60-90 min vs ~15 min before 9:30", evidence_type: "wait_anecdote" }
Good fact: { value: "Top 3 attractions in ${ "${city}" } per current TripAdvisor ranking", evidence_type: "sentiment_theme" }
Bad fact: { value: "Open daily 8:00-18:00" } — that's an authoritative_fact owned by the official site, skip it.`,
  },
  reddit: {
    source: "reddit",
    sourceGuidance:
      "Reddit only — comment threads on the relevant city subreddit, r/travel, r/solotravel, and any topic-specific subreddit",
    subQueries: (ctx) => {
      const cityHandle = ctx.ce.city.toLowerCase().replace(/[^a-z0-9]/g, "");
      return [
        {
          label: "city_sub",
          query: `site:reddit.com r/${cityHandle} ${ctx.ce.name} tips tickets`,
        },
        {
          label: "r_travel",
          query: `site:reddit.com r/travel ${ctx.ce.name} ${ctx.ce.city} trip report`,
        },
        {
          label: "recent_changes",
          query: `site:reddit.com ${ctx.ce.name} ${ctx.ce.city} "just went" OR "last week" OR "now closed"`,
        },
      ];
    },
    validEvidenceTypes: [
      "trip_report",
      "visitor_tip",
      "operational_change",
      "wait_anecdote",
    ],
    extractionBrief: `Look for:
- TRIP REPORTS: recent first-hand experiences ("we just visited last week, here's what surprised us").
- Lesser-known TIPS / hacks redditors share that wouldn't show up on operator pages (alternate entrances, less-known skip-the-line tactics, specific scams to avoid).
- OPERATIONAL CHANGES the official site hasn't yet acknowledged ("scaffolding came down last month", "the side entrance is closed for restoration").
- Concrete WAIT anecdotes with dates ("waited 2 hours on Sat at 11am, July 2024").

Do NOT extract:
- Generic SEO-listicle "best time to visit" advice not tied to a specific redditor's experience.
- Official ticket prices or hours — those belong to the official site.
- Standard product offerings — those belong to OTAs.
- Pure-sentiment one-liners ("loved it!"); prefer concrete reports with detail.

Good fact: { value: "Recent r/${ "${city}" } posts say the secondary entrance now opens at 8 am instead of 9 am", evidence_type: "operational_change" }
Bad fact: { value: "It's a beautiful place" } — too generic, skip.`,
  },
  getyourguide: {
    source: "getyourguide",
    sourceGuidance:
      "GetYourGuide only — product pages, category/listing pages, top-selling product details (durations, inclusions, languages, cancellation, price ladders)",
    subQueries: (ctx) => [
      {
        label: "listing",
        query: `site:getyourguide.com ${ctx.ce.name} ${ctx.ce.city} tours tickets`,
      },
      {
        label: "top_product",
        query: `site:getyourguide.com ${ctx.ce.name} ${ctx.ce.city} skip the line guided tour duration`,
      },
      {
        label: "combos",
        query: `site:getyourguide.com ${ctx.ce.name} ${ctx.ce.city} combo combined ticket`,
      },
    ],
    validEvidenceTypes: [
      "product_offering",
      "price_point",
      "bundle_pattern",
      "operational_change",
    ],
    extractionBrief: `Look for:
- PRODUCT OFFERINGS: distinct tour formats (skip-the-line, guided, audio-guide, semi-private, with-host), typical durations, language options, cancellation terms, what's included/excluded.
- PRICE POINTS for the headline products (e.g. "skip-the-line ticket from €27", "small-group guided 2h from €69").
- BUNDLE PATTERNS: which combos / co-bookings GetYourGuide sells (e.g. "Vatican + Sistine Chapel + St. Peter's combo"), and which products are flagged "best-seller".

Do NOT extract:
- Reviews or visitor sentiment — that's TripAdvisor's job.
- Official operator hours/policies — those belong to the official site.
- Generic city facts.

Good fact: { value: "GetYourGuide best-seller is a 2.5-hour skip-the-line guided tour from €54", evidence_type: "product_offering" }
Good fact: { value: "Common combo: ${ "${ce_name}" } + nearby museum + audio guide, €79", evidence_type: "bundle_pattern" }`,
  },
  viator: {
    source: "viator",
    sourceGuidance:
      "Viator only — product pages, listing pages, top-rated product details (durations, inclusions, languages, cancellation, price ladders)",
    subQueries: (ctx) => [
      {
        label: "listing",
        query: `site:viator.com ${ctx.ce.name} ${ctx.ce.city} tours tickets`,
      },
      {
        label: "top_product",
        query: `site:viator.com ${ctx.ce.name} ${ctx.ce.city} guided tour duration price`,
      },
      {
        label: "combos",
        query: `site:viator.com ${ctx.ce.name} ${ctx.ce.city} combo day trip`,
      },
    ],
    validEvidenceTypes: [
      "product_offering",
      "price_point",
      "bundle_pattern",
      "operational_change",
    ],
    extractionBrief: `Look for:
- PRODUCT OFFERINGS: distinct tour formats Viator sells (private, small-group, full-day, multi-day), durations, languages, inclusions, cancellation policy.
- PRICE POINTS for headline products in local currency or USD.
- BUNDLE PATTERNS: combo tickets, day-trip pairings, multi-attraction passes.

Do NOT extract:
- Reviews or sentiment themes — that's TripAdvisor.
- Official operator hours/policies — that's the official site.

Good fact: { value: "Viator top-rated full-day tour pairs ${ "${ce_name}" } with nearby UNESCO site, $129", evidence_type: "bundle_pattern" }`,
  },
  // Headout adapter is intentionally a stub — see headoutAdapter below.
  headout: null,
};

const SUBQUERY_MAX_TOKENS = 1800;
const SUBQUERY_FACT_CAP = 8;

/**
 * Run a single source-specific sub-query and parse facts. Per-sub-query
 * failures throw; the caller (`runSourceAdapter`) catches and isolates
 * them so one bad query never fails the whole adapter.
 */
async function runSubQuery(
  config: SourceConfig,
  ctx: AdapterContext,
  subQuery: SubQuery,
): Promise<AdapterResult["facts"]> {
  const validTypesList = config.validEvidenceTypes
    .map((t) => `"${t}"`)
    .join(", ");

  const prompt = `You are populating a research profile for a Headout listing-page tool.

CE: ${ctx.ce.name} (${ctx.ce.city}, ${ctx.ce.country})
Source under inspection: ${config.sourceGuidance}
Sub-query focus: ${subQuery.label} — "${subQuery.query}"

This source has a SPECIALTY. Stay in your lane:

${config.extractionBrief}

Use Google Search with the sub-query above to gather information. Map each fact to ONE of these BUCKETS:
${BUCKET_HINT}

And tag each fact with ONE of these EVIDENCE TYPES (this source is only allowed to produce these kinds): ${validTypesList}.

Output STRICT JSON only (no markdown), shape:
{
  "facts": [
    {
      "bucket": "<bucket id>",
      "evidence_type": "<one of the allowed evidence types above>",
      "value": "<one short standalone sentence with the actual fact, ≤180 chars>",
      "quote": "<optional verbatim phrase from the source, ≤240 chars>",
      "source_url": "<canonical page url you read>",
      "confidence": <0-100 int — how clearly the source stated this>
    },
    ... up to ${SUBQUERY_FACT_CAP} items
  ]
}

Rules:
- Do NOT invent facts. If the sub-query yields nothing useful, return { "facts": [] }.
- Stay on the named source. Do not fill TripAdvisor/GetYourGuide/Viator/Reddit rows with official-site facts.
- If Google Search only surfaces pages from OTHER sources for this sub-query, return an empty facts array rather than copy them.
- Each "value" should be standalone and readable — no pronouns referring to the surrounding text.
- Honour the "Do NOT extract" guidance above — facts that belong to another source must be skipped.
- Today is ${new Date().toISOString().slice(0, 10)}.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: 0.3,
      maxOutputTokens: SUBQUERY_MAX_TOKENS,
      tools: [{ googleSearch: {} }],
    },
  });

  const raw = response.text ?? "";
  const groundedUrls = pullGroundingUrls(response);
  const parsed = safeJson<{
    facts?: {
      bucket?: string;
      evidence_type?: string;
      value?: string;
      quote?: string;
      source_url?: string;
      confidence?: number;
    }[];
  }>(raw);
  const rawFacts = parsed?.facts ?? [];

  const out: AdapterResult["facts"] = [];
  const allowedDomains = SOURCE_DOMAIN_HINTS[config.source] ?? [];
  const allowedTypes = new Set<EvidenceTypeId>(config.validEvidenceTypes);

  for (const f of rawFacts) {
    const bucket = f.bucket as IntelBucketId | undefined;
    const value = (f.value ?? "").trim();
    if (!bucket || !INTEL_BUCKET_IDS.includes(bucket)) continue;
    if (!value) continue;

    let evidenceType: EvidenceTypeId | undefined;
    const rawType = f.evidence_type as EvidenceTypeId | undefined;
    if (rawType && allowedTypes.has(rawType)) {
      evidenceType = rawType;
    } else if (rawType === "other") {
      evidenceType = "other";
    } else if (rawType) {
      // Type belongs to a different source's specialty — skip the fact
      // rather than store mis-tagged evidence. Keeps adapters honest.
      continue;
    }

    const sourceUrl = f.source_url
      ? String(f.source_url)
      : groundedUrls.find((url) => sourceUrlMatches(url, allowedDomains)) ??
        groundedUrls[0];
    if (
      allowedDomains.length > 0 &&
      !sourceUrlMatches(sourceUrl, allowedDomains)
    ) {
      continue;
    }

    out.push({
      bucket,
      value: value.slice(0, 220),
      ...(f.quote ? { quote: String(f.quote).slice(0, 280) } : {}),
      ...(sourceUrl ? { source_url: sourceUrl } : {}),
      confidence: clampInt(f.confidence ?? 60, 0, 100),
      ...(evidenceType ? { evidence_type: evidenceType } : {}),
    });
  }

  return out;
}

/**
 * Normalize a fact value for dedup: lowercase, collapse whitespace,
 * strip non-alphanumerics, take first 80 chars. Catches near-identical
 * facts that surface from multiple sub-queries on the same source.
 */
function dedupKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function dedupeFacts(
  facts: AdapterResult["facts"],
): AdapterResult["facts"] {
  const seen = new Map<string, AdapterResult["facts"][number]>();
  for (const f of facts) {
    const key = dedupKey(f.value);
    if (!key) continue;
    const prev = seen.get(key);
    if (!prev || f.confidence > prev.confidence) {
      seen.set(key, f);
    }
  }
  return Array.from(seen.values());
}

/**
 * Run all sub-queries for a source in parallel, isolate per-sub-query
 * failures, merge & dedupe. A single sub-query failure must not fail
 * the whole adapter.
 */
async function runSourceAdapter(
  config: SourceConfig,
  ctx: AdapterContext,
): Promise<AdapterResult> {
  const subQueries = config.subQueries(ctx);
  const results = await Promise.allSettled(
    subQueries.map((q) => runSubQuery(config, ctx, q)),
  );

  const merged: AdapterResult["facts"] = [];
  let firstError: unknown = null;
  let okCount = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i]!;
    if (r.status === "fulfilled") {
      okCount++;
      merged.push(...r.value);
    } else {
      firstError ??= r.reason;
      logger.warn(
        {
          source: config.source,
          sub_query: subQueries[i]?.label,
          err: r.reason,
          slug: ctx.ce.slug,
        },
        "Intel sub-query failed",
      );
    }
  }

  // If every sub-query failed, propagate so the orchestrator marks the
  // whole source as "error" rather than silently empty.
  if (okCount === 0 && firstError) {
    throw firstError;
  }

  return { source: config.source, facts: dedupeFacts(merged) };
}

const officialSiteAdapter: IntelAdapter = (ctx) =>
  runSourceAdapter(SOURCE_CONFIGS.official_site!, ctx);
const tripAdvisorAdapter: IntelAdapter = (ctx) =>
  runSourceAdapter(SOURCE_CONFIGS.tripadvisor!, ctx);
const getYourGuideAdapter: IntelAdapter = (ctx) =>
  runSourceAdapter(SOURCE_CONFIGS.getyourguide!, ctx);
const viatorAdapter: IntelAdapter = (ctx) =>
  runSourceAdapter(SOURCE_CONFIGS.viator!, ctx);
const redditAdapter: IntelAdapter = (ctx) =>
  runSourceAdapter(SOURCE_CONFIGS.reddit!, ctx);

/**
 * Headout adapter — stub for now.
 *
 * The intent is to read from Headout's internal listing/booking API once
 * that's wired up. Until then, we leave a clean adapter seam: return an
 * empty result with status "empty" so the UI can render the source row
 * with "no listing data wired up yet" instead of an error.
 *
 * A CSV-import seam can later populate `lib/headout-listing-import` and
 * be wired into this adapter without touching the orchestrator.
 */
const headoutAdapter: IntelAdapter = async (_ctx) => ({
  source: "headout",
  facts: [],
});

export const ADAPTERS: Record<IntelSourceId, IntelAdapter> = {
  official_site: officialSiteAdapter,
  tripadvisor: tripAdvisorAdapter,
  getyourguide: getYourGuideAdapter,
  viator: viatorAdapter,
  reddit: redditAdapter,
  headout: headoutAdapter,
};

/* -------------------------------------------------------------------------- */
/* Orchestrator                                                                */
/* -------------------------------------------------------------------------- */

export interface RefreshOptions {
  /** Only run these adapters; default is all. */
  sources?: IntelSourceId[];
}

export async function refreshCeIntelligence(
  ctx: AdapterContext,
  opts: RefreshOptions = {},
): Promise<CeIntelligenceView> {
  const sourceIds = opts.sources?.filter((s) => INTEL_SOURCE_IDS.includes(s))
    ?? [...INTEL_SOURCE_IDS];

  // Load existing profile so we can merge per-source updates rather than
  // wipe everything when a single source is refreshed.
  const existing = await loadIntelRow(ctx.ce.slug);

  // Run adapters in parallel; isolate per-source failures.
  const now = new Date().toISOString();
  const results = await Promise.allSettled(
    sourceIds.map(async (id) => {
      const adapter = ADAPTERS[id];
      const result = await adapter(ctx);
      return { id, result };
    }),
  );

  const facts: IntelFact[] = (existing?.profile?.facts ?? []).filter(
    (f) => !sourceIds.includes(f.source),
  );
  const sources: Record<string, IntelSourceStatus> = {
    ...(existing?.sources ?? {}),
  };

  for (let i = 0; i < results.length; i++) {
    const id = sourceIds[i]!;
    const r = results[i]!;
    const prev = sources[id] ?? emptyStatus(id);
    if (r.status === "fulfilled") {
      const { result } = r.value;
      const newFacts: IntelFact[] = result.facts.map((f, idx) => ({
        id: `${id}-${Date.now()}-${idx}`,
        bucket: f.bucket,
        value: f.value,
        ...(f.quote ? { quote: f.quote } : {}),
        source: id,
        ...(f.source_url ? { source_url: f.source_url } : {}),
        confidence: f.confidence,
        fetched_at: now,
        ...(f.evidence_type ? { evidence_type: f.evidence_type } : {}),
        kind: kindFromIntelSource(id),
      }));
      facts.push(...newFacts);
      sources[id] = {
        source: id,
        status: newFacts.length > 0 ? "ok" : "empty",
        fact_count: newFacts.length,
        last_tried_at: now,
        last_success_at: newFacts.length > 0 ? now : prev.last_success_at,
        error: null,
      };
    } else {
      const err = r.reason;
      const message =
        err instanceof Error ? err.message : String(err ?? "unknown error");
      logger.warn(
        { err, source: id, slug: ctx.ce.slug },
        "Intel adapter failed",
      );
      sources[id] = {
        source: id,
        status: "error",
        fact_count: prev.fact_count,
        last_tried_at: now,
        last_success_at: prev.last_success_at,
        error: message.slice(0, 240),
      };
      // Keep prior facts for this source on failure.
      const carried = (existing?.profile?.facts ?? []).filter(
        (f) => f.source === id,
      );
      facts.push(...carried);
    }
  }

  // Ensure we have a status row for every known source (so the UI can
  // render every adapter even when never run).
  for (const id of INTEL_SOURCE_IDS) {
    if (!sources[id]) sources[id] = emptyStatus(id);
  }

  const profile: IntelProfile = { facts };
  if (existing?.profile?.visualization_plan) {
    profile.visualization_plan = existing.profile.visualization_plan;
  }
  const sourcesValue = sources as unknown as Record<string, unknown>;
  const profileValue = profile as unknown as Record<string, unknown>;

  const [row] = await db
    .insert(ceIntelligenceTable)
    .values({
      ceSlug: ctx.ce.slug,
      profile: profileValue,
      sources: sourcesValue,
    })
    .onConflictDoUpdate({
      target: ceIntelligenceTable.ceSlug,
      set: {
        profile: profileValue,
        sources: sourcesValue,
      },
    })
    .returning();
  if (!row) throw new Error("Failed to persist CE intelligence");
  return serializeIntel(row);
}

export async function getCeIntelligence(
  ceSlug: string,
): Promise<CeIntelligenceView | null> {
  const row = await loadIntelRowFull(ceSlug);
  if (!row) return null;
  return serializeIntel(row);
}

export async function deleteIntelSource(
  ceSlug: string,
  source: IntelSourceId,
): Promise<CeIntelligenceView | null> {
  const row = await loadIntelRowFull(ceSlug);
  if (!row) return null;
  const profile = (row.profile ?? {}) as unknown as IntelProfile;
  const sources = (row.sources ?? {}) as Record<string, IntelSourceStatus>;
  const facts = (profile.facts ?? []).filter((f) => f.source !== source);
  sources[source] = emptyStatus(source);
  const [updated] = await db
    .update(ceIntelligenceTable)
    .set({
      profile: {
        facts,
        ...(profile.visualization_plan
          ? { visualization_plan: profile.visualization_plan }
          : {}),
      } as unknown as Record<string, unknown>,
      sources: sources as unknown as Record<string, unknown>,
    })
    .where(eq(ceIntelligenceTable.ceSlug, ceSlug))
    .returning();
  if (!updated) return null;
  return serializeIntel(updated);
}

function emptyStatus(source: IntelSourceId): IntelSourceStatus {
  return {
    source,
    status: "pending",
    fact_count: 0,
    last_tried_at: null,
    last_success_at: null,
    error: null,
  };
}

interface IntelRowShape {
  profile?: IntelProfile;
  sources?: Record<string, IntelSourceStatus>;
}

async function loadIntelRow(
  ceSlug: string,
): Promise<IntelRowShape | null> {
  const [row] = await db
    .select()
    .from(ceIntelligenceTable)
    .where(eq(ceIntelligenceTable.ceSlug, ceSlug));
  if (!row) return null;
  return {
    profile: (row.profile ?? {}) as unknown as IntelProfile,
    sources: (row.sources ?? {}) as Record<string, IntelSourceStatus>,
  };
}

async function loadIntelRowFull(
  ceSlug: string,
): Promise<CeIntelligence | null> {
  const [row] = await db
    .select()
    .from(ceIntelligenceTable)
    .where(eq(ceIntelligenceTable.ceSlug, ceSlug));
  return row ?? null;
}

function serializeIntel(row: CeIntelligence): CeIntelligenceView {
  const profile = (row.profile ?? {}) as unknown as IntelProfile;
  const sourcesMap = (row.sources ?? {}) as Record<string, IntelSourceStatus>;
  const sources: IntelSourceStatus[] = INTEL_SOURCE_IDS.map(
    (id) => sourcesMap[id] ?? emptyStatus(id),
  );
  return {
    ceSlug: row.ceSlug,
    facts: profile.facts ?? [],
    sources,
    ...(profile.visualization_plan
      ? { visualizationPlan: profile.visualization_plan }
      : {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function saveCeVisualizationPlan(
  ceSlug: string,
  plan: unknown,
): Promise<CeIntelligenceView> {
  const existing = await loadIntelRow(ceSlug);
  const profile: IntelProfile = {
    facts: existing?.profile?.facts ?? [],
    visualization_plan: plan,
  };
  const sources =
    existing?.sources ??
    Object.fromEntries(INTEL_SOURCE_IDS.map((id) => [id, emptyStatus(id)]));

  const [row] = await db
    .insert(ceIntelligenceTable)
    .values({
      ceSlug,
      profile: profile as unknown as Record<string, unknown>,
      sources: sources as unknown as Record<string, unknown>,
    })
    .onConflictDoUpdate({
      target: ceIntelligenceTable.ceSlug,
      set: {
        profile: profile as unknown as Record<string, unknown>,
        sources: sources as unknown as Record<string, unknown>,
      },
    })
    .returning();
  if (!row) throw new Error("Failed to persist CE visualization plan");
  return serializeIntel(row);
}

/* -------------------------------------------------------------------------- */
/* Pipeline integration helpers                                               */
/* -------------------------------------------------------------------------- */

const ARCHETYPE_BUCKET_HINTS: Record<string, IntelBucketId[]> = {
  weekly_pattern: ["crowd_patterns", "hours_programme"],
  hourly_heatmap: ["crowd_patterns", "hours_programme"],
  month_calendar: ["crowd_patterns", "ops_notes"],
  seasonal_curve: ["crowd_patterns", "ops_notes"],
  booking_window: ["tickets", "crowd_patterns"],
  stat_grid: ["wait_times", "tickets", "hours_programme"],
  compare_zones: ["zones", "wait_times"],
  donut_breakdown: ["tickets", "sentiment"],
  ticket_ladder: ["tickets"],
  daily_programme: ["hours_programme"],
  time_split: ["zones", "hours_programme"],
  history_timeline: ["ops_notes", "zones"],
  slot_compare: ["crowd_patterns", "hours_programme"],
  zone_crowd_heatmap: ["zones", "crowd_patterns"],
  zone_wait_heatmap: ["zones", "wait_times"],
  conditions_calendar: ["ops_notes"],
  sighting_probability: ["ops_notes"],
  departure_reliability: ["ops_notes"],
  price_curve: ["tickets"],
  route_profile: ["zones", "hours_programme", "ops_notes"],
  daily_pattern: ["crowd_patterns"],
  tribune_density: ["crowd_patterns"],
  duration_profiles: ["zones"],
  duration_stat: ["zones"],
  entrance_lanes: ["wait_times"],
  co_bookings: ["co_bookings"],
};

export interface IntelSlice {
  /** Facts pertinent to a chart's archetype, capped to the most useful. */
  facts: IntelFact[];
}

/**
 * Per-archetype evidence-type affinity. Facts whose `evidence_type` is
 * in this set are ranked above bucket-only matches when slicing.
 * Backward-compatible: facts without `evidence_type` (older rows) fall
 * through to the confidence-only sort, so existing decks keep working.
 */
const ARCHETYPE_EVIDENCE_AFFINITY: Record<string, EvidenceTypeId[]> = {
  // Wait/queue charts: lean on first-hand wait anecdotes and tips.
  compare_zones: ["wait_anecdote", "visitor_tip"],
  queue_compare: ["wait_anecdote", "visitor_tip"],
  zone_wait_heatmap: ["wait_anecdote", "visitor_tip"],
  zone_wait_compare: ["wait_anecdote", "visitor_tip"],
  ride_wait_curve: ["wait_anecdote", "visitor_tip"],
  opening_hour_rank: ["wait_anecdote", "visitor_tip"],
  entrance_lanes: ["wait_anecdote", "visitor_tip"],
  // Crowd / pattern charts: visitor tips + wait anecdotes are richest.
  weekly_pattern: ["visitor_tip", "wait_anecdote", "trip_report"],
  hourly_heatmap: ["visitor_tip", "wait_anecdote", "trip_report"],
  daily_pattern: ["visitor_tip", "wait_anecdote"],
  zone_crowd_heatmap: ["visitor_tip", "trip_report"],
  tribune_density: ["visitor_tip", "wait_anecdote"],
  // Price / ticket charts: explicit price points + product offerings.
  ticket_ladder: ["price_point", "product_offering"],
  price_curve: ["price_point", "product_offering"],
  savings_breakdown: ["price_point", "product_offering"],
  // Operational / conditions / reliability: operational changes + trip reports.
  conditions_calendar: ["operational_change", "trip_report"],
  departure_reliability: ["operational_change", "authoritative_fact"],
  month_calendar: ["operational_change", "trip_report"],
  seasonal_curve: ["trip_report", "operational_change"],
  // Co-bookings / bundles: bundle patterns from OTAs.
  co_bookings: ["bundle_pattern", "product_offering"],
  // Sentiment-flavored archetypes: sentiment themes + visitor tips.
  donut_breakdown: ["sentiment_theme", "visitor_tip"],
  // Programme / authoritative timing: official ground truth.
  daily_programme: ["authoritative_fact"],
  history_timeline: ["authoritative_fact"],
  // Comparison / slot charts: product offerings + visitor tips.
  slot_compare: ["product_offering", "visitor_tip", "wait_anecdote"],
  // Routes & duration: product offerings + trip reports.
  route_profile: ["product_offering", "trip_report"],
  duration_profiles: ["trip_report", "visitor_tip"],
  duration_stat: ["trip_report", "visitor_tip"],
};

export function sliceIntelForArchetype(
  view: CeIntelligenceView | null,
  archetype: string,
  cap = 8,
): IntelSlice {
  if (!view || view.facts.length === 0) return { facts: [] };
  const buckets = new Set<IntelBucketId>(
    ARCHETYPE_BUCKET_HINTS[archetype] ?? [],
  );
  const affinity = new Set<EvidenceTypeId>(
    ARCHETYPE_EVIDENCE_AFFINITY[archetype] ?? [],
  );
  const matched = view.facts.filter((f) => buckets.has(f.bucket));
  // Stable rank: evidence-type match → +200 boost over confidence so a
  // perfectly-matched-evidence-type fact at conf 60 beats an unmatched
  // fact at conf 99. Untagged facts (legacy rows) get no boost and
  // sort by confidence as before — backward compatible.
  matched.sort((a, b) => {
    const aBoost =
      a.evidence_type && affinity.has(a.evidence_type) ? 200 : 0;
    const bBoost =
      b.evidence_type && affinity.has(b.evidence_type) ? 200 : 0;
    return b.confidence + bBoost - (a.confidence + aBoost);
  });
  return { facts: matched.slice(0, cap) };
}

export function formatIntelFactsForPrompt(facts: IntelFact[]): string {
  if (facts.length === 0) return "(no intelligence facts available)";
  return facts
    .map(
      (f) =>
        `- [${f.id}] (${f.source}, kind:${f.kind ?? kindFromIntelSource(f.source)}, conf ${f.confidence}) ${f.value}` +
        (f.source_url ? ` — ${f.source_url}` : ""),
    )
    .join("\n");
}
