import { ai } from "@workspace/integrations-gemini-ai";
import { db, ceIntelligenceTable, type CeIntelligence } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

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

/**
 * Run a single Gemini grounded search restricted to the given source query
 * and ask it to extract structured facts into the bucketed shape.
 */
async function runGroundedAdapter(
  source: IntelSourceId,
  ctx: AdapterContext,
  searchQuery: string,
): Promise<AdapterResult> {
  const prompt = `You are building a research profile for a Headout listing-page tool.

CE: ${ctx.ce.name} (${ctx.ce.city}, ${ctx.ce.country})

Use Google Search with this query to gather information ONLY from the indicated source:
"${searchQuery}"

Extract concrete, useful facts a ticketing CMS team would want when designing visualizations. Group every fact under one of these buckets:
${BUCKET_HINT}

Output STRICT JSON only (no markdown), shape:
{
  "facts": [
    {
      "bucket": "<one of the bucket ids above>",
      "value": "<one short sentence with the actual fact, ≤180 chars>",
      "quote": "<optional verbatim phrase from the source, ≤240 chars>",
      "source_url": "<canonical page url you read>",
      "confidence": <0-100 int — your confidence based on how clearly the source stated this>
    },
    ... up to 12 items
  ]
}

Rules:
- Do NOT invent facts. If the source has nothing useful, return { "facts": [] }.
- Each "value" should be standalone and readable — no pronouns referring to context.
- Prefer numbers, dates, opening hours, prices, named zones, crowd descriptions, queue minutes.
- If the source contradicts common knowledge, prefer what the source says — confidence reflects clarity, not plausibility.
- Today is ${new Date().toISOString().slice(0, 10)}.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: 0.3,
      maxOutputTokens: 3072,
      tools: [{ googleSearch: {} }],
    },
  });

  const raw = response.text ?? "";
  const groundedUrls = pullGroundingUrls(response);
  const parsed = safeJson<{
    facts?: {
      bucket?: string;
      value?: string;
      quote?: string;
      source_url?: string;
      confidence?: number;
    }[];
  }>(raw);
  const rawFacts = parsed?.facts ?? [];

  const out: AdapterResult["facts"] = [];
  for (const f of rawFacts) {
    const bucket = f.bucket as IntelBucketId | undefined;
    const value = (f.value ?? "").trim();
    if (!bucket || !INTEL_BUCKET_IDS.includes(bucket)) continue;
    if (!value) continue;
    out.push({
      bucket,
      value: value.slice(0, 220),
      ...(f.quote ? { quote: String(f.quote).slice(0, 280) } : {}),
      ...(f.source_url
        ? { source_url: String(f.source_url) }
        : groundedUrls[0]
          ? { source_url: groundedUrls[0] }
          : {}),
      confidence: clampInt(f.confidence ?? 60, 0, 100),
    });
  }

  return { source, facts: out };
}

function clampInt(v: unknown, lo: number, hi: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

const officialSiteAdapter: IntelAdapter = (ctx) =>
  runGroundedAdapter(
    "official_site",
    ctx,
    `${ctx.ce.name} ${ctx.ce.city} official site opening hours tickets visitor information`,
  );

const tripAdvisorAdapter: IntelAdapter = (ctx) =>
  runGroundedAdapter(
    "tripadvisor",
    ctx,
    `site:tripadvisor.com ${ctx.ce.name} ${ctx.ce.city} reviews wait time tips`,
  );

const getYourGuideAdapter: IntelAdapter = (ctx) =>
  runGroundedAdapter(
    "getyourguide",
    ctx,
    `site:getyourguide.com ${ctx.ce.name} ${ctx.ce.city} ticket types prices skip the line`,
  );

const viatorAdapter: IntelAdapter = (ctx) =>
  runGroundedAdapter(
    "viator",
    ctx,
    `site:viator.com ${ctx.ce.name} ${ctx.ce.city} ticket types tour options`,
  );

const redditAdapter: IntelAdapter = (ctx) =>
  runGroundedAdapter(
    "reddit",
    ctx,
    `site:reddit.com ${ctx.ce.name} ${ctx.ce.city} best time to visit crowds tips`,
  );

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

export function sliceIntelForArchetype(
  view: CeIntelligenceView | null,
  archetype: string,
  cap = 8,
): IntelSlice {
  if (!view || view.facts.length === 0) return { facts: [] };
  const buckets = new Set<IntelBucketId>(
    ARCHETYPE_BUCKET_HINTS[archetype] ?? [],
  );
  const matched = view.facts.filter((f) => buckets.has(f.bucket));
  matched.sort((a, b) => b.confidence - a.confidence);
  return { facts: matched.slice(0, cap) };
}

export function formatIntelFactsForPrompt(facts: IntelFact[]): string {
  if (facts.length === 0) return "(no intelligence facts available)";
  return facts
    .map(
      (f) =>
        `- [${f.id}] (${f.source}, conf ${f.confidence}) ${f.value}` +
        (f.source_url ? ` — ${f.source_url}` : ""),
    )
    .join("\n");
}
