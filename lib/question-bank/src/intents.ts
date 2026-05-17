/**
 * Visitor Intents — the 7 high-level decisions a visitor is trying to make
 * while researching a Headout CE. Bundles attach to one intent; page
 * templates pull bundle slots by intent affinity.
 */

export type VisitorIntentId =
  | "decide_when_to_visit"
  | "decide_how_long"
  | "pick_between_options"
  | "avoid_problems"
  | "navigate_arrival"
  | "judge_value"
  | "prepare_to_go";

export interface VisitorIntent {
  id: VisitorIntentId;
  label: string;
  /** Short prose explaining the visitor's mental state. */
  visitor_state: string;
  /** Tone hint for editorial copy on charts in this intent. */
  tone: string;
}

export const VISITOR_INTENTS: Record<VisitorIntentId, VisitorIntent> = {
  decide_when_to_visit: {
    id: "decide_when_to_visit",
    label: "Decide when to visit",
    visitor_state:
      "researching the day/time/season that balances crowds, weather, and access",
    tone: "confident, specific (name the day/window)",
  },
  decide_how_long: {
    id: "decide_how_long",
    label: "Decide how long to spend",
    visitor_state:
      "blocking out a calendar slot, deciding whether to half-day or full-day this",
    tone: "practical, time-budget framing",
  },
  pick_between_options: {
    id: "pick_between_options",
    label: "Pick between options",
    visitor_state:
      "comparing tickets, tiers, routes, slots, or sub-products to choose one",
    tone: "decisive, head-to-head framing",
  },
  avoid_problems: {
    id: "avoid_problems",
    label: "Avoid problems",
    visitor_state:
      "worried about sellouts, weather no-shows, queue pain, missed sightings",
    tone: "reassuring, risk-framed",
  },
  navigate_arrival: {
    id: "navigate_arrival",
    label: "Navigate arrival",
    visitor_state:
      "figuring out how to get there, which entrance, where to start once inside",
    tone: "directional, step-by-step",
  },
  judge_value: {
    id: "judge_value",
    label: "Judge value",
    visitor_state:
      "deciding whether the price is worth it vs alternatives, looking for savings",
    tone: "transparent, math-grounded",
  },
  prepare_to_go: {
    id: "prepare_to_go",
    label: "Prepare to go",
    visitor_state:
      "packing list, dress code, security rules, accessibility lookups",
    tone: "checklist, no surprises",
  },
};

export const VISITOR_INTENT_IDS = Object.keys(VISITOR_INTENTS) as VisitorIntentId[];
