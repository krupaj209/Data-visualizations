/**
 * Static compatibility map for the "Change type" gallery.
 *
 * When a writer opens the archetype gallery from an existing chart, we surface
 * 2–3 "Best fits" whose data shape overlaps meaningfully with what's already
 * been generated. No Gemini call — purely field-shape reasoning.
 *
 * Structure: each key is a source archetype; its value is an ordered list of
 * compatible targets with a one-line human reason why they work. The first
 * 2–3 entries become the "Best fits" section. The map is asymmetric where the
 * overlap is clearer in one direction (e.g. weekly_pattern → daily_pattern is
 * obvious; the reverse is less so).
 */

export interface CompatEntry {
  /** Target archetype id. */
  target: string;
  /** One-line reason shown in the gallery card, ≤80 chars. */
  reason: string;
}

export const ARCHETYPE_COMPAT: Record<string, CompatEntry[]> = {
  /* ── Intraday time-series ─────────────────────────────────────────────── */
  daily_pattern: [
    {
      target: "tribune_density",
      reason: "Same intraday curve shape, different crowd-density framing.",
    },
    {
      target: "hourly_heatmap",
      reason: "Extends hourly data across all 7 days for a week-wide view.",
    },
    {
      target: "weekly_pattern",
      reason: "Rolls up your time-of-day data into a per-day summary.",
    },
  ],

  tribune_density: [
    {
      target: "daily_pattern",
      reason: "Same time-of-day curve, drops the venue-specific density frame.",
    },
    {
      target: "hourly_heatmap",
      reason: "Shows the same hour-by-hour data across all 7 weekdays.",
    },
    {
      target: "weekly_pattern",
      reason: "Condenses hourly density into a simpler day-of-week view.",
    },
  ],

  hourly_heatmap: [
    {
      target: "daily_pattern",
      reason: "Averages your 7×24 grid into a single intraday curve.",
    },
    {
      target: "weekly_pattern",
      reason: "Collapses hour detail into a per-day crowd level.",
    },
    {
      target: "tribune_density",
      reason: "Same time-of-day data with a venue-density narrative.",
    },
  ],

  /* ── Day-of-week ─────────────────────────────────────────────────────── */
  weekly_pattern: [
    {
      target: "daily_pattern",
      reason: "Same day-of-week data with richer intraday time resolution.",
    },
    {
      target: "hourly_heatmap",
      reason: "Adds hour-by-hour breakdowns to your 7-day crowd levels.",
    },
    {
      target: "slot_compare",
      reason: "Reframes your busiest vs quietest days as scoreable time slots.",
    },
  ],

  /* ── Twelve-month / seasonal ─────────────────────────────────────────── */
  seasonal_curve: [
    {
      target: "conditions_calendar",
      reason: "Same 12-month shape, swaps crowd score for a physical metric.",
    },
    {
      target: "price_curve",
      reason: "Same monthly structure, substitutes crowd level for price index.",
    },
    {
      target: "sighting_probability",
      reason: "Reframes monthly data as a wildlife/event sighting chance.",
    },
    {
      target: "departure_reliability",
      reason: "Same 12-month frame, shows % of departures that ran.",
    },
  ],

  conditions_calendar: [
    {
      target: "seasonal_curve",
      reason: "Drops the physical metric and shows month-by-month crowd volume.",
    },
    {
      target: "price_curve",
      reason: "Swaps physical conditions for a monthly price index.",
    },
    {
      target: "sighting_probability",
      reason: "Same monthly array, reframed around sighting success rates.",
    },
  ],

  sighting_probability: [
    {
      target: "seasonal_curve",
      reason: "Replaces sighting % with a broader crowd/busyness score.",
    },
    {
      target: "conditions_calendar",
      reason: "Same monthly cadence, shows physical conditions instead.",
    },
    {
      target: "departure_reliability",
      reason: "Similar monthly % series, focused on trip run-rates.",
    },
  ],

  departure_reliability: [
    {
      target: "seasonal_curve",
      reason: "Same 12-month frame, crowd levels instead of run-rate %.",
    },
    {
      target: "conditions_calendar",
      reason: "Swaps departure % for a physical-conditions metric.",
    },
    {
      target: "price_curve",
      reason: "Same monthly series structure, shows price index instead.",
    },
  ],

  price_curve: [
    {
      target: "seasonal_curve",
      reason: "Same 12-month layout, crowd/busyness instead of price.",
    },
    {
      target: "conditions_calendar",
      reason: "Same monthly cadence, physical conditions instead of price.",
    },
    {
      target: "booking_window",
      reason: "Complements pricing with how far in advance visitors book.",
    },
  ],

  /* ── Time-allocation / visit planning ───────────────────────────────── */
  time_split: [
    {
      target: "daily_programme",
      reason: "Same open-to-close timeframe as a sequential event timeline.",
    },
    {
      target: "slot_compare",
      reason: "Reframes your time segments as scoreable visit-time slots.",
    },
    {
      target: "duration_profiles",
      reason: "Shifts from time allocation to typical total visit durations.",
    },
  ],

  daily_programme: [
    {
      target: "time_split",
      reason: "Collapses your event timeline into proportional time segments.",
    },
    {
      target: "history_timeline",
      reason: "Reuses the horizontal spine for a historical narrative instead.",
    },
    {
      target: "slot_compare",
      reason: "Converts your time-of-day events into comparable visit windows.",
    },
  ],

  slot_compare: [
    {
      target: "weekly_pattern",
      reason: "Rolls your slot scores up into a simple day-level view.",
    },
    {
      target: "time_split",
      reason: "Reframes visit slots as a proportional day split.",
    },
    {
      target: "daily_pattern",
      reason: "Shows the same time-of-day data as a continuous crowd curve.",
    },
  ],

  /* ── Duration ───────────────────────────────────────────────────────── */
  duration_profiles: [
    {
      target: "duration_stat",
      reason: "Distills your visit duration distribution into headline stats.",
    },
    {
      target: "time_split",
      reason: "Reframes duration segments as proportional time allocation.",
    },
    {
      target: "booking_window",
      reason: "Pairs duration planning with how far ahead visitors book.",
    },
  ],

  duration_stat: [
    {
      target: "duration_profiles",
      reason: "Expands stat headlines into a full duration distribution chart.",
    },
    {
      target: "stat_grid",
      reason: "Combines duration with other headline numbers in one grid.",
    },
    {
      target: "booking_window",
      reason: "Complements visit-length data with advance-booking patterns.",
    },
  ],

  /* ── Booking ────────────────────────────────────────────────────────── */
  booking_window: [
    {
      target: "seasonal_curve",
      reason: "Pairs booking lead times with the month-by-month busy curve.",
    },
    {
      target: "duration_profiles",
      reason: "Complements when-to-book with how long visitors typically stay.",
    },
    {
      target: "price_curve",
      reason: "Links booking-window advice to monthly price variation.",
    },
  ],

  /* ── Entrance / logistics ───────────────────────────────────────────── */
  entrance_lanes: [
    {
      target: "compare_zones",
      reason: "Same lane-vs-lane comparison, broader zone metric.",
    },
    {
      target: "queue_compare",
      reason: "Same entry-point data presented as a queue wait comparison.",
    },
    {
      target: "weekly_pattern",
      reason: "Shifts focus from which door to which day is quieter.",
    },
  ],

  compare_zones: [
    {
      target: "entrance_lanes",
      reason: "Refocuses zone wait-times onto specific entrance lanes.",
    },
    {
      target: "queue_compare",
      reason: "Same zone data reframed as a ranked queue comparison.",
    },
  ],

  queue_compare: [
    {
      target: "entrance_lanes",
      reason: "Shares the per-entry-point wait data with lane-specific labels.",
    },
    {
      target: "compare_zones",
      reason: "Same ranked wait-time data across broader venue zones.",
    },
    {
      target: "weekly_pattern",
      reason: "Translates queue patterns into a day-of-week crowd view.",
    },
  ],

  /* ── Co-bookings / ticket value ─────────────────────────────────────── */
  co_bookings: [
    {
      target: "ticket_ladder",
      reason: "Shifts from what visitors combine to which ticket tier to pick.",
    },
    {
      target: "donut_breakdown",
      reason: "Summarises co-booking shares as a single ring proportion.",
    },
  ],

  ticket_ladder: [
    {
      target: "co_bookings",
      reason: "Pairs ticket tiers with what other attractions visitors combine.",
    },
    {
      target: "donut_breakdown",
      reason: "Collapses tier shares into a single donut proportion.",
    },
    {
      target: "stat_grid",
      reason: "Surfaces your tier prices and inclusions as scannable stats.",
    },
  ],

  donut_breakdown: [
    {
      target: "stat_grid",
      reason: "Turns your share breakdown into headline numbers.",
    },
    {
      target: "co_bookings",
      reason: "Expands the share ring into a ranked co-booking list.",
    },
  ],

  stat_grid: [
    {
      target: "duration_stat",
      reason: "Replaces generic stats with a visit-duration focused layout.",
    },
    {
      target: "donut_breakdown",
      reason: "Turns one of your stats into a proportional ring chart.",
    },
    {
      target: "ticket_ladder",
      reason: "Swaps numbers for a structured ticket-tier comparison.",
    },
  ],

  /* ── Historical / narrative ─────────────────────────────────────────── */
  history_timeline: [
    {
      target: "daily_programme",
      reason: "Same horizontal spine reused for a present-day event schedule.",
    },
    {
      target: "time_split",
      reason: "Distils your eras into proportional time segments.",
    },
  ],
};

/**
 * Returns the top N (default 3) compatible archetypes for a given source,
 * filtered to only those that are in the provided `available` set.
 */
export function getBestFits(
  sourceArchetype: string,
  available: string[],
  maxCount = 3,
): Array<CompatEntry & { target: string }> {
  const entries = ARCHETYPE_COMPAT[sourceArchetype] ?? [];
  const availSet = new Set(available);
  return entries
    .filter((e) => availSet.has(e.target) && e.target !== sourceArchetype)
    .slice(0, maxCount);
}
