/**
 * Context Signals — deterministic extraction from a Deep Research Doc (DRD).
 *
 * NO LLM call here. We use keyword/regex heuristics so the assembler stays
 * deterministic, fast, and unit-testable. The signal extractor is the
 * canonical input to bundle scoring and page-template assembly.
 */

import type { SubcategoryId } from "./types";

export interface ContextSignals {
  has_seasonal_variation: boolean;
  has_skip_the_line: boolean;
  has_multiple_entrances: boolean;
  has_long_queues: boolean;
  has_timed_entry: boolean;
  has_security_screening: boolean;
  has_dress_code: boolean;
  has_food_options: boolean;
  has_guided_tours: boolean;
  has_audio_guide: boolean;
  has_accessibility_concerns: boolean;
  has_rides: boolean;
  has_wildlife_sighting: boolean;
  has_weather_sensitivity: boolean;
  has_evening_program: boolean;
  has_historical_significance: boolean;
  has_dynamic_pricing: boolean;
  has_multiple_sub_products: boolean;

  /* ---- Subcategory-structural signals (set by bootstrapSignalsFromSubcategory) ---- */

  /** Theme parks and water parks — unlocks ride_wait_curve, opening_hour_rank, zone_wait_heatmap. */
  has_ride_attractions: boolean;
  /** Museums, aquariums, zoos with distinct named galleries — unlocks zone_crowd_heatmap, floor_plan_flow. */
  has_named_gallery_zones: boolean;
  /** Guided tours, walking tours, food tours, day trips — unlocks itinerary_flow and time_split. */
  has_fixed_itinerary: boolean;
  /** Zoos, aquariums, religious sites with timed feedings / shows — unlocks daily_programme. */
  has_scheduled_shows: boolean;
  /** Sightseeing / dinner cruises where departure slot determines the experience — unlocks optimal_departure. */
  has_cruise_departure_slots: boolean;
  /** Photography tours, helicopter tours, hot-air balloons — unlocks golden_hour_match. */
  has_photography_windows: boolean;
  /** Hop-on-hop-off and sightseeing cruises with multiple named routes — unlocks landmark_coverage, stop_frequency. */
  has_multi_route_options: boolean;

  /** Names of distinct sub-products mentioned in the DRD (best-effort, deduped). */
  sub_products: string[];
  /** Typical visit duration in minutes (best-effort range). */
  typical_visit_minutes: { min: number; max: number } | null;
  /** Whether the DRD self-rates major sections as Low confidence / honest gaps. */
  drd_has_low_confidence_sections: boolean;
  /** Venues with named artworks, iconic attractions, or headline exhibits visitors should not miss. */
  has_famous_highlights: boolean;
}

const EMPTY_SIGNALS: ContextSignals = {
  has_seasonal_variation: false,
  has_skip_the_line: false,
  has_multiple_entrances: false,
  has_long_queues: false,
  has_timed_entry: false,
  has_security_screening: false,
  has_dress_code: false,
  has_food_options: false,
  has_guided_tours: false,
  has_audio_guide: false,
  has_accessibility_concerns: false,
  has_rides: false,
  has_wildlife_sighting: false,
  has_weather_sensitivity: false,
  has_evening_program: false,
  has_historical_significance: false,
  has_dynamic_pricing: false,
  has_multiple_sub_products: false,
  has_ride_attractions: false,
  has_named_gallery_zones: false,
  has_fixed_itinerary: false,
  has_scheduled_shows: false,
  has_cruise_departure_slots: false,
  has_photography_windows: false,
  has_multi_route_options: false,
  sub_products: [],
  typical_visit_minutes: null,
  drd_has_low_confidence_sections: false,
  has_famous_highlights: false,
};

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function uniqueClean(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const cleaned = raw
      .replace(/\s+/g, " ")
      .replace(/[\u201c\u201d"']/g, "")
      .trim();
    const key = cleaned.toLowerCase();
    if (!cleaned || cleaned.length < 3 || cleaned.length > 60) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= 8) break;
  }
  return out;
}

function extractSubProducts(text: string): string[] {
  const names: string[] = [];
  // Common DRD patterns: bulleted "- Name — description" or "## Name".
  for (const m of text.matchAll(/^\s*[-*]\s+([A-Z][^—\-:\n]{2,60})\s*[—\-:]/gm)) {
    if (m[1]) names.push(m[1]);
  }
  for (const m of text.matchAll(/^#{2,4}\s+([A-Z][^\n]{2,60})$/gm)) {
    const heading = m[1]?.trim() ?? "";
    // Skip generic section headings.
    if (!/^(overview|history|why|when|how|what|tickets?|hours?|access|safety|faq|gaps?|sources?|confidence)/i.test(heading)) {
      names.push(heading);
    }
  }
  return uniqueClean(names);
}

function extractDurationMinutes(text: string): { min: number; max: number } | null {
  // Patterns: "1-2 hours", "2 to 3 hours", "90-120 minutes", "about 2 hours".
  const rangeHr = text.match(/(\d{1,2})\s*(?:-|to|–)\s*(\d{1,2})\s*hours?/i);
  if (rangeHr?.[1] && rangeHr[2]) {
    return { min: Number(rangeHr[1]) * 60, max: Number(rangeHr[2]) * 60 };
  }
  const rangeMin = text.match(/(\d{2,3})\s*(?:-|to|–)\s*(\d{2,3})\s*minutes?/i);
  if (rangeMin?.[1] && rangeMin[2]) {
    return { min: Number(rangeMin[1]), max: Number(rangeMin[2]) };
  }
  const singleHr = text.match(/about\s+(\d{1,2})\s*hours?/i);
  if (singleHr?.[1]) {
    const n = Number(singleHr[1]);
    return { min: n * 60, max: (n + 1) * 60 };
  }
  return null;
}

/**
 * Pure-function signal extractor. Pass it the DRD markdown; it returns the
 * full ContextSignals record. Stable across re-runs (no LLM, no clock).
 */
export function extractSignals(drdMarkdown: string | null | undefined): ContextSignals {
  if (!drdMarkdown || drdMarkdown.trim().length === 0) {
    return { ...EMPTY_SIGNALS };
  }
  const text = drdMarkdown;
  const lower = text.toLowerCase();

  const subProducts = extractSubProducts(text);

  return {
    has_seasonal_variation: hasAny(lower, [
      /\b(season(al(ity)?)?|peak season|off[- ]season|shoulder season|summer crowd|winter closure|monthly visitation)\b/,
      /\b(busiest months?|quietest months?|best months? to visit)\b/,
    ]),
    has_skip_the_line: hasAny(lower, [
      /\bskip[- ]the[- ]line\b/,
      /\bfast[- ]track\b/,
      /\bpriority (entry|access|entrance)\b/,
      /\breserved entry\b/,
    ]),
    has_multiple_entrances: hasAny(lower, [
      /\b(multiple|several|different|two|three|four) (entrances?|gates?|entry points?)\b/,
      /\bmain entrance\b.*\b(side|secondary|north|south|east|west) (entrance|gate)\b/s,
    ]),
    has_long_queues: hasAny(lower, [
      /\b(long|huge|massive|notorious) (queue|line|wait)s?\b/,
      /\bwait(ing)? times? of (\d{2,3}|hours?)\b/,
      /\b(\d{2,3})[ -]?minute (queue|wait)\b/,
      // Nuanced queue language — "security queue", "elevator queue", "internal queue"
      /\b(security|elevator|internal|main|entry|ticket|bag) queue\b/,
      // "queues form", "queue can reach", "queues at the"
      /\bqueue[s]?\s+(form|can|build|reach|at|during|for|is|are)\b/,
      // "expect to wait", "visitors wait", "can wait up to"
      /\b(expect|visitors?|tourists?|guests?) (to\s+)?wait\b/,
      /\bcan wait (up to|over|more than)\b/,
    ]),
    has_timed_entry: hasAny(lower, [
      /\btimed[- ]entry\b/,
      /\btimed (ticket|slot|admission)s?\b/,
      /\b(half[- ]hour|15[- ]minute|hourly) entry slots?\b/,
    ]),
    has_security_screening: hasAny(lower, [
      /\bsecurity (check|screening|scanner)\b/,
      /\bbag (check|screening|scan)\b/,
      /\bmetal detector\b/,
      /\bairport[- ]style\b/,
    ]),
    has_dress_code: hasAny(lower, [
      /\bdress code\b/,
      /\b(cover (shoulders|knees)|no shorts|modest dress|appropriate (attire|clothing))\b/,
    ]),
    has_food_options: hasAny(lower, [
      /\b(restaurant|cafe|café|food court|dining|on[- ]site (food|dining|meal))\b/,
    ]),
    has_guided_tours: hasAny(lower, [
      /\b(guided tour|tour guide|docent|expert[- ]led|with a guide)\b/,
    ]),
    has_audio_guide: hasAny(lower, [
      /\baudio[- ]guide\b/,
      /\bself[- ]guided audio\b/,
      /\baudio (app|tour|narration)\b/,
    ]),
    has_accessibility_concerns: hasAny(lower, [
      /\b(wheelchair|accessibility|step[- ]free|mobility|elevator access|stair(case|s)? only)\b/,
    ]),
    has_rides: hasAny(lower, [
      /\b(ride|roller ?coaster|attraction|thrill ride)s?\b/,
      /\b(theme park|amusement park)\b/,
    ]),
    has_wildlife_sighting: hasAny(lower, [
      /\b(wildlife|whale|dolphin|safari|spotting|sighting probability|game drive)\b/,
    ]),
    has_weather_sensitivity: hasAny(lower, [
      /\b(weather[- ]dependent|cancel(led|lation)? (due to|in) (rain|wind|weather)|rough seas|outdoor activity|sea state)\b/,
      // "Summit closes because of weather", "closed in high winds", "closes in fog"
      /\b(summit|closes?|closure|closed|shut) (because of|due to|in|during|by) (weather|wind|rain|fog|mist|storm)\b/,
      // "weather (can|may|will) affect", "weather permitting"
      /\bweather (can|may|will|could) (affect|cancel|close|prevent|impact)\b/,
      /\bweather permitting\b/,
      // "high wind closure", "subject to weather"
      /\b(high|strong|gusty) wind[s]?\b/,
      /\bsubject to (weather|conditions?)\b/,
    ]),
    has_evening_program: hasAny(lower, [
      /\b(night tour|evening (visit|program)|after[- ]hours|sunset (cruise|tour|slot)|illuminat(ed|ion))\b/,
    ]),
    has_historical_significance: hasAny(lower, [
      /\b(history|historic(al)?|founded in|built in|century|ancient|medieval|renaissance|restoration)\b/,
    ]),
    has_dynamic_pricing: hasAny(lower, [
      /\b(dynamic pricing|surge pricing|price varies|fare varies|date[- ]based pricing|operator-specific (price|fare))\b/,
    ]),
    has_multiple_sub_products: subProducts.length >= 3,

    // Subcategory-structural signals — also extractable from DRD text.
    has_ride_attractions: hasAny(lower, [
      /\b(roller ?coaster|thrill ride|ride wait|rope drop|land[s]?|themed land|fastpass|lightning lane)\b/,
      /\b(height requirement|minimum height|must be at least \d+ cm)\b/,
    ]),
    has_named_gallery_zones: hasAny(lower, [
      /\b(gallery|wing|exhibit hall|floor plan|room[- ]by[- ]room|named (gallery|exhibit|section))\b/,
      /\b(\w+ gallery|\w+ wing|\w+ hall|\w+ exhibit)\b/,
    ]),
    has_fixed_itinerary: hasAny(lower, [
      /\b(fixed (route|itinerary|schedule)|stop[- ]by[- ]stop|timed (stop|segment)|route overview|departs? (from|at))\b/,
      /\b(walking (tour|route)|boat (tour|route)|bus (tour|route)|food (stop|tasting))\b/,
    ]),
    has_scheduled_shows: hasAny(lower, [
      /\b(feeding (time|session|show)|animal show|dolphin show|keeper talk|timed feeding)\b/,
      /\b(scheduled (show|performance|demonstration)|show schedule|daily (show|programme))\b/,
    ]),
    has_cruise_departure_slots: hasAny(lower, [
      /\b(departure (slot|time|window)|cruise (departs?|schedule)|sailing (time|slot|schedule))\b/,
      /\b(morning|afternoon|sunset|evening) (cruise|departure|sailing)\b/,
    ]),
    has_photography_windows: hasAny(lower, [
      /\b(golden hour|blue hour|photography (tour|walk|spot)|photo spot|sunrise (slot|shoot))\b/,
      /\b(best light|photographic|instagram(mable)?)\b/,
    ]),
    has_multi_route_options: hasAny(lower, [
      /\b(multiple routes?|route [a-z]|red route|blue route|yellow route|hop[- ]on|loop route)\b/,
      /\b(two? (routes?|circuits?|loops?)|classic route|extended route)\b/,
    ]),

    sub_products: subProducts,
    typical_visit_minutes: extractDurationMinutes(text),
    drd_has_low_confidence_sections: hasAny(lower, [
      /\b(low confidence|honest gap|anecdotal|insufficient evidence|no data|unknown)\b/,
    ]),
    has_famous_highlights:
      hasAny(lower, [
        /\b(mona lisa|venus de milo|winged victory|nike of samothrace)\b/,
        /\b(must[- ]see|masterpiece|don't miss|do not miss|highlight|iconic|star attraction)\b/,
        /\b(most visited|most popular exhibit|signature ride|must[- ]do|must[- ]visit)\b/,
      ]) ||
      // Named-artwork pattern: requires title-case so matched against original text.
      /[A-Z][a-z]+ [A-Z][a-z]+ (?:painting|sculpture|artwork|fresco|tapestry|mural|relief|mosaic)/.test(
        text,
      ),
  };
}

/**
 * Merge a patch of signals (e.g. from `bootstrapSignalsFromSubcategory`) onto
 * a base signal record. Boolean signals are OR-ed (a subcategory bootstrap
 * never suppresses a signal the DRD already found). Arrays are concatenated.
 * The `typical_visit_minutes` uses the non-null value, preferring the base.
 */
export function mergeSignals(
  base: ContextSignals,
  patch: Partial<ContextSignals>,
): ContextSignals {
  const result = { ...base };
  for (const key of Object.keys(patch) as (keyof ContextSignals)[]) {
    const pv = patch[key];
    if (pv === undefined) continue;
    if (typeof pv === "boolean") {
      (result as Record<string, unknown>)[key] =
        (result[key] as boolean) || pv;
    } else if (key === "sub_products" && Array.isArray(pv)) {
      const existing = result.sub_products;
      const merged = [...existing];
      for (const s of pv as string[]) {
        if (!merged.includes(s)) merged.push(s);
      }
      result.sub_products = merged;
    } else if (key === "typical_visit_minutes") {
      result.typical_visit_minutes =
        result.typical_visit_minutes ?? (pv as ContextSignals["typical_visit_minutes"]);
    }
  }
  return result;
}

/**
 * Count how many of `required` and `prefers` signals are present in the
 * extracted signal record. Used by the assembler when scoring bundles.
 */
export function countSignalMatches(
  signals: ContextSignals,
  required: (keyof ContextSignals)[],
  prefers: (keyof ContextSignals)[],
): { requiredHits: number; preferredHits: number; allRequired: boolean } {
  const requiredHits = required.filter((k) => Boolean(signals[k])).length;
  const preferredHits = prefers.filter((k) => Boolean(signals[k])).length;
  return {
    requiredHits,
    preferredHits,
    allRequired: requiredHits === required.length,
  };
}

/* -------------------------------------------------------------------------- */
/* Subcategory-signal bootstrap                                                */
/* -------------------------------------------------------------------------- */

/**
 * Maps a known subcategory id to the structural signals it implies by default,
 * independent of any DRD content. Callers (e.g. the DRD-optional pipeline)
 * should MERGE this result over an empty-signals base so DRD-extracted signals
 * can still override or augment these defaults.
 *
 * Only boolean fields are returned; derived fields (sub_products, etc.) are
 * always left to DRD extraction.
 */
export function bootstrapSignalsFromSubcategory(
  subcategoryId: string,
): Partial<ContextSignals> {
  const s: Partial<ContextSignals> = {};

  switch (subcategoryId as SubcategoryId) {
    /* ---- Museums & galleries ---- */
    case "museums":
      s.has_named_gallery_zones = true;
      s.has_timed_entry = true;
      s.has_historical_significance = true;
      break;

    /* ---- Theme parks & water parks ---- */
    case "theme_parks":
    case "water_parks":
      s.has_ride_attractions = true;
      s.has_rides = true;
      s.has_seasonal_variation = true;
      s.has_long_queues = true;
      s.has_skip_the_line = true;
      break;

    /* ---- Zoos & aquariums ---- */
    case "zoos":
    case "aquariums":
      s.has_named_gallery_zones = true;
      s.has_scheduled_shows = true;
      s.has_wildlife_sighting = true;
      s.has_seasonal_variation = true;
      break;

    /* ---- Guided tours (walking, boat, bus) ---- */
    case "guided_tours":
    case "walking_tours":
    case "food_tours":
      s.has_fixed_itinerary = true;
      s.has_guided_tours = true;
      break;

    /* ---- Day trips & port-of-call ---- */
    case "day_trips":
    case "port_of_call_tours":
      s.has_fixed_itinerary = true;
      s.has_multiple_sub_products = true;
      break;

    /* ---- Dinner cruises & sightseeing cruises ---- */
    case "dinner_cruises":
      s.has_cruise_departure_slots = true;
      s.has_multiple_sub_products = true;
      break;

    case "sightseeing_cruises":
      s.has_cruise_departure_slots = true;
      s.has_multi_route_options = true;
      s.has_seasonal_variation = true;
      break;

    /* ---- Hop-on hop-off ---- */
    case "hop_on_hop_off":
      s.has_multi_route_options = true;
      s.has_multiple_sub_products = true;
      break;

    /* ---- Photography tours ---- */
    case "photography_tours":
      s.has_photography_windows = true;
      s.has_fixed_itinerary = true;
      break;

    /* ---- Historic sites & monuments / religious sites ---- */
    case "landmarks":
      s.has_historical_significance = true;
      s.has_long_queues = true;
      s.has_skip_the_line = true;
      // Every commercial landmark sells multiple product tiers by definition
      // (e.g. standard, fast-track, guided, summit-access). Firing this by
      // default ensures the choice bundle fires without relying on DRD bullet
      // formatting.
      s.has_multiple_sub_products = true;
      break;

    case "religious_sites":
      s.has_dress_code = true;
      s.has_historical_significance = true;
      s.has_scheduled_shows = true;
      break;

    case "observation_decks":
      s.has_long_queues = true;
      s.has_photography_windows = true;
      // Observation decks invariably offer standard + premium + guided tiers.
      s.has_multiple_sub_products = true;
      break;

    /* ---- Safari / whale watching ---- */
    case "safari":
      s.has_wildlife_sighting = true;
      s.has_weather_sensitivity = true;
      s.has_seasonal_variation = true;
      break;

    case "whale_watching":
      s.has_wildlife_sighting = true;
      s.has_weather_sensitivity = true;
      s.has_seasonal_variation = true;
      break;

    /* ---- Weather-sensitive adventure ---- */
    case "skydiving":
    case "hot_air_balloon":
      s.has_weather_sensitivity = true;
      s.has_photography_windows = true;
      break;

    case "helicopter_tours":
      s.has_photography_windows = true;
      s.has_cruise_departure_slots = true;
      break;

    /* ---- Outdoor / seasonal sports ---- */
    case "skiing":
      s.has_seasonal_variation = true;
      s.has_weather_sensitivity = true;
      break;

    case "scuba_diving":
    case "surfing":
    case "rafting":
      s.has_weather_sensitivity = true;
      s.has_seasonal_variation = true;
      break;

    case "hiking_trails":
      s.has_weather_sensitivity = true;
      s.has_seasonal_variation = true;
      s.has_fixed_itinerary = true;
      break;

    /* ---- City cards & combos ---- */
    case "city_cards":
    case "combos":
      s.has_multiple_sub_products = true;
      break;

    /* ---- Spa & baths ---- */
    case "spa":
    case "baths":
      s.has_multiple_sub_products = true;
      break;

    /* ---- Entertainment ---- */
    case "plays":
    case "rock_concerts":
    case "live_sports":
    case "formula_1":
      s.has_multiple_sub_products = true;
      s.has_seasonal_variation = true;
      break;

    /* ---- No structural defaults for these: ---- */
    // desert_safari, go_karting, nightlife, immersive_experiences,
    // cable_car_tours, multi_day_tours, wineries, cooking_classes,
    // pub_crawls, airport_transfers, train_tickets, outdoor_activities
    default:
      break;
  }

  return s;
}

/**
 * Merge subcategory-bootstrapped signals INTO a base signals record.
 * Values from the base record win when already `true`; bootstrap fills the gaps.
 * This means DRD extraction is always the primary source, and the subcategory
 * bootstrap only sets signals the DRD couldn't fire.
 */
export function mergeSubcategorySignals(
  base: ContextSignals,
  subcategoryId: string,
): ContextSignals {
  const bootstrap = bootstrapSignalsFromSubcategory(subcategoryId);
  const merged = { ...base };
  for (const [key, value] of Object.entries(bootstrap) as [keyof ContextSignals, unknown][]) {
    if (typeof value === "boolean" && !merged[key]) {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}
