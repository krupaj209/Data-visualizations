import type { ChartArchetypeId } from "@workspace/question-bank";

/**
 * Per-archetype JSON schema snippet, copied from `chart-spec.ts` so the
 * orchestrator can prompt Gemini to fill in EXACTLY ONE archetype's spec
 * at a time (rather than re-emitting the giant menu in every prompt).
 *
 * Today's nine implemented archetypes carry a real prompt (kept in lockstep
 * with `chartSpecSchema`). The remaining v3 archetypes have STUB entries —
 * the pipeline never actually calls Gemini for them today (the orchestrator
 * skips any question whose archetype is `implemented: false`). The stubs
 * exist so sibling chart-family tasks can drop in the real prompt without
 * touching the orchestrator.
 */
const STUB = (id: string) =>
  `// TODO(${id}): real prompt lands with the chart-family sibling task. The orchestrator should never reach this code path while the archetype is flagged implemented:false in CHART_ARCHETYPES.`;

export const ARCHETYPE_PROMPT: Record<ChartArchetypeId, string> = {
  /* ---------------- implemented today ---------------- */
  weekly_pattern: `{ "type": "weekly_pattern",
  "days": [ { "day": "<mon|tue|wed|thu|fri|sat|sun>", "level": "<closed|quietest|quiet|busy|busiest>", "score": <0-100 int>, "note"?: "..." }, ... 7 items ],
  "day_notes"?: [ { "label": "Mon closed", "kind": "<closed|free|info>" }, ... up to 4 ] }
Include all 7 days. Use level "closed" + score 0 for closed days. Aim for one "busiest" and one "quietest".`,

  hourly_heatmap: `{ "type": "hourly_heatmap",
  "open_hour": <0-23 int>, "close_hour": <1-24 int>,
  "rows": [ { "day": "<mon..sun>", "hours": [<24 ints 0-100>], "closed": <bool> }, ... 7 items ],
  "best_window"?: { "label": "...", "day": "<mon..sun>", "start_hour": <int>, "end_hour": <int> } }
hours[] is ALWAYS 24 numbers. Set 0 outside opening hours; closed days get closed:true and all-zero hours.
SOURCING: Hourly crowd intensities should be grounded in a real signal — Google "Popular Times" snapshots, operator dashboards, queue-time aggregators, or DRD-quoted observations. If neither the DRD nor googleSearch surfaces hour-by-hour data for THIS CE, prefer SHAPE-only intensities (e.g. clear morning trough vs. mid-day peak vs. late-day fade) using round numbers in 5-step buckets, mark every hour cell in provenance.estimates, and lower confidence in the insight ("typically busiest mid-afternoon — exact peak hour varies"). Never fabricate a precise per-hour curve from "feel".`,

  month_calendar: `{ "type": "month_calendar",
  "start_date": "YYYY-MM-DD",
  "days": [ { "date": "YYYY-MM-DD", "score": <0-100 int>, "status": "<closed|very_quiet|quiet|moderate|busy|peak>", "label"?: "..." }, ... 60-90 consecutive days from start_date ],
  "recommended_dates": [ { "date": "YYYY-MM-DD", "reason": "..." }, ... 3-5 items, all dates must appear in days[] ] }`,

  booking_window: `{ "type": "booking_window",
  "curve": [ { "days_before": <int 0-180>, "share": <0-100 number> }, ... 8-14 items, days_before unique, span ~0..120 ],
  "sweet_spot": { "days_before_min": <int>, "days_before_max": <int>, "label": "..." },
  "sold_out_risk"?: { "threshold_days": <int>, "message": "..." } }
Sum of share roughly 100. days_before_min ≤ days_before_max.
SOURCING: The booking-curve shape MUST come from a real source — DRD-quoted operator booking-window data, OTA-published lead-time analysis, or industry reports (Phocuswright, Skift, Arival). If neither the DRD nor googleSearch can ground the lead-time pattern for THIS subcategory in THIS city, DROP the chart instead of inventing a curve from feel. If you keep it on a thin sourcing base, use round 5-day buckets, OMIT \`sold_out_risk\` (don't fabricate a sell-out threshold), keep the sweet_spot wide, and list every curve point in provenance.estimates with the reasoning "subcategory-typical lead-time shape, exact daily distribution not grounded".`,

  stat_grid: `{ "type": "stat_grid",
  "stats": [ { "label": "...", "value": "...", "unit"?: "...", "delta"?: "...", "accent"?: "<purps|candy|hola|okay|slate>", "sparkline"?: [<numbers>], "footnote"?: "..." }, ... 3-6 items ] }`,

  compare_zones: `{ "type": "compare_zones",
  "metric_label": "Average wait time" or similar,
  "zones": [ { "name": "...", "emoji"?: "🗿", "wait_min": <int 0-360>, "wait_max": <int 0-360>, "status": "<no_wait|short|medium|long|very_long|closed>", "tip"?: "...", "share_of_visitors"?: <0-100 int> }, ... 2-5 items ] }
metric_label and per-zone status are REQUIRED. wait_min ≤ wait_max.`,

  donut_breakdown: `{ "type": "donut_breakdown",
  "center_value": "82%", "center_label": "skip-the-line",
  "segments": [ { "label": "...", "value": <0-100 int>, "accent"?: "<purps|candy|hola|okay|slate>" }, ... 2-6 items, values sum to ~100 ] }`,

  seasonal_curve: `{ "type": "seasonal_curve",
  "months": [ { "month": "<jan..dec>", "score": <0-100 int>, "status": "<closed|very_quiet|quiet|moderate|busy|peak>", "note"?: "...", "weather_score"?: <0-100 int>, "price_score"?: <0-100 int> }, ... 12 items ],
  "best_months": ["May", "October"], "worst_months": ["August"],
  "calendar_notes"?: [ { "label": "Jan 1 closed", "kind": "<closed|free|info>" }, ... up to 8 ],
  "metric_insights"?: { "crowd"?: "...", "weather"?: "...", "price"?: "..." } }
Optional fields (weather_score, price_score, calendar_notes, metric_insights) only when DRD or live sources support them.
SOURCING: The 12 monthly crowd scores MUST be grounded in a real seasonality signal — DRD section on monthly visitation, tourism-board arrivals data, ONS / city tourism dashboards, or operator-published occupancy. If grounding is thin, anchor on observable inputs (school holidays, average temperature, daylight hours, peak-tourist months for the city) using round 10-step buckets, drop weather_score / price_score / metric_insights entirely (don't invent supporting metrics), and list every month in provenance.estimates. If even the city-level seasonality can't be grounded for this subcategory, DROP the chart rather than fabricate one.`,

  ticket_ladder: STUB("ticket_ladder"),
  // ^ STUB (Task #67): superseded by ticket_access_matrix. Schema + renderer
  //   stay so existing curated charts keep rendering, but the orchestrator
  //   no longer asks Gemini for new ticket_ladder specs.

  /* ---------------- implemented today ---------------- */
  queue_compare: `{ "type": "queue_compare",
  "venue_label": "<short venue name, ≤80 chars>",
  "shared_caption": "<one-line context shared across lanes, ≤160 chars>",
  "lanes": [ { "name": "<lane name>", "wait_label": "<e.g. ~10 min>", "tone": "<candy|purps|okay|slate>", "dots": <int 0-40, comparable across lanes>, "dashed"?: <bool, true for closed/skip-only lanes>, "who"?: "<who uses this lane, ≤160 chars>", "wait_peak"?: "...", "wait_off_peak"?: "...", "how"?: "..." }, ... 2-5 items ] }
Use 'tone' to encode speed: candy = longest, slate/okay = fastest. 'dots' should scale linearly with wait time so lanes are visually comparable. Reserve 'dashed':true for lanes that are conditional (closed, members-only).`,

  duration_stat: STUB("duration_stat"),
  // ^ STUB (Task #67): superseded by duration_budget. Schema + renderer
  //   retained for legacy/curated charts; orchestrator no longer requests it.

  ride_wait_curve: `{ "type": "ride_wait_curve",
  "subject": "<the ONE ride this curve is about, e.g. Tron Lightcycle Run>",
  "y_label": "<e.g. Wait (min)>",
  "unit": "<e.g. min>",
  "open_hour": <0-23 int>, "close_hour": <1-24 int, > open_hour>,
  "hours": [ { "hour": <0-23 int, each appears exactly once>, "value": <number 0-1000> }, ... 24 items ],
  "zones": [ { "label": "<e.g. Best>", "tone": "<best|peak|second_best>", "start_hour": <int>, "end_hour": <int, > start_hour> }, ... 1-4 items ],
  "insight"?: "<one-line takeaway, ≤160 chars>" }
hours[] MUST contain hour 0..23 exactly once. Set value:0 outside opening hours. close_hour is EXCLUSIVE (open=9, close=18 means 9..17 inclusive). Zones overlap the curve (best window, peak, second-best); zone end_hour is also exclusive. Use 'peak' tone exactly once for the worst time of day.`,

  opening_hour_rank: `{ "type": "opening_hour_rank",
  "subject_label": "<noun for the items, e.g. Ride>",
  "unit": "<e.g. min>",
  "hour_label": "<chart strapline, e.g. Wait at 9:00 am opening>",
  "bands": { "green_max": <number, ≤ amber_max>, "amber_max": <number> },
  "subjects": [ { "name": "<ride/exhibit/etc>", "wait_minutes": <number 0-360>, "note"?: "<≤80 chars>" }, ... 3-8 items ],
  "insight"?: "<one-line takeaway, ≤160 chars>" }
The renderer sorts shortest→longest itself. Pick bands so the bottom 1-2 fall in green and the top 1-2 fall in red — they communicate priority.`,

  activity_window: `{ "type": "activity_window",
  "subject": "<the activity / animal / phenomenon, e.g. Big-five sightings>",
  "y_label": "<e.g. Activity index>",
  "unit": "<e.g. (0-100) — empty string is fine>",
  "open_hour": <0-23 int>, "close_hour": <1-24 int, > open_hour>,
  "hours": [ { "hour": <0-23 int, each appears exactly once>, "value": <number 0-100> }, ... 24 items ],
  "zones": [ { "label": "<e.g. Dawn peak>", "tone": "<best|peak|second_best>", "start_hour": <int>, "end_hour": <int, > start_hour> }, ... 1-4 items ],
  "insight"?: "<one-line takeaway, ≤160 chars>" }
hours[] MUST cover 0..23 exactly once. close_hour and zone end_hour are EXCLUSIVE (open=6, close=19 means 6..18 inclusive). Activity index typically peaks at dawn/dusk for wildlife — make the curve actually bimodal when the DRD/sources support it.`,

  zone_wait_heatmap: `{ "type": "zone_wait_heatmap",
  "open_hour": <0-23 int>, "close_hour": <1-24 int>,
  "unit": "min",
  "zones": [ { "name": "Fantasyland", "emoji"?: "🏰", "hours": [<24 wait-minute ints, 0-360>] }, ... 2-8 named lands/sections, hours[] always length 24, 0 outside opening hours ],
  "best_window"?: { "label": "Big Thunder before 11am", "zone": "Frontierland", "start_hour": <int>, "end_hour": <int> } }
Each row is one named land/section (e.g. Magic Kingdom: Fantasyland, Tomorrowland, Frontierland). Cell value = typical wait minutes at that hour. Use 0 for closed hours. Aim for one zone × hour cell that's clearly the calmest sweet spot.`,

  zone_crowd_heatmap: `{ "type": "zone_crowd_heatmap",
  "open_hour": <0-23 int>, "close_hour": <1-24 int>,
  "zones": [ { "name": "Sistine Chapel", "emoji"?: "🎨", "hours": [<24 crowd-score ints, 0-100>] }, ... 2-8 named galleries/exhibits, hours[] always length 24, 0 outside opening hours ],
  "best_window"?: { "label": "Sistine first thing", "zone": "Sistine Chapel", "start_hour": <int>, "end_hour": <int> } }
Each row is one named gallery / hall / exhibit (e.g. Vatican Museums: Sistine Chapel, Raphael Rooms, Gallery of Maps). Cell value = 0-100 crowd score at that hour. Different rows can peak at different hours — that's the point of the chart.`,

  zone_wait_compare: STUB("zone_wait_compare"),
  // ^ STUB: orchestrator gates on isImplementedArchetype() so this prompt
  //   never reaches Gemini. When this archetype lands, mirror the SOURCING
  //   note from compare_zones / slot_compare — wait minutes per zone MUST
  //   be grounded in operator queue logs or live wait-time aggregators,
  //   not estimated from feel.
  daily_programme: `{ "type": "daily_programme",
  "open_time": "HH:MM" 24h, "close_time": "HH:MM" 24h,
  "events": [ { "name": "...", "start_time": "HH:MM", "duration_min": <int 1-720>, "location": "...", "popularity": <0-100 int>, "icon"?: "<feeding|show|talk|prayer|tour|ceremony|encounter|demo>", "note"?: "..." }, ... 3-10 items, all events MUST fall inside open_time..close_time ],
  "highlight_event"?: "<exact event name to spotlight>" }
Use for fixed daily events (zoo feedings, aquarium shows, basilica masses). Example (San Diego Zoo): open_time "09:00", close_time "18:00", events include "Penguin feeding" 10:30 / "Koala talk" 11:30 / "Elephant care" 14:00 / "Lion encounter" 15:30. Pick popularity from how often the event sells out or fills standing room (90+ = lines form 30 min early).`,

  time_split: `{ "type": "time_split",
  "total_min": <int 15-2880>, "total_label"?: "3.5-hour tour",
  "segments": [ { "label": "...", "minutes": <int 1-2880>, "accent": "<purps|candy|hola|okay|slate>", "note"?: "..." }, ... 3-6 items, minutes MUST sum to within 5% of total_min ],
  "callout"?: "one-sentence headline insight" }
Use for tour duration breakdown (transit / queue / at-site / breaks for guided tours; transit / destination / return for day trips; per-stop time for food tours). Example (Vatican guided tour, total_min 180): "Skip-the-line entry" 15m okay, "Sistine Chapel" 45m candy, "St. Peter's Basilica" 50m purps, "Vatican Museums galleries" 55m hola, "Group transit + briefing" 15m slate. Reserve "candy" for the headline highlight segment.`,

  history_timeline: `{ "type": "history_timeline",
  "span_label": "<overall range, e.g. AD 72-2026>",
  "events": [ { "date_label": "<year or compact date, e.g. AD 80>", "sort_year": <number, BCE negative if needed>, "title": "<very short event title, <=30 chars — must fit a single column at 9 events in horizontal layout>", "era": "<origins|construction|spectacle|decline|reuse|restoration|modern>", "description": "<one sentence, <=140 chars>", "metric_value"?: "<short numeric fact, e.g. '100 days', '~65,000', '14.7M'>", "metric_label"?: "<unit/context for metric_value, e.g. 'of games', 'seats', 'visitors / yr'>" }, ... 7-9 items ],
  "highlight_event"?: "<exact event title to spotlight as the single most pivotal moment>",
  "callout"?: "<one-sentence visitor-facing takeaway, <=160 chars>" }
The renderer is an INFOGRAPHIC: every event is shown at a glance with date, era, title, one-sentence description, and (where useful) a punchy metric chip. Write for that — descriptions short, metrics short and numeric.
Use ONLY for historical narrative questions: origin story, construction, major disasters, reuse, restoration, cultural symbolism. Every event MUST come directly from the DRD or grounded source, in chronological order.
Era guidance — span the full arc the DRD documents, do not cluster all events in one era:
  * origins: pre-construction backstory (site, motivation, planning).
  * construction: build, expansion, major engineering additions.
  * spectacle: the venue's active prime — opening, peak use, signature events.
  * decline: damage, disuse, end of original purpose.
  * reuse: medieval / post-prime repurposing (fortress, quarry, housing).
  * restoration: papal / state / private rescue and conservation work.
  * modern: 19th-century onward state ownership, current significance, recent figures.
Aim for 7–9 events covering 4+ eras, NOT 5 events all in "construction". Include at least one modern/current event (visitor numbers, UNESCO listing, recent restoration) when the DRD has it. Use highlight_event for the single most iconic / pivotal moment (e.g. inaugural games). Do not turn history topics into crowd, booking, or weekly charts.`,

  slot_compare: `{ "type": "slot_compare",
  "slots": [ { "name": "Sunrise", "time_window"?: "5:00–7:30 am", "accent": "<purps|candy|hola|okay|slate>", "recommended": <bool> }, ... 2-3 items, AT MOST one recommended:true ],
  "dimensions": [ { "label": "...", "scores": [<one 0-100 int per slot, in slot order>] }, ... 3-5 items ],
  "insight"?: "one-sentence pick rationale" }
Use for head-to-head comparison of named time slots. Example (Dubai desert safari): slots ["Sunrise","Midday","Sunset"], dimensions [{"label":"Light quality","scores":[95,40,90]},{"label":"Temperature comfort","scores":[80,20,70]},{"label":"Wildlife activity","scores":[85,15,60]},{"label":"Crowd levels","scores":[70,45,30]}]. Score 100 = best; per dimension across slots, scores SHOULD show meaningful spread (avoid all 80s).`,

  sighting_probability: `{ "type": "sighting_probability",
  "display": "<single|grouped|stacked>",
  "series": [ { "name": "Humpback", "accent"?: "<purps|candy|hola|okay|slate>", "monthly": [<12 numbers 0-100, jan..dec>] }, ... 1-4 series ],
  "confidence_note"?: "Based on operator logs 2019-2024",
  "best_months": ["Jul", "Aug"], "worst_months": ["Feb"] }
monthly[] is ALWAYS 12 numbers in jan..dec order (probability % of trips with a confirmed sighting). Use display:"single" when only one species is meaningful; "grouped" for side-by-side species comparison; "stacked" only when total cumulative probability across species is itself a useful read.
SOURCING: Every probability number MUST come from a real source you actually grounded with googleSearch (operator logs, marine biology study, NGO sighting database). Do not estimate from "feel" or generic seasonality. Drop the chart entirely if no operator-level data is grounded — return a higher confidence_note when sourcing is thin.`,

  departure_reliability: `{ "type": "departure_reliability",
  "months": [ { "month": "<jan..dec>", "pct_ran": <0-100 number>, "cancellation_reasons"?: [ { "reason": "Wind", "share": <0-100> }, ... up to 4 ], "note"?: "..." }, ... 12 items ],
  "target_pct"?: <0-100 number, e.g. 90 if the operator publishes a target>,
  "best_months": ["Jun", "Jul"], "worst_months": ["Jan", "Feb"] }
months[] is ALWAYS 12 entries jan..dec. pct_ran is the % of scheduled departures that actually flew/sailed. Only include cancellation_reasons when the DRD or live sources actually break it down — never fabricate.
SOURCING: pct_ran MUST come from a sourced operator/regulator stat (FAA part 91 logs, ATO bulletins, operator reliability page, news reporting, etc.) — not a guess. Each cancellation_reasons entry MUST be defensible from a real reference. Cite every source you used in the response so it lands in groundingMetadata.`,

  conditions_calendar: STUB("conditions_calendar"),
  // ^ STUB (Task #67): superseded by season_weather_fit. Schema + renderer
  //   retained for historical/curated charts; orchestrator no longer asks
  //   Gemini for new conditions_calendar specs (the prompt previously here
  //   demanded operator-grade snow/swell/visibility data which proved too
  //   thin to ground for most CEs — use season_weather_fit instead).
  golden_hour_match: `{ "type": "golden_hour_match",
  "location_label": "Santorini caldera",
  "slots": [ { "label": "Sunrise" }, { "label": "Midday" }, { "label": "Sunset" }, ... 1-6 named departure slots ],
  "months": [ { "month": "<jan..dec>", "cells": [ { "aligned": <bool>, "sub_rating"?: <0-100 int> }, ... EXACTLY one entry per slot ] }, ... 12 items, jan..dec each appearing once ],
  "helper"?: "Aligned cells fall within ±30 min of golden hour at the headline location." }
For each month × slot, set aligned:true when that slot lands inside the location's golden hour at that time of year. Use sub_rating to grade quality (e.g. 90 = perfect golden light, 60 = soft but harsher). cells[] length MUST equal slots[] length.`,

  savings_breakdown: `{ "type": "savings_breakdown",
  "currency": "EUR" or "USD" or local currency,
  "card_price": <number — total price of the city card / combo>,
  "card_label": "Paris Pass 3-day" or similar short label,
  "attractions": [ { "name": "Louvre", "standalone_price": <number>, "usage_rate"?: <0-100 int — % of cardholders who actually use this attraction> }, ... 3-8 items ] }
Each attraction is one bar; standalone_price is the gate price. The renderer draws card_price as a threshold line, so attractions priced above it render in the value-add colour and below in muted. Real example: Paris Pass 3-day card_price 165 vs Louvre 22, Versailles 21, Arc de Triomphe 16, Sainte-Chapelle 13, etc.`,

  return_buffer_rank: `{ "type": "return_buffer_rank",
  "ship_departure_time": "17:00",
  "options": [ { "name": "Vatican half-day with skip-the-line", "buffer_minutes": <int — minutes between scheduled tour return and ship departure; positive = safe>, "notes"?: "Operator guarantees on-time return" }, ... 3-8 items ] }
Bands are coloured: <30 red, 30-60 amber, >60 green. Order DOES NOT matter — the renderer sorts. Real example: Civitavecchia port stop with Rome tours, ship departs 17:00; options range from "Rome highlights private" 25 min buffer (red) to "Civitavecchia walking" 240 min buffer (green).`,

  seat_value_map: `{ "type": "seat_value_map",
  "currency": "USD",
  "venue_label"?: "Minskoff Theatre",
  "layout": ["stalls", "circle", "upper_circle"] (order top-down on the seatmap; pick from stalls|circle|upper_circle|balcony|box|gallery; 1-4 tiers typical),
  "sections": [ { "name": "Stalls front", "tier": "stalls", "price": <number>, "sightline_score": <0-100 int — quality of view>, "value_score": <0-100 int — sightline relative to price; higher = better deal>, "note"?: "Closest to actors" }, ... 4-10 items ],
  "best_section"?: "Circle row C — front" (must match one sections[].name) }
Every section.tier MUST appear in layout. Real example: Lion King at the Minskoff — stalls premium $189 (sightline 95, value 60), stalls front $159 (95, 75), circle front $129 (88, 92 — sweet spot), upper-circle $69 (60, 78), etc.`,

  optimal_departure: `{ "type": "optimal_departure",
  "recommended_slot": "<id of one slot below>",
  "slots": [ { "id": "sunset", "name": "Sunset", "light_quality": <0-100>, "conditions": <0-100 — weather/visibility>, "crowd_level": <0-100 — LOWER is better; 100 = packed>, "note"?: "Best Manhattan skyline glow" }, ... 2-5 items ] }
slots[].id must be unique kebab-case (lowercase letters/digits separated by single hyphens, e.g. "golden-hour", "morning", "blue-hour"); recommended_slot must match one of those ids. Real example: Manhattan helicopter tour — morning (light 70, conditions 90, crowd 40), midday (light 60, conditions 85, crowd 80), golden-hour (light 95, conditions 80, crowd 65) → recommended_slot "golden-hour".`,

  price_curve: `{ "type": "price_curve",
  "currency": "EUR",
  "base_value": <reference price as a number, e.g. 1200 for a 7-day tour>,
  "base_label"?: "from €1,200",
  "points": [ { "month": "<jan..dec>", "index": <0-500, 100 = base_value>, "note"?: "Easter premium" }, ... 12 items ],
  "cheapest_months": ["Nov", "Feb"], "priciest_months": ["Jul", "Aug"] }
points[] is ALWAYS 12 entries jan..dec. Express price as an index relative to base_value (so index=120 means 20% above base, index=85 means 15% off base). Pick a base_value that's a real anchor — typically the published "from" price or the median.
SOURCING: base_value and every monthly index MUST come from a real, citable price source (operator pricing page, OTA listing snapshot, rail booking site, news article on seasonal pricing). Use googleSearch to confirm current pricing — never invent a curve from "typical" seasonality. Cite every source so they appear in groundingMetadata.`,

  stop_frequency: `{ "type": "stop_frequency",
  "route_label"?: "Big Bus London — Red Route",
  "stops": [ { "name": "Trafalgar Square", "peak_headway_min": <int — minutes between buses at peak>, "offpeak_headway_min": <int — minutes off-peak>, "note"?: "Adds Westminster shuttle" }, ... 4-20 items ] }
Order is the bus route order (first stop first). peak_headway_min ≤ offpeak_headway_min in almost every realistic case. Real example: Big Bus London Red Route — Trafalgar Square 8/15 min, St Paul's 10/18, Tower of London 12/22, Marble Arch 8/15, etc.`,
  route_profile: STUB("route_profile"),
  // ^ STUB (Task #67): superseded by landmark_coverage (HOHO / photography
  //   tours / sightseeing cruises) and itinerary_flow (walking tours /
  //   day trips / food tours / port-of-call). Schema + renderer retained for
  //   any historical curated route_profile rows; orchestrator no longer
  //   requests new ones.

  /* ---------------- Task #67 v3 promoted archetypes ---------------- */

  ticket_access_matrix: `{ "type": "ticket_access_matrix",
  "currency": "EUR",
  "tiers": [ { "name": "Basic", "price": <number>, "accent"?: "<purps|candy|hola|okay|slate>", "recommended"?: <bool>, "note"?: "..." }, ... 2-5 items, AT MOST one recommended:true ],
  "features": [ { "label": "Sistine Chapel access", "cells": [<one cell per tier, in tier order>], "note"?: "..." }, ... 3-8 items ],
  "insight"?: "<one-line takeaway, ≤200 chars>" }
Each cell is one of:
  { "state": "included" }                                  — fully unlocked
  { "state": "excluded" }                                  — not on this tier
  { "state": "extra", "extra_price"?: <number>, "label"?: "..." }   — paid add-on (e.g. "+€5", "buy on arrival")
  { "state": "limited", "label"?: "Off-peak only" }       — partial / time-bound / quota-capped access
features[].cells MUST have exactly one entry per tier (in tier order). Pick features the visitor cares about (named room/area access, skip-the-line, audio guide, group size cap, refundability) — NOT generic ticket plumbing. Reserve "extra" for genuinely paid add-ons (give extra_price when you can ground it) and "limited" for real restrictions ("guided slot only", "weekday only").
SOURCING: tier prices, per-cell states, and any extra_price MUST come from the operator's official ticket page or a current OTA snapshot grounded with googleSearch. If you can't ground a tier's price + at least its top-3 cells live, drop the tier rather than estimate. Cite every operator/OTA URL so it lands in groundingMetadata.`,

  duration_budget: `{ "type": "duration_budget",
  "total_min": <int 15-2880>, "total_label"?: "Half-day visit",
  "blocks": [ { "label": "...", "minutes": <int 1-2880>, "accent": "<purps|candy|hola|okay|slate>", "badge"?: "<skip_if_tight|extend_if_deep_dive>", "note"?: "..." }, ... 3-6 items, minutes MUST sum to within 5% of total_min ],
  "tip"?: "<one-line guidance, ≤200 chars>" }
Use for "how should I budget my time at this CE" questions. Each block names a sub-experience or activity bucket (e.g. for the Uffizi: "Botticelli rooms" 35m, "Caravaggio + Titian" 25m, "East corridor sculpture" 20m, "Ground-floor exhibition" 15m). Reserve "candy" for the headline highlight block; use "slate" for transit/queue overhead.
Mark AT MOST one block badge:"skip_if_tight" (the first thing to drop on a half-day) and AT MOST one badge:"extend_if_deep_dive" (the room/wing power-users always over-allocate to). Never put both badges on the same block. Skip the badge field entirely on the other blocks.
The total_min is what most visitors actually spend, not the operator's recommended max.
SOURCING: total_min and per-block minutes should come from the DRD (typical-visit narrative, suggested itineraries) or first-party operator guidance. The grounding bar is softer than booking_window / hourly_heatmap — visitor-pacing is inherently a guide-school estimate — but each block's minutes MUST still be defensible from a DRD snippet, an operator "plan your visit" page, or a recurring review theme. Tag any block whose minutes you estimated in provenance.estimates with the block label. Do NOT fabricate room-by-room timings the DRD doesn't support; collapse to fewer, broader blocks instead.`,

  landmark_coverage: `{ "type": "landmark_coverage",
  "route_label"?: "<short product family label, e.g. Big Bus loops>",
  "routes": [ { "name": "Red Loop", "accent"?: "<purps|candy|hola|okay|slate>", "recommended"?: <bool>, "note"?: "..." }, ... 2-4 items, AT MOST one recommended:true ],
  "landmarks": [ { "name": "Tower of London", "kind": "<icon|highlight|standard>", "coverage": [<one entry per route, in route order>], "note"?: "..." }, ... 3-12 items ],
  "best_for"?: ["first-timers", "families"], (up to 4 short tags)
  "callout"?: "<one-sentence route takeaway, ≤200 chars>" }
Each coverage entry is one of:
  "covered"   — the route stops at the landmark (or its dedicated pier)
  "near"      — the route stops within a 5-10 min walk
  "view_only" — the route passes by / the landmark is visible from board, no stop
  "none"      — not on this route
Use for HOHO loops, sightseeing cruise routes, photography tours where 2-4 operator routes need a side-by-side coverage comparison. landmarks[].kind:"icon" is reserved for one or two universally-recognised draws (Eiffel Tower / Tower of London / Colosseum), "highlight" for next-tier named landmarks, "standard" for the rest.
SOURCING: route names, landmark coverage, and stop list MUST come from each operator's published route map / brochure (grounded via googleSearch) or the DRD. If you can't ground at least 2 routes with 5+ landmarks each, drop the chart.`,

  itinerary_flow: `{ "type": "itinerary_flow",
  "mode": "<walk|bus|boat|mixed|day_trip>",
  "total_duration_min"?: <int 15-2880>,
  "stops": [ { "name": "...", "kind": "<start|stop|highlight|end>", "dwell_min"?: <int 0-720>, "note"?: "..." }, ... 3-12 items, in itinerary order; FIRST stop MUST be kind:"start" and LAST MUST be kind:"end" ],
  "transits": [ { "minutes": <int 0-360>, "mode"?: "<walk|bus|boat|mixed|transfer>", "note"?: "..." }, ... EXACTLY stops.length - 1 items — one per gap between consecutive stops, in order ],
  "callout"?: "<one-sentence itinerary takeaway, ≤200 chars>" }
Use for walking tours, food tours, day trips, port-of-call shore tours where the *rhythm* matters — alternating dwell vs transit. transits[i].minutes is the time between stops[i] and stops[i+1]. Reserve kind:"highlight" for the 1-2 stops the operator markets as centrepieces (lunch tasting, named viewpoint, headline ruin). dwell_min is per-stop time; only fill it when the DRD/operator itinerary states it (otherwise omit). transits[].minutes MUST always be present (use the operator's stated walking/driving time, or a defensible 5-10 min walk between adjacent old-town stops).
SOURCING: stops, order, dwell minutes, and transit minutes MUST come from the operator's own published itinerary or the DRD. Don't synthesise a generic walking-tour route from city knowledge. If the itinerary isn't grounded for this specific tour, drop the chart.`,

  best_for_matrix: `{ "type": "best_for_matrix",
  "facets": [ { "name": "Pace", "note"?: "...", "top_audience_index"?: <int — optional override; otherwise the renderer auto-marks the highest-scoring audience> }, ... 3-5 items ],
  "audiences": [ { "label": "First-timers", "accent": "<purps|candy|hola|okay|slate>", "scores": [<one int 0-100 per facet, in facet order>], "note"?: "..." }, ... 3-6 items ],
  "insight"?: "<one-line pick rationale, ≤200 chars>" }
Use for audience-fit comparisons across multiple traveller dimensions where slot_compare doesn't fit (slot_compare ranks 2-3 SLOTS — this ranks 3-6 AUDIENCES against 3-5 FACETS). Each audiences[].scores MUST have exactly one int per facet (0 = not for this audience, 100 = ideal). Pick facets the DRD actually surfaces (Pace, Headline payoff, Photography, Kid friendliness, Half-day fit, Walking demand); don't fabricate generic axes. Pick audiences with real differentiation — at least one facet should have a clear top audience.
SOURCING: scores are inherently editorial judgements; the grounding bar is softer than booking_window / hourly_heatmap. Each score should be defensible from DRD evidence (visitor types the operator markets to, review themes, family/accessibility notes, named facilities) or a grounded operator/OTA description — but you do NOT need a precise external number per cell. When you estimate a score with no direct citation, list it in provenance.estimates with the spec.audiences[i].scores[j] field path and a one-line reasoning. Do NOT invent audience archetypes the DRD doesn't surface; collapse to fewer rows instead.`,

  daily_pattern: `{ "type": "daily_pattern",
  "points": [ { "time": "HH:MM", "crowd": <0-10 number, 1-decimal ok> }, ... 8-30 items, evenly spaced across the open day, ordered ascending ],
  "zones": [ { "label": "...", "tone": "<best|peak|second_best>", "start": "HH:MM", "end": "HH:MM" }, ... 1-4 items, must lie within the points[] time range ],
  "caption"?: { "opens"?: "08:00", "last_entry"?: "21:30" } }
Use for a single representative open-day crowd / boarding-pressure curve (cruise piers, single-venue queue intensity by hour) when day-of-week variation is NOT independently grounded. Prefer hourly_heatmap when both day AND hour signals are grounded. crowd is a 0-10 intensity (NOT 0-100). Aim for one "best" zone (visible trough), one "peak" zone, optional "second_best" later in the day. Times use 24h HH:MM.
SOURCING: hour-by-hour intensities MUST be defensible from a real signal — Google "Popular Times" snapshots, operator boarding dashboards, queue-time aggregators, or DRD-quoted observations from named hours. If neither the DRD nor googleSearch surfaces hour-level data for THIS CE, prefer SHAPE-only intensities using round numbers in 0.5 buckets, mark every point in provenance.estimates with the field path "spec.points[i].crowd", and lower confidence in the insight ("typically quietest mid-morning — exact peak hour varies"). Never fabricate a precise per-hour curve from "feel"; collapse to fewer broader points instead.`,

  season_weather_fit: `{ "type": "season_weather_fit",
  "activity_label": "<short noun phrase, e.g. Outdoor walking tours>",
  "dimensions": [ { "name": "Temperature", "note"?: "..." }, { "name": "Rainfall" }, { "name": "Operator availability" }, ... 3-5 items ],
  "months": [ { "month": "<jan..dec>", "cells": [{ "score": <int 0-100>, "status": "<closed|poor|fair|good|optimal>" }, ... one per dimension in dimension order], "overall_status"?: "<closed|poor|fair|good|optimal>", "temp_label"?: "<e.g. 22°C>", "note"?: "..." }, ... 12 items, jan..dec each appearing exactly once ],
  "best_months": ["May", "Sep"], "worst_months": ["Jan"], (up to 6 each, short month labels)
  "helper"?: "<one-line guidance, ≤200 chars>" }
Use for "when is this CE in the right weather window" — outdoor activities, hop-on-hop-off, walking tours, hiking, cable cars, wineries (harvest), water sports. Each cell pairs a 0-100 score with a discrete status so the heatmap shows *why* a month is poor (closed lifts vs heavy rain). Pick 3-5 dimensions that genuinely vary by month for THIS activity (e.g. for skiing: Snow depth, Lift availability, Visibility; for wineries: Harvest activity, Crowd, Daytime temp). status:"closed" reserved for months where the operator/window is shut. overall_status is an optional roll-up; the renderer falls back to the worst-status cell if absent.
SOURCING: scores should be defensible from grounded sources — NOAA / city tourism board climate normals, operator seasonal calendars, OpenWeatherMap monthly averages, news articles on shoulder-season conditions. Use round inputs (average high temp, rainfall days, daylight hours) rather than precise instrument data; tag every dimension you estimated in provenance.estimates with the cell's path. If you can't ground city-level seasonality for this activity, drop the chart.`,

  entrance_map: `{ "type": "entrance_map",
  "venue_label"?: "<short label, e.g. Colosseum>",
  "entrances": [ { "name": "Sperone Valadier", "status": "<recommended|avoid|groups|accessible|closed|standard>", "wait_label"?: "<e.g. 15-25 min>", "best_for"?: ["skip-the-line tickets","families"], "accent"?: "<purps|candy|hola|okay|slate>", "note"?: "..." }, ... 2-6 items ],
  "callout"?: "<one-sentence takeaway, ≤200 chars>" }
Use for venues with multiple named gates / entrances where the visitor's decision is "which door?". Each entrance MUST be a real, named gate (no generic "main entrance" placeholders). status:"recommended" reserved for the gate that materially saves time for the most common ticket type; status:"avoid" for tour-group choke points; status:"groups" for group-only lanes; status:"accessible" for the step-free / wheelchair entrance; status:"closed" for permanently shut entrances still on old maps. best_for tags are short (≤40 chars). wait_label is a coarse range, not a precise number.
SOURCING: entrance names, status, and wait windows MUST be grounded from the operator's official site, an official venue map, or recent (≤24 month) visitor reports. Generic "use the side entrance" advice without a named gate is not enough. If you can't ground at least 2 named entrances with distinct status, drop the chart. Tag any wait_label you estimated in provenance.estimates with spec.entrances[i].wait_label.`,

  floor_plan_flow: `{ "type": "floor_plan_flow",
  "start_label"?: "<short start label, e.g. Ground floor entrance>",
  "total_min"?: <int 15-720 — total recommended dwell, only when supported>,
  "stops": [ { "name": "Sistine Chapel", "level"?: "<e.g. Level 2>", "kind": "<start|highlight|stop|end>", "dwell_min"?: <int 0-360>, "accent"?: "<purps|candy|hola|okay|slate>", "note"?: "..." }, ... 3-10 items, in walking order; FIRST MUST be kind:"start" and LAST MUST be kind:"end" ],
  "callout"?: "<one-sentence flow takeaway, ≤200 chars>" }
Use INSIDE a single venue (museums, multi-floor monuments, religious sites, observation decks, large aquariums) to suggest a recommended order through the rooms / floors / wings. Distinct from itinerary_flow (city-scale tour rhythm) and daily_programme (timed events). Reserve kind:"highlight" for the 1-2 must-see stops the operator markets as centrepieces (David hall, Sistine Chapel, top viewing deck). dwell_min is per-stop time the operator/DRD states; omit when you can't ground it.
SOURCING: stop names, level labels, order, and dwell minutes MUST come from the operator's published "plan your visit" map, an official audio-guide route, or DRD-grounded visitor guidance. Don't synthesise a route from photos alone. If the venue is one big single hall with no meaningful sub-stops, drop the chart. Tag any dwell_min you estimated in provenance.estimates with spec.stops[i].dwell_min.`,

  rules_checklist: `{ "type": "rules_checklist",
  "headline"?: "<short header, ≤80 chars>",
  "items": [ { "label": "Shorts above the knee", "severity": "<allowed|restricted|prohibited|required>", "category": "<items|dress|behavior|security|photography|food|other>", "note"?: "..." }, ... 4-12 items ],
  "source_note"?: "<one-line citation, e.g. From Vatican Museums official visitor regulations">" }
Use for venues with non-obvious rules that materially affect a visit (religious-site dress codes, museum bag restrictions, theme-park height/security rules, photography bans, no-food policies). severity:"required" for things visitors MUST do (covered shoulders at religious sites, valid ID, mandatory bag check); "prohibited" for hard bans (large bags, tripods, food); "restricted" for items only allowed in certain conditions (small bags below 40×35 cm, flash off photography); "allowed" reserved for surprising allowances visitors usually assume are banned. Pick a category per item so the renderer can group them visually. Each label ≤80 chars, sentence case, no markdown.
SOURCING: rules MUST come from the venue's OFFICIAL visitor regulations / security policy / dress code page (grounded via googleSearch) — never from secondhand blog summaries. If the official page is unreachable or too generic, drop the chart. Always fill source_note with a one-line credit pointing back to the official source. Do NOT invent fines, sizes, or thresholds; quote the official numbers verbatim where possible.`,

  transit_options: `{ "type": "transit_options",
  "origin_label"?: "<e.g. Rome city centre>",
  "destination_label"?: "<e.g. Colosseo metro station>",
  "options": [ { "mode": "<metro|bus|tram|train|walk|taxi|car|ferry|shuttle>", "label": "Line B from Termini", "minutes_min": <int 0-720>, "minutes_max": <int 0-720>, "cost_label"?: "€1.50 single", "frequency_label"?: "Every 4-7 min", "walk_min"?: <int 0-60 — final-leg walking minutes from stop to venue entrance>, "accent"?: "<purps|candy|hola|okay|slate>", "recommended"?: <bool>, "note"?: "..." }, ... 2-6 items ],
  "callout"?: "<one-sentence pick rationale, ≤200 chars>" }
Use for venues where getting there is a real visitor decision (out-of-centre attractions, complex transit hubs, theme parks, airport transfers). minutes_min MUST be ≤ minutes_max (the renderer shows the range). AT MOST one option may be recommended:true — reserve it for the option that's materially fastest or cheapest for the typical visitor. walk_min is the final on-foot leg from the dropoff to the venue gate (often the deciding factor between modes). Cover meaningfully different modes — don't list three bus variants.
SOURCING: route names, time ranges, costs, and frequency MUST be grounded from the city's official transit authority page, the venue's "how to get here" page, or Google Maps directions for the named origin/destination. If you can't ground at least 2 distinct modes, drop the chart. Tag any minutes/cost/frequency you estimated in provenance.estimates with the field path; use coarse ranges rather than precise single numbers.`,

  time_value_matrix: `{ "type": "time_value_matrix",
  "currency"?: "EUR",
  "scenarios": [ { "id": "half_day_basic", "label": "Half-day basic", "accent": "<purps|candy|hola|okay|slate>", "time_label"?: "~3 hrs", "price_label"?: "€22", "note"?: "..." }, ... 2-5 items, ids unique kebab/snake_case ≤40 chars ],
  "dimensions": [ { "label": "Headline coverage", "scores": [<one int 0-100 per scenario, in scenario order>], "note"?: "..." }, ... 3-6 items ],
  "summary": { "best_value_scenario": "<one of scenarios[].id>", "headline"?: "<one-line pick rationale, ≤160 chars>" },
  "insight"?: "<one-line takeaway, ≤200 chars>" }
Use when the visitor's decision is "which combination of time budget AND ticket tier gives the best payoff" — e.g. half-day basic vs full-day skip-the-line vs two-day pass. Distinct from ticket_access_matrix (tier × feature inclusion) and slot_compare (slot timing). Each scenario combines a time budget AND a ticket/access choice. Each dimensions[].scores MUST have exactly one int per scenario (0 = poor fit, 100 = ideal). summary.best_value_scenario MUST equal one scenarios[].id — schema validation will fail otherwise.
SOURCING: time_label and price_label MUST be grounded from operator pricing / typical-visit narratives. Scores are inherently editorial — they should be defensible from DRD evidence (typical visit-duration, ticket inclusions, named-payoff descriptions) or grounded operator copy. Tag every score you estimated in provenance.estimates with spec.dimensions[i].scores[j]. Don't invent price points; quote the operator's published price or drop the price_label.`,

  accessibility_guide: `{ "type": "accessibility_guide",
  "headline"?: "<short header, ≤80 chars>",
  "features": [ { "label": "Step-free access to main galleries", "category": "<mobility|sensory|cognitive|services|facilities>", "availability": "<full|partial|none|on_request>", "detail"?: "..." }, ... 4-12 items ],
  "contact"?: "<one-line booking/contact note, ≤160 chars>",
  "callout"?: "<one-sentence summary, ≤200 chars>" }
Use on the Plan-Your-Visit page for any CE with non-trivial accessibility nuance. Cover all categories the venue meaningfully addresses: mobility (wheelchairs, elevators, ramps), sensory (audio guides, captioning, induction loops, sensory bags), cognitive (relaxed visits, social stories), services (companion tickets, staff assistance), facilities (accessible toilets, parking). availability:"full" reserved for unrestricted access; "partial" when there's a workaround or limitation (e.g. lift to floor 2 but not floor 3); "none" for explicitly unavailable; "on_request" for services that need pre-booking. detail captures the workaround / pre-booking instruction in one line.
SOURCING: every feature MUST be grounded from the venue's OFFICIAL accessibility page or first-party visitor-services page. Accessibility claims are high-stakes — never extrapolate from a generic museum, never assume availability. If the official accessibility info isn't grounded for this specific CE, DROP the chart. Always include a contact line when the venue lists a dedicated accessibility phone/email. Tag any feature whose availability you inferred (rather than directly cited) in provenance.estimates.`,
};
