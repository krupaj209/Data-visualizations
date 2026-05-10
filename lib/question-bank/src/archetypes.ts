import type { ChartArchetype, ChartArchetypeId } from "./types";

/**
 * Read-only registry of every chart archetype Viz Studio knows about.
 *
 * Each entry mirrors `artifacts/api-server/src/lib/chart-spec.ts` and is
 * flagged `implemented` per its current rollout status. The pipeline
 * never asks Gemini to produce an `implemented: false` archetype; it
 * records `viz_not_yet_built` in provenance instead.
 *
 * Promotion / deprecation pattern (Task #67 onwards):
 *   - To PROMOTE a reserved archetype:
 *     1. Add its schema to `chartSpecSchema` (api-server) with full
 *        superRefine validation matching the prompt's hard rules.
 *     2. Add its renderer + ChartRenderer case (viz-studio), compact-aware.
 *     3. Replace the stub prompt in `chart-archetype-prompts.ts` with a
 *        prompt that includes a SOURCING paragraph.
 *     4. Update this entry's `answers` and `data_shape` to match the
 *        promoted shape, and flip `implemented` to `true`.
 *   - To SUPERSEDE a legacy archetype with a richer replacement:
 *     1. KEEP its Zod schema and React renderer (existing curated CEs
 *        and historical charts MUST keep rendering).
 *     2. Replace its prompt entry with a single-line STUB so Gemini
 *        will not be asked to produce new specs of that type.
 *     3. Flip `implemented` to `false` here so the question-bank /
 *        planner stop suggesting it; the bank entry's `answers` /
 *        `data_shape` remains the source of truth for legacy charts.
 *     4. Add a comment above the bank entry pointing to the replacement
 *        archetype id(s).
 */
export const CHART_ARCHETYPES: Record<ChartArchetypeId, ChartArchetype> = {
  /* ---------------- implemented today ---------------- */
  weekly_pattern: {
    id: "weekly_pattern",
    label: "Weekly pattern",
    answers:
      "Which day of the week is best/worst for crowds, queues, or pricing?",
    data_shape: [
      "Exactly 7 days (mon..sun) each with a 0-100 score and a level bucket",
      "Optional day-of-week chips for closures, free days, predictable spikes",
    ],
    typical_subcategories: [
      "landmarks",
      "museums",
      "theme_parks",
      "guided_tours",
      "walking_tours",
      "hop_on_hop_off",
      "plays",
      "spa",
    ],
    interactive: true,
    implemented: true,
  },
  hourly_heatmap: {
    id: "hourly_heatmap",
    label: "Hourly heatmap",
    answers:
      "Which hour of which day is calmest or busiest across the open week?",
    data_shape: [
      "Open and close hours",
      "7 day rows × 24 hours each, 0-100 scores; closed hours/days zeroed out",
    ],
    typical_subcategories: ["landmarks", "museums", "theme_parks", "spa"],
    interactive: true,
    implemented: true,
  },
  month_calendar: {
    id: "month_calendar",
    label: "Month calendar",
    answers: "Which specific upcoming dates in the next ~3 months are calmest?",
    data_shape: [
      "60-90 consecutive dates from a start date, each with a status + score",
      "3-5 recommended dates that must be present in the date list",
    ],
    typical_subcategories: ["landmarks", "museums", "day_trips", "theme_parks"],
    interactive: true,
    implemented: true,
  },
  booking_window: {
    id: "booking_window",
    label: "Booking window",
    answers: "How many days in advance do most visitors book?",
    data_shape: [
      "8-14 points on a curve (days_before vs % share)",
      "A sweet-spot range with a label",
      "Optional sold-out-risk threshold for popular slots",
    ],
    typical_subcategories: [
      "landmarks",
      "museums",
      "day_trips",
      "guided_tours",
      "theme_parks",
      "helicopter_tours",
      "cooking_classes",
      "plays",
    ],
    interactive: true,
    implemented: true,
  },
  stat_grid: {
    id: "stat_grid",
    label: "Stat grid",
    answers: "What are the headline numbers for this place?",
    data_shape: [
      "3-6 distinct numeric facts with label/value/unit",
      "Optional sparkline, delta, footnote per stat",
    ],
    typical_subcategories: [
      "landmarks",
      "museums",
      "sightseeing_cruises",
      "day_trips",
      "theme_parks",
      "wineries",
      "spa",
      "outdoor_activities",
      "combos",
    ],
    interactive: false,
    implemented: true,
  },
  compare_zones: {
    id: "compare_zones",
    label: "Compare zones",
    answers:
      "How do the named sub-areas compare on wait time or visitor share?",
    data_shape: [
      "2-5 named zones with wait_min/wait_max minutes and a status bucket",
      "Optional emoji, share_of_visitors %, and a tip per zone",
    ],
    typical_subcategories: [
      "landmarks",
      "museums",
      "theme_parks",
      "day_trips",
    ],
    interactive: true,
    implemented: true,
  },
  donut_breakdown: {
    id: "donut_breakdown",
    label: "Donut breakdown",
    answers: "How does the visitor mix split (ticket type, guided vs self, …)?",
    data_shape: [
      "2-6 segments with values that sum to ~100",
      "A center value/label that names the dominant slice",
    ],
    typical_subcategories: [
      "landmarks",
      "museums",
      "guided_tours",
      "day_trips",
      "combos",
      "city_cards",
    ],
    interactive: false,
    implemented: true,
  },
  seasonal_curve: {
    id: "seasonal_curve",
    label: "Seasonal curve",
    answers: "Which month of the year is best for crowds, weather, or price?",
    data_shape: [
      "Exactly 12 months (jan..dec) with crowd score + status",
      "Optional weather_score and price_score per month",
      "Best/worst month lists and optional calendar notes",
    ],
    typical_subcategories: [
      "landmarks",
      "museums",
      "sightseeing_cruises",
      "day_trips",
      "theme_parks",
      "walking_tours",
      "hop_on_hop_off",
      "wineries",
      "outdoor_activities",
    ],
    interactive: true,
    implemented: true,
  },
  ticket_ladder: {
    id: "ticket_ladder",
    label: "Ticket ladder (legacy)",
    answers:
      "How do the ticket tiers compare on price, inclusions, and wait savings?",
    data_shape: [
      "2-5 tiers, each with price, what's included, optional share % and wait savings",
      "Exactly one recommended tier",
    ],
    typical_subcategories: [
      "landmarks",
      "museums",
      "theme_parks",
      "guided_tours",
      "combos",
    ],
    interactive: false,
    // Task #67: superseded by ticket_access_matrix. Schema + renderer kept
    // for legacy/curated charts; orchestrator no longer requests this type.
    implemented: false,
  },

  /* ---------------- reserved for sibling tasks ---------------- */
  queue_compare: {
    id: "queue_compare",
    label: "Queue compare",
    answers: "Which entry lane is fastest at the moment?",
    data_shape: [
      "2-5 named lanes with a wait label and a comparable wait dot count",
    ],
    typical_subcategories: ["landmarks", "museums", "religious_sites"],
    interactive: false,
    implemented: true,
  },
  duration_stat: {
    id: "duration_stat",
    label: "Duration stat (legacy)",
    answers: "How long should I plan to spend here?",
    data_shape: [
      "Median duration + range",
      "Optional breakdown by visitor type (rusher, average, deep dive)",
    ],
    typical_subcategories: [
      "landmarks",
      "museums",
      "theme_parks",
      "guided_tours",
      "combos",
      "baths",
    ],
    interactive: false,
    // Task #67: superseded by duration_budget. Schema + renderer kept for
    // legacy charts; orchestrator no longer requests this type.
    implemented: false,
  },
  ride_wait_curve: {
    id: "ride_wait_curve",
    label: "Ride wait curve",
    answers: "When is the wait shortest for the headline ride?",
    data_shape: [
      "Hourly wait-time curve for one named ride",
      "Best / Peak / 2nd-best zones overlaid",
    ],
    typical_subcategories: ["theme_parks", "water_parks"],
    interactive: true,
    implemented: true,
  },
  opening_hour_rank: {
    id: "opening_hour_rank",
    label: "Opening-hour ride rank",
    answers: "Which rides should I sprint to at rope drop?",
    data_shape: [
      "Bar per ride, wait-time at the first hour, ranked shortest to longest",
    ],
    typical_subcategories: ["theme_parks", "water_parks"],
    interactive: false,
    implemented: true,
  },
  zone_wait_heatmap: {
    id: "zone_wait_heatmap",
    label: "Zone × hour wait heatmap",
    answers: "Which named zones are calm at which hours?",
    data_shape: [
      "Grid: rows = named lands/zones, cols = open hours, cell = wait minutes",
    ],
    typical_subcategories: ["theme_parks"],
    interactive: true,
    implemented: true,
  },
  zone_crowd_heatmap: {
    id: "zone_crowd_heatmap",
    label: "Zone × hour crowd heatmap",
    answers: "When is each named gallery / exhibit busiest?",
    data_shape: [
      "Grid: rows = named galleries/exhibits, cols = open hours, cell = crowd score",
    ],
    typical_subcategories: ["museums", "zoos", "aquariums"],
    interactive: true,
    implemented: true,
  },
  zone_wait_compare: {
    id: "zone_wait_compare",
    label: "Zone wait compare",
    answers:
      "How do named zones / routes / sections compare on wait or quality?",
    data_shape: [
      "2-6 named zones with one or two comparable axes (wait, distance, view)",
    ],
    typical_subcategories: [
      "landmarks",
      "observation_decks",
      "rock_concerts",
      "live_sports",
      "formula_1",
      "scuba_diving",
      "surfing",
      "hiking_trails",
      "safari",
      "airport_transfers",
      "hop_on_hop_off",
      "day_trips",
      "multi_day_tours",
    ],
    interactive: false,
    implemented: false,
  },
  daily_programme: {
    id: "daily_programme",
    label: "Daily programme",
    answers: "When are the fixed events of the day, and which fill up first?",
    data_shape: [
      "Linear timeline of operating hours",
      "Pinned events with location, duration, and a popularity indicator",
    ],
    typical_subcategories: ["zoos", "aquariums", "religious_sites"],
    interactive: true,
    implemented: true,
  },
  time_split: {
    id: "time_split",
    label: "Time split",
    answers: "How is the tour time actually divided?",
    data_shape: [
      "Stacked horizontal bar of named segments (transit / queue / at-site / breaks)",
      "Each segment carries minutes",
    ],
    typical_subcategories: [
      "guided_tours",
      "day_trips",
      "food_tours",
      "port_of_call_tours",
    ],
    interactive: false,
    implemented: true,
  },
  history_timeline: {
    id: "history_timeline",
    label: "History timeline",
    answers: "What are the major historical eras and turning points?",
    data_shape: [
      "5-9 chronological events with year/date labels",
      "Each event has an era bucket, short title, description, and optional metric",
      "Optional callout for the most visitor-relevant turning point",
    ],
    typical_subcategories: [
      "landmarks",
      "museums",
      "religious_sites",
      "observation_decks",
    ],
    interactive: false,
    implemented: true,
  },
  slot_compare: {
    id: "slot_compare",
    label: "Slot compare",
    answers: "How do two or three named time slots compare across dimensions?",
    data_shape: [
      "2-3 named slots (sunrise / midday / sunset, morning / afternoon, …)",
      "Same axes per slot (light, crowd, conditions, availability)",
    ],
    typical_subcategories: [
      "desert_safari",
      "hot_air_balloon",
      "cooking_classes",
    ],
    interactive: false,
    implemented: true,
  },
  sighting_probability: {
    id: "sighting_probability",
    label: "Sighting probability",
    answers: "What are the chances I'll actually see what I came for?",
    data_shape: [
      "12 months × % of trips with a confirmed sighting",
      "Optional per-species split",
    ],
    typical_subcategories: ["whale_watching", "safari"],
    interactive: false,
    implemented: true,
  },
  activity_window: {
    id: "activity_window",
    label: "Activity window",
    answers: "What time of day is wildlife / activity at its peak?",
    data_shape: [
      "Hourly curve of activity index (dawn / dusk peaks, midday trough)",
    ],
    typical_subcategories: ["safari"],
    interactive: true,
    implemented: true,
  },
  departure_reliability: {
    id: "departure_reliability",
    label: "Departure reliability",
    answers: "How likely is the session to actually depart on schedule?",
    data_shape: [
      "12 months × % of scheduled departures that ran",
      "Optional cancellation reasons split",
    ],
    typical_subcategories: ["skydiving", "hot_air_balloon"],
    interactive: false,
    implemented: true,
  },
  conditions_calendar: {
    id: "conditions_calendar",
    label: "Conditions calendar (legacy)",
    answers: "When are the conditions (snow, swell, visibility) actually good?",
    data_shape: [
      "12 months with a conditions index + status (poor / fair / optimal / expert)",
      "Optional secondary axis (species presence, harvest window)",
    ],
    typical_subcategories: [
      "skiing",
      "scuba_diving",
      "surfing",
      "rafting",
      "cable_car_tours",
      "outdoor_activities",
      "wineries",
      "hiking_trails",
    ],
    interactive: true,
    // Task #67: superseded by season_weather_fit. Schema + renderer kept;
    // orchestrator no longer requests this type.
    implemented: false,
  },
  golden_hour_match: {
    id: "golden_hour_match",
    label: "Golden-hour match",
    answers: "Which departure slot lines up with golden hour by month?",
    data_shape: [
      "Matrix: rows = months, cols = available slots, cell = aligned yes/no",
    ],
    typical_subcategories: ["photography_tours"],
    interactive: false,
    implemented: true,
  },
  savings_breakdown: {
    id: "savings_breakdown",
    label: "Savings breakdown",
    answers: "Which included attractions actually unlock the value?",
    data_shape: [
      "Horizontal bar per included attraction with standalone price",
      "Card / combo price as a threshold line",
    ],
    typical_subcategories: ["city_cards", "combos"],
    interactive: false,
    implemented: true,
  },
  return_buffer_rank: {
    id: "return_buffer_rank",
    label: "Return-buffer rank",
    answers: "Which tour gets me back to the ship with the safest buffer?",
    data_shape: [
      "Bar per tour option with buffer minutes vs ship departure",
      "Red < 30, amber 30-60, green > 60",
    ],
    typical_subcategories: ["port_of_call_tours"],
    interactive: false,
    implemented: true,
  },
  seat_value_map: {
    id: "seat_value_map",
    label: "Seat value map",
    answers: "Which seating sections are worth the premium?",
    data_shape: [
      "Simplified seatmap with sections coloured by price-to-sightline ratio",
    ],
    typical_subcategories: ["plays"],
    interactive: false,
    implemented: true,
  },
  optimal_departure: {
    id: "optimal_departure",
    label: "Optimal departure",
    answers: "Which departure slot delivers the best light / view / weather?",
    data_shape: [
      "2-6 named slots scored across 2-4 axes (light, weather, crowd)",
    ],
    typical_subcategories: ["sightseeing_cruises", "helicopter_tours"],
    interactive: false,
    implemented: true,
  },
  price_curve: {
    id: "price_curve",
    label: "Price curve",
    answers: "How does price change by departure date or booking lead time?",
    data_shape: ["12-26 points × price index", "Best/worst windows annotated"],
    typical_subcategories: ["sightseeing_cruises", "multi_day_tours", "train_tickets"],
    interactive: true,
    implemented: true,
  },
  stop_frequency: {
    id: "stop_frequency",
    label: "Stop frequency",
    answers: "If I hop off here, how long until the next bus?",
    data_shape: [
      "Bar per named stop with peak vs off-peak headway minutes",
    ],
    typical_subcategories: ["hop_on_hop_off"],
    interactive: false,
    implemented: true,
  },
  route_profile: {
    id: "route_profile",
    label: "Route profile (legacy)",
    answers: "What does this route cover, in what order, and who is it best for?",
    data_shape: [
      "3-12 ordered stops, piers, landmarks, or segments for one named route",
      "Optional duration, distance, landmark count, and best-for labels",
    ],
    typical_subcategories: [
      "sightseeing_cruises",
      "hop_on_hop_off",
      "walking_tours",
      "day_trips",
      "hiking_trails",
    ],
    interactive: false,
    // Task #67: superseded by landmark_coverage and itinerary_flow. Schema +
    // renderer kept; orchestrator no longer requests this type.
    implemented: false,
  },

  /* ---------------- Task #67 v3 promoted archetypes ---------------- */
  ticket_access_matrix: {
    id: "ticket_access_matrix",
    label: "Ticket access matrix",
    answers:
      "Which ticket tier actually unlocks the rooms / areas / perks I want, and which require a paid add-on or have limited access?",
    data_shape: [
      "2-5 priced tiers + 3-8 access features (named rooms, perks, inclusions)",
      "Per-feature × per-tier cell: included | excluded | extra (with optional extra_price/label) | limited (with optional label)",
      "At most one tier may be marked recommended",
    ],
    typical_subcategories: [
      "landmarks",
      "museums",
      "observation_decks",
      "theme_parks",
      "religious_sites",
      "wineries",
      "cooking_classes",
      "spa",
      "baths",
      "combos",
      "dinner_cruises",
    ],
    interactive: false,
    implemented: true,
  },
  duration_budget: {
    id: "duration_budget",
    label: "Duration budget",
    answers:
      "How should I budget my time at this CE, and which block do I drop on a tight schedule vs extend on a deep-dive day?",
    data_shape: [
      "Total visit duration",
      "3-6 named blocks whose minutes sum within 5% of total",
      "Per-block accent (purps/candy/hola/okay/slate) and optional badge: skip_if_tight | extend_if_deep_dive (at most one of each across all blocks; never both on the same block)",
    ],
    typical_subcategories: [
      "museums",
      "landmarks",
      "theme_parks",
      "immersive_experiences",
      "baths",
      "spa",
    ],
    interactive: false,
    implemented: true,
  },
  landmark_coverage: {
    id: "landmark_coverage",
    label: "Landmark coverage",
    answers:
      "Across 2-4 operator routes, which landmarks does each route actually cover (stop / short walk / view-only / not on route)?",
    data_shape: [
      "2-4 named routes (each with optional accent and at-most-one recommended)",
      "3-12 landmarks, each with importance kind (icon/highlight/standard) and one coverage state per route in route order",
      "Coverage state per cell: covered | near | view_only | none",
      "Optional best-for tags and callout",
    ],
    typical_subcategories: [
      "hop_on_hop_off",
      "photography_tours",
      "sightseeing_cruises",
    ],
    interactive: false,
    implemented: true,
  },
  itinerary_flow: {
    id: "itinerary_flow",
    label: "Itinerary flow",
    answers:
      "What's the rhythm of the itinerary — how long at each stop and how long in transit between them?",
    data_shape: [
      "Mode (walk / bus / boat / mixed / day_trip) and optional total_duration_min",
      "3-12 ordered stops with kind = start / stop / highlight / end (first must be start, last must be end)",
      "Optional per-stop dwell_min",
      "transits[] with EXACTLY stops.length - 1 entries — minutes per gap, optional mode and note",
    ],
    typical_subcategories: [
      "walking_tours",
      "day_trips",
      "food_tours",
      "port_of_call_tours",
      "guided_tours",
    ],
    interactive: false,
    implemented: true,
  },
  best_for_matrix: {
    id: "best_for_matrix",
    label: "Best-for matrix",
    answers:
      "Across 3-5 audience-fit facets (pace, headline payoff, photography, kid-friendliness, etc.), which audience scores highest on each?",
    data_shape: [
      "3-5 facets (each with optional top_audience_index override)",
      "3-6 audiences, each with accent and one score 0-100 per facet (in facet order)",
      "Renderer auto-marks the top-scoring audience per facet (or honours top_audience_index)",
      "Distinct from slot_compare (ranks 2-3 SLOTS with shared dimensions); this ranks 3-6 AUDIENCES on 3-5 FACETS",
    ],
    typical_subcategories: [
      "guided_tours",
      "city_cards",
      "combos",
      "cooking_classes",
      "helicopter_tours",
    ],
    interactive: false,
    implemented: true,
  },
  season_weather_fit: {
    id: "season_weather_fit",
    label: "Season & weather fit",
    answers:
      "Which months are in the right window for this activity, and *why* — temperature, rainfall, daylight, operator availability, or crowd?",
    data_shape: [
      "Activity label + 3-5 named dimensions (e.g. temperature, rainfall, operator availability)",
      "12 months × dimensions matrix where each cell carries score 0-100 AND status (closed/poor/fair/good/optimal)",
      "Optional per-month overall_status and temp_label; best/worst month lists",
      "Distinct from seasonal_curve (single continuous curve of one metric across the year); this is a 2D dimension × month heatmap",
    ],
    typical_subcategories: [
      "outdoor_activities",
      "skiing",
      "scuba_diving",
      "surfing",
      "rafting",
      "cable_car_tours",
      "wineries",
      "hiking_trails",
      "walking_tours",
      "hop_on_hop_off",
    ],
    interactive: false,
    implemented: true,
  },
};

export const CHART_ARCHETYPE_IDS = Object.keys(
  CHART_ARCHETYPES,
) as ChartArchetypeId[];

export function getArchetype(id: ChartArchetypeId): ChartArchetype {
  return CHART_ARCHETYPES[id];
}

export function isImplementedArchetype(id: ChartArchetypeId): boolean {
  return CHART_ARCHETYPES[id]?.implemented === true;
}
