/**
 * Question Bundles — the 7 specialty-driven question groups that replace the
 * old flat STANDARD_QUESTIONS / per-subcategory RAW_BANK arrays.
 *
 * A bundle answers exactly ONE visitor intent and offers an ordered list of
 * candidate archetypes. The assembler picks the first implemented archetype
 * whose signal gates pass and that hasn't already been emitted in the deck.
 *
 * Bundles also carry a `question_template` string that the per-chart
 * generator uses verbatim (with {{ceName}} substitution).
 *
 * ## Subcategory-cluster ordering
 *
 * Within each bundle, cluster-specific candidates appear BEFORE generic ones.
 * They are gated with `requires` signals that `bootstrapSignalsFromSubcategory`
 * fires for the relevant cluster. This means:
 *   - Theme park DRDs / subcategory-bootstrapped signals surface ride charts first.
 *   - Museum DRDs surface gallery-zone charts first.
 *   - Tour DRDs surface itinerary charts first.
 *   - Generic signals fall through to the existing crowd / heatmap defaults.
 */

import type { ChartArchetypeId } from "./types";
import type { VisitorIntentId } from "./intents";
import type { ContextSignals } from "./signals";

export type BundleId =
  | "timing"
  | "duration"
  | "choice"
  | "risk"
  | "logistics"
  | "value"
  | "prep";

export interface BundleCandidate {
  archetype: ChartArchetypeId;
  /** Visitor-facing question. {{ceName}} placeholder is substituted at assembly. */
  question_template: string;
  /** Required signals for this archetype slot (ALL must be present). */
  requires?: (keyof ContextSignals)[];
  /** Preferred signals (each present adds +1 to score). */
  prefers?: (keyof ContextSignals)[];
  /** Reason note included in dropped[] if this candidate is filtered out. */
  drop_note?: string;
  /** Default "kind" recorded on the SelectedQuestion for back-compat. */
  kind?: "standard" | "signature";
}

export interface QuestionBundle {
  id: BundleId;
  intent: VisitorIntentId;
  label: string;
  /** One-line description shown in UI bundle chips. */
  description: string;
  /** ALL signals in this list must be present for the bundle to fire at all. */
  required_signals: (keyof ContextSignals)[];
  /** Each preferred signal present adds +1 to bundle_score. */
  preferred_signals: (keyof ContextSignals)[];
  /** Ordered candidates (first viable wins). */
  candidates: BundleCandidate[];
}

export const QUESTION_BUNDLES: Record<BundleId, QuestionBundle> = {
  timing: {
    id: "timing",
    intent: "decide_when_to_visit",
    label: "Timing",
    description: "Best day, hour, and season to visit",
    required_signals: [],
    preferred_signals: ["has_seasonal_variation", "has_long_queues", "has_timed_entry"],
    candidates: [
      // ---- Cluster: theme parks — ride-wait is the core timing question ----
      {
        archetype: "ride_wait_curve",
        question_template:
          "When is the wait shortest for the headline ride at {{ceName}}?",
        requires: ["has_ride_attractions"],
        kind: "signature",
      },
      // ---- Cluster: museums & galleries — gallery crowd by hour ----
      {
        archetype: "zone_crowd_heatmap",
        question_template:
          "When is each gallery at {{ceName}} at its quietest?",
        requires: ["has_named_gallery_zones"],
        kind: "signature",
      },
      // ---- Cluster: safari / whale watching — activity peaks ----
      {
        archetype: "activity_window",
        question_template:
          "What time of day is wildlife activity at its peak at {{ceName}}?",
        requires: ["has_wildlife_sighting"],
        kind: "signature",
      },
      // ---- Generic fallbacks ----
      {
        archetype: "hourly_heatmap",
        question_template:
          "What's the quietest hour of the day to visit {{ceName}}?",
        prefers: ["has_long_queues"],
        kind: "standard",
      },
      {
        archetype: "weekly_pattern",
        question_template:
          "Which day of the week has the lightest crowds at {{ceName}}?",
        kind: "standard",
      },
      {
        archetype: "daily_pattern",
        question_template:
          "How does crowd intensity change across a typical day at {{ceName}}?",
        kind: "standard",
      },
      {
        archetype: "seasonal_curve",
        question_template:
          "Which months are the best vs worst time to visit {{ceName}}?",
        requires: ["has_seasonal_variation"],
        kind: "standard",
      },
      {
        archetype: "month_calendar",
        question_template:
          "What does the year-round visitation pattern at {{ceName}} look like month by month?",
        requires: ["has_seasonal_variation"],
        kind: "standard",
      },
      // ---- Cluster: theme parks — opening-hour ride ranking (fallback if ride_wait_curve used) ----
      {
        archetype: "opening_hour_rank",
        question_template:
          "Which rides at {{ceName}} should I sprint to at rope drop?",
        requires: ["has_ride_attractions"],
        kind: "signature",
      },
      // ---- Cluster: theme parks — overall popularity rank (orthogonal to wait time) ----
      {
        archetype: "highlight_rank",
        question_template:
          "Which rides at {{ceName}} are the most popular overall?",
        requires: ["has_ride_attractions"],
        kind: "signature",
      },
    ],
  },

  duration: {
    id: "duration",
    intent: "decide_how_long",
    label: "Duration",
    description: "How much time to budget for the visit",
    required_signals: [],
    preferred_signals: ["has_guided_tours", "has_evening_program"],
    candidates: [
      // ---- Cluster: guided tours, walking tours, day trips — itinerary breakdown ----
      {
        archetype: "itinerary_flow",
        question_template:
          "What's the stop-by-stop rhythm of a {{ceName}} tour?",
        requires: ["has_fixed_itinerary"],
        kind: "signature",
      },
      // ---- Cluster: zoos, aquariums, religious sites with scheduled shows ----
      {
        archetype: "daily_programme",
        question_template:
          "What timed shows and events should I plan around at {{ceName}}?",
        requires: ["has_scheduled_shows"],
        kind: "signature",
      },
      // ---- Generic fallbacks ----
      {
        archetype: "duration_stat",
        question_template:
          "How long should I budget for {{ceName}} based on what I want to see?",
        kind: "standard",
      },
      {
        archetype: "duration_budget",
        question_template:
          "What does a full vs express visit timeline at {{ceName}} actually include?",
        kind: "signature",
      },
      {
        archetype: "time_split",
        question_template:
          "How is a typical visit to {{ceName}} split across the main activities?",
        kind: "signature",
      },
      {
        archetype: "daily_programme",
        question_template:
          "What's the timed programme of pinned events visitors should plan around at {{ceName}}?",
        requires: ["has_evening_program"],
        kind: "signature",
      },
    ],
  },

  choice: {
    id: "choice",
    intent: "pick_between_options",
    label: "Choice",
    description: "Head-to-head comparison of tickets, slots, or sub-products",
    required_signals: [],
    preferred_signals: ["has_multiple_sub_products", "has_skip_the_line"],
    candidates: [
      // ---- Cluster: hop-on-hop-off & multi-route cruises — which route covers what ----
      {
        archetype: "landmark_coverage",
        question_template:
          "Which {{ceName}} route covers the landmarks I actually want to see?",
        requires: ["has_multi_route_options"],
        kind: "signature",
      },
      // ---- Generic comparisons ----
      {
        archetype: "slot_compare",
        question_template:
          "Which {{ceName}} option fits my visit best — compared head to head?",
        requires: ["has_multiple_sub_products"],
        kind: "signature",
      },
      {
        archetype: "best_for_matrix",
        question_template:
          "Which {{ceName}} option is best for families, solo travelers, photographers, and couples?",
        requires: ["has_multiple_sub_products"],
        kind: "signature",
      },
      {
        archetype: "ticket_access_matrix",
        question_template:
          "What's actually included in each {{ceName}} ticket tier?",
        kind: "signature",
      },
      {
        archetype: "ticket_ladder",
        question_template:
          "What are the {{ceName}} ticket options at a glance?",
        kind: "signature",
      },
      {
        archetype: "compare_zones",
        question_template:
          "How do the different zones or areas of {{ceName}} compare on wait time?",
        requires: ["has_multiple_entrances"],
        kind: "signature",
      },
      {
        archetype: "route_profile",
        question_template:
          "What does the route profile of {{ceName}} cover stop by stop?",
        kind: "signature",
      },
    ],
  },

  risk: {
    id: "risk",
    intent: "avoid_problems",
    label: "Risk",
    description: "Sellouts, weather, sightings, queue pain",
    required_signals: [],
    preferred_signals: ["has_long_queues", "has_weather_sensitivity", "has_wildlife_sighting"],
    candidates: [
      {
        archetype: "booking_window",
        question_template:
          "How far ahead does {{ceName}} typically sell out, by month?",
        kind: "standard",
      },
      {
        archetype: "sighting_probability",
        question_template:
          "What's the realistic chance of a successful sighting at {{ceName}} by month?",
        requires: ["has_wildlife_sighting"],
        kind: "signature",
      },
      {
        archetype: "conditions_calendar",
        question_template:
          "Which months have the best conditions at {{ceName}} — and which to avoid?",
        requires: ["has_weather_sensitivity"],
        kind: "signature",
      },
      {
        archetype: "season_weather_fit",
        question_template:
          "Which season fits a {{ceName}} visit best for weather and crowds combined?",
        requires: ["has_seasonal_variation"],
        kind: "signature",
      },
      {
        archetype: "departure_reliability",
        question_template:
          "How reliable are scheduled departures at {{ceName}} across the year?",
        requires: ["has_weather_sensitivity"],
        kind: "signature",
      },
    ],
  },

  logistics: {
    id: "logistics",
    intent: "navigate_arrival",
    label: "Logistics",
    description: "Getting there, which entrance, where to start",
    required_signals: [],
    preferred_signals: ["has_multiple_entrances"],
    candidates: [
      // ---- Cluster: museums, zoos, landmarks — famous highlights worth prioritising ----
      {
        archetype: "highlight_rank",
        question_template:
          "Which highlights at {{ceName}} are the absolute must-sees?",
        requires: ["has_famous_highlights"],
        kind: "signature",
      },
      // ---- Cluster: skip-the-line products — which entrance has the fast lane ----
      {
        archetype: "entrance_lanes",
        question_template:
          "Which lane at {{ceName}} has the skip-the-line access — and how much faster is it?",
        requires: ["has_skip_the_line"],
        kind: "signature",
      },
      // ---- Cluster: museums & galleries — internal navigation ----
      {
        archetype: "floor_plan_flow",
        question_template:
          "What's the smartest room-by-room flow once inside {{ceName}}?",
        requires: ["has_named_gallery_zones"],
        kind: "signature",
      },
      // ---- Cluster: theme parks — zone-by-hour wait navigation ----
      {
        archetype: "zone_wait_heatmap",
        question_template:
          "Which {{ceName}} zones are calm at which hours — so I can plan my route?",
        requires: ["has_ride_attractions"],
        kind: "signature",
      },
      // ---- Cluster: cruises & helicopter tours — best departure slot ----
      {
        archetype: "optimal_departure",
        question_template:
          "Which departure time from {{ceName}} delivers the best light and views?",
        requires: ["has_cruise_departure_slots"],
        kind: "signature",
      },
      // ---- Cluster: hop-on-hop-off — stop frequency ----
      {
        archetype: "stop_frequency",
        question_template:
          "How often do departures or stops run at {{ceName}}?",
        requires: ["has_multi_route_options"],
        kind: "signature",
      },
      // ---- Generic ----
      {
        archetype: "entrance_map",
        question_template:
          "Which entrance at {{ceName}} should I use and why?",
        requires: ["has_multiple_entrances"],
        kind: "signature",
      },
      {
        archetype: "transit_options",
        question_template:
          "What's the easiest way to get to {{ceName}} from the city center?",
        kind: "signature",
      },
      {
        archetype: "floor_plan_flow",
        question_template:
          "What's the smartest room-by-room flow once inside {{ceName}}?",
        kind: "signature",
      },
      {
        archetype: "stop_frequency",
        question_template:
          "How often do departures or stops run at {{ceName}}?",
        kind: "signature",
      },
      {
        archetype: "optimal_departure",
        question_template:
          "When is the optimal departure time to leave for {{ceName}}?",
        kind: "signature",
      },
    ],
  },

  value: {
    id: "value",
    intent: "judge_value",
    label: "Value",
    description: "Tickets, savings, what you actually pay for",
    required_signals: [],
    preferred_signals: ["has_skip_the_line", "has_multiple_sub_products"],
    candidates: [
      {
        archetype: "ticket_ladder",
        question_template:
          "Which {{ceName}} ticket tier delivers the best value for what's included?",
        kind: "standard",
      },
      {
        archetype: "savings_breakdown",
        question_template:
          "How much can a {{ceName}} pass actually save vs buying separately?",
        kind: "signature",
      },
      {
        archetype: "time_value_matrix",
        question_template:
          "How does ticket price vs time saved compare across {{ceName}} options?",
        prefers: ["has_skip_the_line"],
        kind: "signature",
      },
      {
        archetype: "price_curve",
        question_template:
          "How does {{ceName}} pricing change by month or booking lead time?",
        requires: ["has_dynamic_pricing"],
        drop_note: "no_dynamic_pricing_signal: skipped weak price-curve",
        kind: "signature",
      },
      {
        archetype: "seat_value_map",
        question_template:
          "Which seat or zone at {{ceName}} delivers the most for the price?",
        kind: "signature",
      },
    ],
  },

  prep: {
    id: "prep",
    intent: "prepare_to_go",
    label: "Prep",
    description: "Rules, what to bring, accessibility",
    required_signals: [],
    preferred_signals: ["has_security_screening", "has_dress_code"],
    candidates: [
      // ---- Cluster: historic sites & monuments — know the story before you arrive ----
      {
        archetype: "history_timeline",
        question_template:
          "What's the story of {{ceName}} — from founding to what visitors see today?",
        requires: ["has_historical_significance"],
        kind: "signature",
      },
      // ---- Cluster: photography tours & helicopter tours — golden hour alignment ----
      {
        archetype: "golden_hour_match",
        question_template:
          "Which {{ceName}} departure slot lines up with golden hour — by month?",
        requires: ["has_photography_windows"],
        kind: "signature",
      },
      // ---- Generic ----
      {
        archetype: "rules_checklist",
        question_template:
          "What rules, restrictions, and gear should I know before visiting {{ceName}}?",
        prefers: ["has_security_screening", "has_dress_code"],
        kind: "signature",
      },
      {
        archetype: "accessibility_guide",
        question_template:
          "Is {{ceName}} accessible — and what's the step-free route?",
        requires: ["has_accessibility_concerns"],
        kind: "signature",
      },
      {
        archetype: "stat_grid",
        question_template:
          "What are the headline numbers visitors most want to know about {{ceName}}?",
        kind: "standard",
      },
    ],
  },
};

export const BUNDLE_IDS = Object.keys(QUESTION_BUNDLES) as BundleId[];
