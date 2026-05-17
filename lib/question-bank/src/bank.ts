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
  SubcategoryFamily,
  SubcategoryId,
  SubcategoryMeta,
} from "./types";

interface SubcategoryEntry {
  id: SubcategoryId;
  label: string;
  family?: SubcategoryFamily;
  description: string;
}

const ENTRIES: SubcategoryEntry[] = [
  { id: "landmarks", label: "Landmarks & monuments", family: "Tickets", description: "Iconic monuments, towers, and viewpoints visitors come to see." },
  { id: "museums", label: "Museums & galleries", family: "Tickets", description: "Cultural institutions with collections, exhibitions, and timed tickets." },
  { id: "theme_parks", label: "Theme parks", family: "Tickets", description: "Multi-ride amusement parks with all-day ticketing." },
  { id: "water_parks", label: "Water parks", family: "Tickets", description: "Slide-driven seasonal water parks." },
  { id: "zoos", label: "Zoos", family: "Tickets", description: "Walking zoos with timed feedings and exhibits." },
  { id: "aquariums", label: "Aquariums", family: "Tickets", description: "Indoor aquariums with timed shows." },
  { id: "observation_decks", label: "Observation decks", family: "Tickets", description: "High-rise observation decks with timed entry." },
  { id: "city_cards", label: "City cards & passes", family: "Tickets", description: "Multi-attraction passes that bundle entry and transit." },
  { id: "religious_sites", label: "Religious sites", family: "Tickets", description: "Active places of worship with dress codes and access rules." },
  { id: "immersive_experiences", label: "Immersive experiences", family: "Tickets", description: "Projection rooms, VR, and walk-through immersive shows." },
  { id: "guided_tours", label: "Guided tours", family: "Tours", description: "Expert-led group or small-group tours." },
  { id: "day_trips", label: "Day trips", family: "Tours", description: "Full-day round-trip excursions out of a base city." },
  { id: "hop_on_hop_off", label: "Hop-on hop-off", family: "Tours", description: "Multi-stop sightseeing transport with reusable tickets." },
  { id: "walking_tours", label: "Walking tours", family: "Tours", description: "Themed neighborhood walks led by a local guide." },
  { id: "photography_tours", label: "Photography tours", family: "Tours", description: "Guided photo walks at golden hour or signature spots." },
  { id: "multi_day_tours", label: "Multi-day tours", family: "Tours", description: "Multi-day overland or coach tours." },
  { id: "port_of_call_tours", label: "Port-of-call tours", family: "Tours", description: "Shore excursions designed around cruise port arrival windows." },
  { id: "sightseeing_cruises", label: "Sightseeing cruises", family: "Cruises", description: "On-water sightseeing across multiple operators and routes." },
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
