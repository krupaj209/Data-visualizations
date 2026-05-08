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
hours[] is ALWAYS 24 numbers. Set 0 outside opening hours; closed days get closed:true and all-zero hours.`,

  month_calendar: `{ "type": "month_calendar",
  "start_date": "YYYY-MM-DD",
  "days": [ { "date": "YYYY-MM-DD", "score": <0-100 int>, "status": "<closed|very_quiet|quiet|moderate|busy|peak>", "label"?: "..." }, ... 60-90 consecutive days from start_date ],
  "recommended_dates": [ { "date": "YYYY-MM-DD", "reason": "..." }, ... 3-5 items, all dates must appear in days[] ] }`,

  booking_window: `{ "type": "booking_window",
  "curve": [ { "days_before": <int 0-180>, "share": <0-100 number> }, ... 8-14 items, days_before unique, span ~0..120 ],
  "sweet_spot": { "days_before_min": <int>, "days_before_max": <int>, "label": "..." },
  "sold_out_risk"?: { "threshold_days": <int>, "message": "..." } }
Sum of share roughly 100. days_before_min ≤ days_before_max.`,

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
Optional fields (weather_score, price_score, calendar_notes, metric_insights) only when DRD or live sources support them.`,

  ticket_ladder: `{ "type": "ticket_ladder",
  "currency": "EUR",
  "tiers": [ { "name": "...", "price": <int>, "includes": ["..."], "recommended": <bool>, "share"?: <0-100 int>, "wait_savings_min"?: <int> }, ... 2-5 items ] }
Exactly one tier must have recommended:true.`,

  /* ---------------- reserved (stubs) ---------------- */
  queue_compare: STUB("queue_compare"),
  duration_stat: STUB("duration_stat"),
  ride_wait_curve: STUB("ride_wait_curve"),
  opening_hour_rank: STUB("opening_hour_rank"),
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
  daily_programme: STUB("daily_programme"),
  time_split: STUB("time_split"),
  slot_compare: STUB("slot_compare"),
  sighting_probability: `{ "type": "sighting_probability",
  "display": "<single|grouped|stacked>",
  "series": [ { "name": "Humpback", "accent"?: "<purps|candy|hola|okay|slate>", "monthly": [<12 numbers 0-100, jan..dec>] }, ... 1-4 series ],
  "confidence_note"?: "Based on operator logs 2019-2024",
  "best_months": ["Jul", "Aug"], "worst_months": ["Feb"] }
monthly[] is ALWAYS 12 numbers in jan..dec order (probability % of trips with a confirmed sighting). Use display:"single" when only one species is meaningful; "grouped" for side-by-side species comparison; "stacked" only when total cumulative probability across species is itself a useful read.
SOURCING: Every probability number MUST come from a real source you actually grounded with googleSearch (operator logs, marine biology study, NGO sighting database). Do not estimate from "feel" or generic seasonality. Drop the chart entirely if no operator-level data is grounded — return a higher confidence_note when sourcing is thin.`,

  activity_window: STUB("activity_window"),
  departure_reliability: `{ "type": "departure_reliability",
  "months": [ { "month": "<jan..dec>", "pct_ran": <0-100 number>, "cancellation_reasons"?: [ { "reason": "Wind", "share": <0-100> }, ... up to 4 ], "note"?: "..." }, ... 12 items ],
  "target_pct"?: <0-100 number, e.g. 90 if the operator publishes a target>,
  "best_months": ["Jun", "Jul"], "worst_months": ["Jan", "Feb"] }
months[] is ALWAYS 12 entries jan..dec. pct_ran is the % of scheduled departures that actually flew/sailed. Only include cancellation_reasons when the DRD or live sources actually break it down — never fabricate.
SOURCING: pct_ran MUST come from a sourced operator/regulator stat (FAA part 91 logs, ATO bulletins, operator reliability page, news reporting, etc.) — not a guess. Each cancellation_reasons entry MUST be defensible from a real reference. Cite every source you used in the response so it lands in groundingMetadata.`,

  conditions_calendar: `{ "type": "conditions_calendar",
  "metric": "<snow_depth_cm|visibility_m|swell_m|river_flow_index|harvest_intensity|temperature_c>",
  "unit_label": "cm" | "m" | "°C" | "idx",
  "metric_label": "Average snow depth at mid-mountain",
  "months": [ { "month": "<jan..dec>", "value": <number>, "status": "<closed|poor|fair|good|optimal|expert>", "note"?: "...", "icons"?: ["🐢"] }, ... 12 items ],
  "reference_bands"?: [ { "label": "Optimal 30-60cm", "min": 30, "max": 60, "tone": "<poor|fair|good|optimal|expert>" }, ... up to 5 ],
  "best_months": ["Feb", "Mar"], "worst_months": ["Jul"] }
months[] is ALWAYS 12 in jan..dec order. status uses the operator's framing — e.g. ski resorts use closed/poor/fair/good/optimal; dive sites use poor/fair/good/optimal/expert. value uses whatever unit_label says.
SOURCING: Every monthly value MUST be grounded in a real measurement source (resort historical snow report, NOAA buoy records, USGS river gauge, DAN dive log, vineyard harvest notes). Use googleSearch to pull current data and cite every source. reference_bands should reflect industry-standard thresholds (e.g. "Beginner-friendly 20-40cm") that you can also point to a source for.`,

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
};
