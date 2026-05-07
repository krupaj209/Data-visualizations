import type { ChartArchetype, ChartArchetypeId } from "./types";

/**
 * Read-only registry of the chart archetypes Viz Studio supports today.
 *
 * The pipeline uses this registry to:
 *  1. Match a chosen visitor question to a candidate chart archetype.
 *  2. Tell the data-generation LLM what shape to fill in.
 *  3. Provide soft per-subcategory affinity hints for question selection.
 *
 * No new archetypes are introduced here — this strictly mirrors what
 * already exists in `artifacts/api-server/src/lib/chart-spec.ts`. New
 * archetypes must be added to `chartSpecSchema` first, then registered
 * here.
 */
export const CHART_ARCHETYPES: Record<ChartArchetypeId, ChartArchetype> = {
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
    ],
    interactive: false,
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
  },
};

export const CHART_ARCHETYPE_IDS = Object.keys(
  CHART_ARCHETYPES,
) as ChartArchetypeId[];

export function getArchetype(id: ChartArchetypeId): ChartArchetype {
  return CHART_ARCHETYPES[id];
}
