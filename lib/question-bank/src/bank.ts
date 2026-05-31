/**
 * Subcategory registry — slim metadata-only module after Task #99.
 *
 * The old flat RAW_BANK / STANDARD_QUESTIONS arrays were deleted when we
 * moved to the intent-driven bundle engine (see `bundles.ts`,
 * `page-templates.ts`, `assembler.ts`). Subcategory ids are still kept here
 * for the legacy `/api/research/subcategories` listing endpoint and for
 * type-safe references elsewhere in the codebase.
 */

import type {
  ChartArchetypeId,
  SubcategoryFamily,
  SubcategoryId,
  SubcategoryMeta,
} from "./types";

interface SubcategoryEntry {
  id: SubcategoryId;
  label: string;
  family?: SubcategoryFamily;
  description: string;
  /**
   * Archetypes that are structurally mandatory for this subcategory — always
   * emitted regardless of DRD signal coverage, before the normal bundle-scoring
   * pass. Filled sparingly; only add an archetype here when it would genuinely
   * be absent (because a required signal is missing) even though every real CE
   * in this subcategory should have it.
   */
  mandatory_archetypes?: ChartArchetypeId[];
}

const ENTRIES: SubcategoryEntry[] = [
  {
    id: "landmarks",
    label: "Landmarks & monuments",
    family: "Tickets",
    description: "Iconic monuments, towers, and viewpoints visitors come to see.",
    mandatory_archetypes: ["hourly_heatmap", "booking_window"],
  },
  {
    id: "museums",
    label: "Museums & galleries",
    family: "Tickets",
    description: "Cultural institutions with collections, exhibitions, and timed tickets.",
    mandatory_archetypes: ["hourly_heatmap", "seasonal_curve"],
  },
  {
    id: "theme_parks",
    label: "Theme parks",
    family: "Tickets",
    description: "Multi-ride amusement parks with all-day ticketing.",
    mandatory_archetypes: ["hourly_heatmap", "booking_window"],
  },
  { id: "water_parks", label: "Water parks", family: "Tickets", description: "Slide-driven seasonal water parks." },
  { id: "zoos", label: "Zoos", family: "Tickets", description: "Walking zoos with timed feedings and exhibits." },
  { id: "aquariums", label: "Aquariums", family: "Tickets", description: "Indoor aquariums with timed shows." },
  { id: "observation_decks", label: "Observation decks", family: "Tickets", description: "High-rise observation decks with timed entry." },
  { id: "city_cards", label: "City cards & passes", family: "Tickets", description: "Multi-attraction passes that bundle entry and transit." },
  { id: "religious_sites", label: "Religious sites", family: "Tickets", description: "Active places of worship with dress codes and access rules." },
  { id: "immersive_experiences", label: "Immersive experiences", family: "Tickets", description: "Projection rooms, VR, and walk-through immersive shows." },
  {
    id: "guided_tours",
    label: "Guided tours",
    family: "Tours",
    description: "Expert-led group or small-group tours.",
    mandatory_archetypes: ["booking_window"],
  },
  { id: "day_trips", label: "Day trips", family: "Tours", description: "Full-day round-trip excursions out of a base city." },
  { id: "hop_on_hop_off", label: "Hop-on hop-off", family: "Tours", description: "Multi-stop sightseeing transport with reusable tickets." },
  { id: "walking_tours", label: "Walking tours", family: "Tours", description: "Themed neighborhood walks led by a local guide." },
  { id: "photography_tours", label: "Photography tours", family: "Tours", description: "Guided photo walks at golden hour or signature spots." },
  { id: "multi_day_tours", label: "Multi-day tours", family: "Tours", description: "Multi-day overland or coach tours." },
  { id: "port_of_call_tours", label: "Port-of-call tours", family: "Tours", description: "Shore excursions designed around cruise port arrival windows." },
  {
    id: "sightseeing_cruises",
    label: "Sightseeing cruises",
    family: "Cruises",
    description: "On-water sightseeing across multiple operators and routes.",
    mandatory_archetypes: ["seasonal_curve", "booking_window"],
  },
  { id: "dinner_cruises", label: "Dinner cruises", family: "Cruises", description: "Sit-down meal cruises with a fixed itinerary." },
  { id: "whale_watching", label: "Whale watching", family: "Cruises", description: "Seasonal wildlife sighting trips, weather-dependent." },
  { id: "plays", label: "Plays & musicals", family: "Entertainment", description: "Live theater shows with assigned seating." },
  { id: "rock_concerts", label: "Rock concerts", family: "Entertainment", description: "Live music events." },
  { id: "nightlife", label: "Nightlife", family: "Entertainment", description: "Club entry, bar crawls, late-night experiences." },
  { id: "live_sports", label: "Live sports", family: "Entertainment", description: "Tickets to professional sporting events." },
  { id: "desert_safari", label: "Desert safari", family: "Adventure", description: "Off-road desert experiences with optional dinner." },
  { id: "skydiving", label: "Skydiving", family: "Adventure", description: "Tandem skydives with weather/wind windows." },
  { id: "hot_air_balloon", label: "Hot air balloon", family: "Adventure", description: "Sunrise balloon rides, weather-dependent." },
  { id: "skiing", label: "Skiing", family: "Adventure", description: "Lift-served ski experiences and lessons." },
  { id: "go_karting", label: "Go karting", family: "Adventure", description: "Indoor/outdoor karting circuits." },
  { id: "outdoor_activities", label: "Outdoor activities", family: "Adventure", description: "Open-ended outdoor catalog (ziplining, paintball, etc.)." },
  { id: "helicopter_tours", label: "Helicopter tours", family: "Aerial", description: "Scenic helicopter flights." },
  { id: "cable_car_tours", label: "Cable car tours", family: "Aerial", description: "Cable cars and gondolas to scenic viewpoints." },
  { id: "scuba_diving", label: "Scuba diving", family: "Water", description: "Certified and discover-dive scuba experiences." },
  { id: "surfing", label: "Surfing", family: "Water", description: "Surf lessons and board hire." },
  { id: "rafting", label: "Rafting", family: "Water", description: "Whitewater rafting trips." },
  { id: "safari", label: "Wildlife safari", family: "Nature", description: "Game drives, sighting-driven wildlife tours." },
  { id: "hiking_trails", label: "Hiking trails", family: "Nature", description: "Guided hikes and trail experiences." },
  { id: "food_tours", label: "Food tours", family: "Food", description: "Walking food tastings." },
  { id: "wineries", label: "Wineries", family: "Food", description: "Winery visits and tastings." },
  { id: "cooking_classes", label: "Cooking classes", family: "Food", description: "Hands-on culinary classes." },
  { id: "pub_crawls", label: "Pub crawls", family: "Food", description: "Guided multi-venue pub experiences." },
  { id: "spa", label: "Spa", family: "Wellness", description: "Spa packages and treatments." },
  { id: "baths", label: "Baths", family: "Wellness", description: "Hammams, onsens, thermal baths." },
  { id: "combos", label: "Combos", family: "Specials", description: "Multi-venue bundled tickets." },
  { id: "formula_1", label: "Formula 1", family: "Sports", description: "F1 race weekend tickets and grandstands." },
  { id: "airport_transfers", label: "Airport transfers", family: "Transport", description: "Private and shared airport transfer services." },
  { id: "train_tickets", label: "Train tickets", family: "Transport", description: "Intercity and regional train tickets." },
];

const SUBCATEGORIES: Record<SubcategoryId, SubcategoryMeta> = Object.fromEntries(
  ENTRIES.map((e) => [
    e.id,
    {
      id: e.id,
      label: e.label,
      ...(e.family ? { family: e.family } : {}),
      description: e.description,
    } satisfies SubcategoryMeta,
  ]),
) as Record<SubcategoryId, SubcategoryMeta>;

export const SUBCATEGORY_IDS = ENTRIES.map((e) => e.id);

export function getSubcategoryMeta(id: SubcategoryId): SubcategoryMeta {
  return SUBCATEGORIES[id];
}

export function listSubcategories(): SubcategoryMeta[] {
  return SUBCATEGORY_IDS.map((id) => SUBCATEGORIES[id]);
}

export function isKnownSubcategory(id: string): id is SubcategoryId {
  return Object.prototype.hasOwnProperty.call(SUBCATEGORIES, id);
}

/**
 * Return the mandatory archetypes declared for a subcategory. Returns an
 * empty array for unknown subcategory ids or entries without mandatory
 * archetypes — callers never need to guard for undefined.
 */
export function getMandatoryArchetypes(subcategoryId: string): ChartArchetypeId[] {
  const entry = ENTRIES.find((e) => e.id === subcategoryId);
  return entry?.mandatory_archetypes ?? [];
}

/**
 * Loose lookup used by callers that may receive a long-tail / unknown id.
 * Returns the curated meta when known; otherwise synthesises a placeholder
 * meta from the caller-supplied label/description so prompts can still
 * include a human-readable subcategory name.
 */
export function resolveSubcategoryMeta(
  id: string,
  label?: string,
  description?: string,
): SubcategoryMeta {
  if (isKnownSubcategory(id)) return getSubcategoryMeta(id);
  return {
    id: id as SubcategoryId,
    label: label ?? id,
    description: description ?? "Long-tail subcategory (unratified)",
  };
}

/* -------------------------------------------------------------------------- */
/* Headout taxonomy bridge                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Maps Headout's canonical numeric subcategory ids → our internal curated
 * SubcategoryId. Only subcategories that currently have a curated bundle
 * mapping appear here; any Headout subcategory that's missing from this
 * table falls through to the default-bundle deck and is flagged
 * `unratified: true` by the taxonomy lib.
 *
 * String keys are used for synthetic ids (Headout entries with no numeric
 * id in the source TSV — e.g. "Whale watching" under Cruises).
 */
const HEADOUT_TO_INTERNAL: Record<string | number, SubcategoryId> = {
  // Tickets
  1007: "landmarks",
  1002: "museums",
  1001: "theme_parks",
  1005: "water_parks",
  1003: "zoos",
  1140: "aquariums",
  1098: "observation_decks",
  1008: "city_cards",
  1006: "religious_sites",
  1149: "immersive_experiences",
  // Tours
  1010: "guided_tours",
  1143: "day_trips",
  1009: "walking_tours",
  1011: "hop_on_hop_off",
  1017: "photography_tours",
  1016: "multi_day_tours",
  1018: "port_of_call_tours",
  // Cruises
  1061: "sightseeing_cruises",
  1060: "dinner_cruises",
  "synthetic:cruises:whale-watching": "whale_watching",
  // Entertainment
  1037: "plays",
  1120: "rock_concerts",
  1148: "nightlife",
  1042: "live_sports",
  // Adventure
  1073: "desert_safari",
  1049: "skydiving",
  1050: "skiing",
  1134: "go_karting",
  1056: "outdoor_activities",
  // Aerial
  1057: "helicopter_tours",
  1112: "cable_car_tours",
  1058: "hot_air_balloon",
  // Water Sports
  1062: "scuba_diving",
  1063: "surfing",
  1066: "rafting",
  // Nature & Wildlife
  1070: "safari",
  1071: "hiking_trails",
  // Food & Drink
  1026: "food_tours",
  1028: "wineries",
  1027: "cooking_classes",
  1030: "pub_crawls",
  // Wellness
  1074: "spa",
  1117: "baths",
  // Specials
  1080: "combos",
  // Sports
  1109: "formula_1",
  // Transportation
  1019: "airport_transfers",
  1133: "train_tickets",
};

/**
 * Resolve a Headout subcategory id to a curated internal bundle key. If no
 * mapping exists, returns `null` so the caller can fall through to the
 * default-bundle deck.
 */
export function resolveBundleSubcategory(
  headoutSubcategoryId: string | number,
): SubcategoryId | null {
  const norm =
    typeof headoutSubcategoryId === "string" &&
    /^\d+$/.test(headoutSubcategoryId)
      ? Number(headoutSubcategoryId)
      : headoutSubcategoryId;
  return HEADOUT_TO_INTERNAL[norm] ?? null;
}

/**
 * Set of Headout subcategory ids that currently have a curated bundle
 * mapping. Pass this to taxonomy helpers so they can flag the rest as
 * `unratified: true`.
 */
export const RATIFIED_HEADOUT_SUBCATEGORY_IDS: ReadonlySet<string | number> =
  new Set(
    Object.keys(HEADOUT_TO_INTERNAL).map((k) =>
      /^\d+$/.test(k) ? Number(k) : k,
    ),
  );
