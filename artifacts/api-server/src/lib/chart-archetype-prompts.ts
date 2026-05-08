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
  sighting_probability: STUB("sighting_probability"),
  activity_window: STUB("activity_window"),
  departure_reliability: STUB("departure_reliability"),
  conditions_calendar: STUB("conditions_calendar"),
  golden_hour_match: `{ "type": "golden_hour_match",
  "location_label": "Santorini caldera",
  "slots": [ { "label": "Sunrise" }, { "label": "Midday" }, { "label": "Sunset" }, ... 1-6 named departure slots ],
  "months": [ { "month": "<jan..dec>", "cells": [ { "aligned": <bool>, "sub_rating"?: <0-100 int> }, ... EXACTLY one entry per slot ] }, ... 12 items, jan..dec each appearing once ],
  "helper"?: "Aligned cells fall within ±30 min of golden hour at the headline location." }
For each month × slot, set aligned:true when that slot lands inside the location's golden hour at that time of year. Use sub_rating to grade quality (e.g. 90 = perfect golden light, 60 = soft but harsher). cells[] length MUST equal slots[] length.`,
  savings_breakdown: STUB("savings_breakdown"),
  return_buffer_rank: STUB("return_buffer_rank"),
  seat_value_map: STUB("seat_value_map"),
  optimal_departure: STUB("optimal_departure"),
  price_curve: STUB("price_curve"),
  stop_frequency: STUB("stop_frequency"),
  route_profile: STUB("route_profile"),
};
