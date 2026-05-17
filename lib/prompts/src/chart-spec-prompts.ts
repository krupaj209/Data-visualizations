/**
 * Chart Spec Generation Prompts
 *
 * Per-chart-type prompts that guide Gemini to generate valid,
 * complete chart specifications with real data from the DRD.
 */

// ─────────────────────────────────────────────────────────────
// ENTRANCE MAP
// ─────────────────────────────────────────────────────────────

export const ENTRANCE_MAP_PROMPT = `Generate an entrance_map chart spec for {ceName}.

## Requirements

1. **Entrances**: List ALL public entrances. For each:
   - Name and short name (for map labels)
   - Relative coordinates (x: 0-100, y: 0-100) — place them logically on a simple map
   - Status: open, closed, limited_access, or members_only
   - Typical wait time in minutes
   - Accessibility: wheelchair, ramp, elevator, step-free
   - Best for: which visitor types (first_timers, families, seniors, etc.)
   - Transit: at least 2 ways to reach this entrance (mode, from, duration, cost)
   - Security level and any special rules
   - One insider tip per entrance

2. **Landmarks**: Add 3-5 nearby landmarks for orientation (Duomo, train station, etc.)

3. **Recommended entrance**: Pick the best entrance for first-time visitors and highlight it

4. **Map layout**: Use relative coordinates. Main entrance centered or at bottom. Others arranged realistically.

## Output
Return ONLY a JSON object matching the EntranceMapSpec schema.

{
  "type": "entrance_map",
  "map": { "coordinateSystem": "relative" },
  "entrances": [],
  "landmarks": [],
  "recommendedEntranceId": "string",
  "headline": "string",
  "subheadline": "string"
}`;

// ─────────────────────────────────────────────────────────────
// FLOOR PLAN FLOW
// ─────────────────────────────────────────────────────────────

export const FLOOR_PLAN_FLOW_PROMPT = `Generate a floor_plan_flow chart spec for {ceName}.

## Requirements

1. **Rooms/Zones**: List all visitor-accessible rooms with name, short name,
   relative coordinates (x, y, width, height), crowd level, must-see rating,
   highlights, recommended duration, accessibility, and connections.

2. **Routes**: 2-4 suggested routes (Essentials, Complete Tour, Family-Friendly,
   Art Lover's Deep Dive) with ordered room IDs.

3. **Default route**: "The Essentials" for first-timers.

## Output
Return ONLY a JSON object matching the FloorPlanFlowSpec schema.

{
  "type": "floor_plan_flow",
  "floorPlan": { "useCoordinateRooms": true },
  "rooms": [],
  "routes": [],
  "defaultRouteIndex": 0,
  "headline": "string",
  "subheadline": "string"
}`;

// ─────────────────────────────────────────────────────────────
// RULES CHECKLIST
// ─────────────────────────────────────────────────────────────

export const RULES_CHECKLIST_PROMPT = `Generate a rules_checklist chart spec for {ceName}.

## Requirements

1. **Categories**: 3-5 categories (Security & Bags, Dress Code, Photography,
   Food & Drink, Behavior).

2. **Rules per category**: 3-8 rules with severity (must/should/tip/prohibited),
   status (allowed/restricted/prohibited/required), icon, alternative when
   restricted, and the common mistake visitors make.

3. **Time-sensitive notes**: Any seasonal or recent changes.

4. **Pre-visit checklist**: 5-7 items visitors should verify before arriving.

## Output
Return ONLY a JSON object matching the RulesChecklistSpec schema.

{
  "type": "rules_checklist",
  "venueName": "string",
  "venueType": "museum|church|monument|gallery",
  "categories": [],
  "headline": "string",
  "subheadline": "string"
}`;

// ─────────────────────────────────────────────────────────────
// TRANSIT OPTIONS
// ─────────────────────────────────────────────────────────────

export const TRANSIT_OPTIONS_PROMPT = `Generate a transit_options chart spec for {ceName}.

## Requirements

1. **From location**: city center.
2. **Transport options**: walk, bus, tram/metro, taxi/rideshare, bike/scooter.
3. **For each option**: full route with segments, duration, cost, effort score
   (1-10), crowd comfort, best for, real-time status, booking requirements.
4. **Recommended option**: best balance of time/cost/comfort for first-time
   visitors.
5. **Walking route detail**: turn-by-turn with landmarks if walking is an option.

## Output
Return ONLY a JSON object matching the TransitOptionsSpec schema.

{
  "type": "transit_options",
  "fromLocation": { "name": "string" },
  "toVenue": { "name": "string", "mainEntrance": "string" },
  "options": [],
  "recommendedOptionId": "string",
  "headline": "string",
  "subheadline": "string"
}`;

// ─────────────────────────────────────────────────────────────
// TIME VALUE MATRIX
// ─────────────────────────────────────────────────────────────

export const TIME_VALUE_MATRIX_PROMPT = `Generate a time_value_matrix chart spec for {ceName}.

## Requirements

1. **Comparison**: Standard ticket vs Skip-the-Line ticket — name, price,
   typical wait minutes for each.

2. **Scenarios**: 6-10 realistic scenarios spanning visitor types (solo,
   couple, family with kids, family with teens, seniors, group of friends,
   business traveler) and contexts (weekday morning, weekday afternoon,
   weekend morning, weekend afternoon, peak season, shoulder season).

3. **For each scenario**: standard wait, premium wait, time saved, extra
   cost, cost per minute saved, verdict (essential, strong_value,
   moderate_value, marginal, not_worth_it), rationale, and an alternative
   suggestion when verdict is not_worth_it.

4. **Summary stats**: average time saved, median extra cost, best/worst
   value scenarios.

## Output
Return ONLY a JSON object matching the TimeValueMatrixSpec schema.

{
  "type": "time_value_matrix",
  "comparison": {
    "standardTicket": { "name": "string", "price": 0, "typicalWaitMinutes": 0 },
    "premiumTicket": { "name": "string", "price": 0, "typicalWaitMinutes": 0 }
  },
  "scenarios": [],
  "summary": {},
  "headline": "string",
  "subheadline": "string"
}`;

// ─────────────────────────────────────────────────────────────
// ACCESSIBILITY GUIDE
// ─────────────────────────────────────────────────────────────

export const ACCESSIBILITY_GUIDE_PROMPT = `Generate an accessibility_guide chart spec for {ceName}.

## Requirements

1. **Venue overview**: overall accessibility score (1-5), facilities, policies.

2. **Entrance-by-entrance breakdown** for EACH entrance: accessibility score,
   step-free access details, number of steps if not step-free, ramp
   availability and steepness, elevators (capacity, assistance required), door
   widths, surface types, accessible restroom, seating, staff assistance,
   suitable mobility needs.

3. **Recommended accessible route**: best entrance + path for wheelchair users.

4. **Pre-visit contact**: phone, advance notice requirements, what to mention.

## Output
Return ONLY a JSON object matching the AccessibilityGuideSpec schema.

{
  "type": "accessibility_guide",
  "venueOverview": {},
  "entrances": [],
  "recommendedRoute": {},
  "preVisitInfo": {},
  "headline": "string",
  "subheadline": "string"
}`;

// ─────────────────────────────────────────────────────────────
// BEST FOR MATRIX
// ─────────────────────────────────────────────────────────────

export const BEST_FOR_MATRIX_PROMPT = `Generate a best_for_matrix chart spec for {ceName}.

## Requirements

1. **Decision type**: one of entrance, ticket, time, route.

2. **Options**: 3-5 options to compare. For each: name, short description,
   color, scores by visitor type (1-5), price, duration, wait time, top
   reason to choose, and dealbreakers.

3. **Visitor types**: 6-10 traveler personas with icons and descriptions.

4. **Recommendations**: pre-computed best option per visitor type with
   explanation and tip.

## Output
Return ONLY a JSON object matching the BestForMatrixSpec schema.

{
  "type": "best_for_matrix",
  "decisionType": "entrance|ticket|time|route",
  "options": [],
  "visitorTypes": [],
  "recommendations": {},
  "headline": "string",
  "subheadline": "string"
}`;

// ─────────────────────────────────────────────────────────────
// EDITORIAL OVERLAY
// ─────────────────────────────────────────────────────────────

export const EDITORIAL_OVERLAY_PROMPT = `Generate an editorial overlay for a {chartType} chart on a {pageType} page for {ceName}.

## Context

Chart data: {chartData}
CE data: {ceData}
Visitor context: {visitorContext}

## Requirements

1. **Headline**: Use the page-type variant. Make it specific and compelling.
2. **Subheadline**: Explain the data source and recency.
3. **CTA**: Contextual action — primary for booking, secondary for exploration, ghost for alternatives.
4. **Confidence badge**: Honest — high (>0.8 DRD), medium (0.5-0.8), low (<0.5, explain what's missing).
5. **Tip**: One genuine insider insight specific to this CE.
6. **Warning**: Only if genuinely needed (strict security, seasonal closure, recent changes).
7. **Personalization note**: If visitor context is provided.

## Tone Guidelines by Page Type

- plan-your-visit: Reassuring, practical, insider-smart
- skip-the-line: Confident, evidence-backed, urgency-tinged
- entrances: Precise, map-oriented, stress-reducing
- history: Narrative, reverent, surprising

## Output
Return ONLY a JSON object:

{
  "headline": "string",
  "subheadline": "string",
  "cta": { "text": "string", "variant": "primary|secondary|ghost" },
  "confidence": { "level": "high|medium|low", "explanation": "string" },
  "tip": { "text": "string" },
  "warning": { "text": "string", "severity": "info|warning|alert" },
  "personalizationNote": "string"
}`;

// ─────────────────────────────────────────────────────────────
// Prompt Router
// ─────────────────────────────────────────────────────────────

export const CHART_PROMPTS: Record<string, string> = {
  entrance_map: ENTRANCE_MAP_PROMPT,
  floor_plan_flow: FLOOR_PLAN_FLOW_PROMPT,
  rules_checklist: RULES_CHECKLIST_PROMPT,
  transit_options: TRANSIT_OPTIONS_PROMPT,
  time_value_matrix: TIME_VALUE_MATRIX_PROMPT,
  accessibility_guide: ACCESSIBILITY_GUIDE_PROMPT,
  best_for_matrix: BEST_FOR_MATRIX_PROMPT,
};

export function getChartPrompt(chartType: string): string | undefined {
  return CHART_PROMPTS[chartType];
}
