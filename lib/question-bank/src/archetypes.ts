import type { ChartArchetype, ChartArchetypeId } from "./types";

/**
 * Read-only registry of every chart archetype Viz Studio knows about.
 *
 * Today's nine archetypes mirror `artifacts/api-server/src/lib/chart-spec.ts`
 * and are flagged `implemented: true`. The remaining v3 archetypes are
 * RESERVED here so the question bank can reference them — their Zod schemas
 * and React renderers land in the five sibling chart-family tasks. The
 * pipeline never asks Gemini to produce an `implemented: false` archetype;
 * it records `viz_not_yet_built` in provenance instead.
 *
 * To promote a reserved archetype:
 *   1. Add its schema to `chartSpecSchema` (api-server).
 *   2. Add its renderer + ChartRenderer case (viz-studio).
 *   3. Replace the stub prompt in `chart-archetype-prompts.ts`.
 *   4. Flip `implemented` to `true` here.
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
    label: "Ticket ladder",
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
    implemented: true,
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
    implemented: false,
  },
  duration_stat: {
    id: "duration_stat",
    label: "Duration stat",
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
    implemented: false,
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
    implemented: false,
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
    implemented: false,
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
    implemented: false,
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
    interactive: false,
    implemented: false,
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
    implemented: false,
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
    implemented: false,
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
    implemented: false,
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
    implemented: false,
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
    implemented: false,
  },
  conditions_calendar: {
    id: "conditions_calendar",
    label: "Conditions calendar",
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
    implemented: false,
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
    implemented: false,
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
    implemented: false,
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
    implemented: false,
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
    implemented: false,
  },
  price_curve: {
    id: "price_curve",
    label: "Price curve",
    answers: "How does price change by departure date or booking lead time?",
    data_shape: ["12-26 points × price index", "Best/worst windows annotated"],
    typical_subcategories: ["multi_day_tours", "train_tickets"],
    interactive: true,
    implemented: false,
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
    implemented: false,
  },
  route_profile: {
    id: "route_profile",
    label: "Route profile",
    answers: "How long is the route and how hilly is it?",
    data_shape: [
      "Distance bar (km) + elevation gain bar (m) for one named route",
    ],
    typical_subcategories: ["walking_tours", "hiking_trails"],
    interactive: false,
    implemented: false,
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
