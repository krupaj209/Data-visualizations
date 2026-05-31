/**
 * Per-archetype bullet list of what DRD content (or CE Intel data) is needed
 * to produce a credible chart spec. Shown in the ArchetypeDetailPanel so
 * writers can quickly judge whether their research doc covers this chart type.
 *
 * 3-5 short strings per archetype. Generic / unmapped archetypes get the
 * fallback from `getArchetypeDataRequirements()`.
 */

export const ARCHETYPE_DATA_REQUIREMENTS: Partial<Record<string, string[]>> = {
  weekly_pattern: [
    "Day-of-week crowd or wait data (Mon–Sun)",
    "Any regular closures (e.g. closed Mondays)",
    "Notable spikes: free-admission days, school-holiday Saturdays",
  ],
  hourly_heatmap: [
    "Hour-by-hour crowd or wait-time data across the open week",
    "Opening and closing hours per day",
    "Best quiet window or off-peak period (if known)",
    "Day-of-week variation if available",
  ],
  daily_pattern: [
    "Hourly crowd/activity index across a representative open day",
    "Opening and last-entry times",
    "Quiet vs peak zone boundaries",
  ],
  seasonal_curve: [
    "Month-by-month crowd levels or visitor-count data",
    "Best and worst months for visiting",
    "Any seasonal closures or reduced hours",
  ],
  booking_window: [
    "Data on how far in advance visitors typically book",
    "Sold-out risk thresholds for popular slots or dates",
    "Sweet-spot booking window (e.g. 1–3 weeks ahead)",
  ],
  entrance_lanes: [
    "Named entrance lanes or gates with wait times",
    "Which lane skip-the-line / reservation holders use",
    "Peak vs off-peak wait estimates per lane",
  ],
  ticket_access_matrix: [
    "All available ticket tiers with prices",
    "Per-tier feature/area access (included, excluded, extra cost, limited)",
    "Any ticket that includes skip-the-line or reserved time slots",
    "Recommended or most-popular tier",
  ],
  duration_budget: [
    "Total typical visit duration",
    "Named visit blocks (e.g. entry + security, main highlights, optional galleries)",
    "Which block to skip on a tight schedule and which to extend on a deep dive",
  ],
  rules_checklist: [
    "Prohibited items or behaviours (bags, photography, food/drink)",
    "Dress-code requirements",
    "Security screening and bag-check procedures",
    "Accessibility or age restrictions",
  ],
  transit_options: [
    "Transit modes to the venue from city centre / airport",
    "Travel time ranges per mode",
    "Cost or ticket type per mode",
    "Recommended option and frequency of service",
  ],
  landmark_coverage: [
    "Named routes (2–4) the operator offers",
    "List of key landmarks in the city/area",
    "Which route covers each landmark (stop / short walk / view-only / skips)",
    "Best-for audience per route if known",
  ],
  itinerary_flow: [
    "Ordered stop list with names and types (start / highlight / stop / end)",
    "Dwell time at each stop (minutes)",
    "Transit time between stops and mode (walk / bus / boat)",
  ],
  best_for_matrix: [
    "2–4 sub-product or option names",
    "3–5 audience segments (e.g. families, solo, photographers, couples)",
    "Per-option performance on each audience facet (score 0–100)",
  ],
  season_weather_fit: [
    "Month-by-month data on 3–5 dimensions: temperature, rainfall, crowd, operator availability, daylight",
    "Status per dimension per month: closed / poor / fair / good / optimal",
    "Best and worst month recommendations",
  ],
  accessibility_guide: [
    "Wheelchair / step-free access details",
    "Elevator or ramp availability",
    "Audio guide, hearing loop, or sensory aid provision",
    "Contact or booking info for accessibility services",
  ],
  floor_plan_flow: [
    "Ordered list of floors, wings, or rooms inside the venue",
    "Recommended visit sequence with rationale",
    "Dwell time per section if available",
  ],
  entrance_map: [
    "Named entrance gates with their purpose (general, reserved, accessible, groups)",
    "Wait-time or recommendation status per entrance",
    "Any entrance that should be avoided at peak times",
  ],
  highlight_rank: [
    "Top 3–10 artworks, exhibits, rides, or attractions by visitor priority",
    "Any 'hidden gem' or 'most Instagrammed' badges",
    "One-sentence insight on what to prioritise",
  ],
  history_timeline: [
    "5–9 chronological events: founding, major milestones, decline, restoration, modern status",
    "Era label for each event (origins, construction, spectacle, decline, reuse, restoration, modern)",
    "Optional metric per event (e.g. seating capacity, visitor count)",
    "Pivotal turning point that most affects the visitor experience today",
  ],
  time_split: [
    "Named visit segments and their duration in minutes",
    "Which segments are optional vs core",
    "Total visit duration the segments add up to",
  ],
  slot_compare: [
    "2–3 named time slots (e.g. sunrise, midday, late afternoon)",
    "Per-slot scores on 3–5 shared dimensions (crowds, light, queue, availability)",
    "Which slot is recommended and why",
  ],
  daily_programme: [
    "Schedule of fixed timed events (shows, feeding times, talks)",
    "Duration and location of each event",
    "Popularity or fill-rate of each event (so writers can flag the must-book slots)",
  ],
  hourly_heatmap_zones: [
    "Named zones or galleries with crowd levels by hour",
    "Opening hours for each zone",
    "Any zone that has timed or restricted entry",
  ],
  zone_wait_heatmap: [
    "Named zones / lands with wait times by hour of day",
    "Opening hours per zone",
    "Rope-drop strategy if applicable",
  ],
  zone_crowd_heatmap: [
    "Named galleries or exhibits with crowd levels by hour",
    "Which exhibits are busiest at opening vs midday",
  ],
  ride_wait_curve: [
    "Hourly wait-time data for the headline ride",
    "Park opening and closing times",
    "Peak and shoulder windows",
  ],
  opening_hour_rank: [
    "Wait time at rope drop for the main rides",
    "Ranked list of rides by first-hour priority",
  ],
  optimal_departure: [
    "Available departure time slots (names and times)",
    "Per-slot scores on light quality, weather, crowd, and views",
  ],
  stop_frequency: [
    "Named stops with peak and off-peak headway (minutes between services)",
    "Bus / boat frequency per stop",
  ],
  route_profile: [
    "Ordered stop list for the route",
    "Optional per-stop duration, distance, landmark, and best-for label",
  ],
  sighting_probability: [
    "Monthly sighting probability (% of trips with a confirmed sighting)",
    "Best and worst months for sightings",
    "Optional per-species breakdown",
  ],
  activity_window: [
    "Hourly activity index across a typical open day",
    "Dawn and dusk peak windows",
  ],
  departure_reliability: [
    "Monthly % of scheduled departures that ran (not cancelled)",
    "Typical cancellation reasons by season",
  ],
  conditions_calendar: [
    "Monthly conditions index for the primary metric (snow, swell, visibility)",
    "Status buckets: poor / fair / optimal / expert-only",
  ],
  price_curve: [
    "Monthly price index (how price varies across the year)",
    "Cheapest and most expensive windows",
    "Whether prices are truly dynamic or fixed by season",
  ],
  savings_breakdown: [
    "Standalone admission prices for each included attraction",
    "Card / combo / pass price",
    "Which inclusions provide the most savings",
  ],
  time_value_matrix: [
    "Named visit scenarios (e.g. half-day basic, full-day skip-the-line)",
    "Per-scenario scores on time saved, cost, depth, and flexibility",
    "Which scenario offers the best value for each budget type",
  ],
  golden_hour_match: [
    "Available departure slots by name and time",
    "Sunrise / sunset times by month",
    "Which slot lines up with golden-hour light per month",
  ],
  return_buffer_rank: [
    "Named tour options with return times",
    "Ship or train departure time",
    "Buffer in minutes for each tour (used to colour-code risk)",
  ],
  seat_value_map: [
    "Seating sections with prices",
    "Sightline or experience quality per section",
    "Which section offers the best price-to-quality ratio",
  ],
  stat_grid: [
    "3–6 headline numeric facts about the venue (annual visitors, average visit length, etc.)",
    "Optional trend or delta for each stat",
  ],
  compare_zones: [
    "2–5 named sub-areas or zones with wait times",
    "Share of visitors per zone if available",
    "Status bucket per zone: no_wait / short / moderate / long",
  ],
  donut_breakdown: [
    "2–6 segments with values that sum to ~100",
    "The dominant segment name and its value",
  ],
};

export function getArchetypeDataRequirements(archetypeId: string): string[] {
  return (
    ARCHETYPE_DATA_REQUIREMENTS[archetypeId] ?? [
      "Relevant quantitative data from the Deep Research Doc",
      "Source citations for any numeric claims",
      "Visitor-facing framing that maps to the chart's question",
    ]
  );
}
