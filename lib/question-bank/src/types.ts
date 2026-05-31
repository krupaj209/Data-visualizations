/**
 * Stable identifiers for the chart archetypes Viz Studio knows about.
 */
export type ChartArchetypeId =
  | "weekly_pattern"
  | "hourly_heatmap"
  | "month_calendar"
  | "booking_window"
  | "stat_grid"
  | "compare_zones"
  | "donut_breakdown"
  | "seasonal_curve"
  | "ticket_ladder"
  | "queue_compare"
  | "entrance_lanes"
  | "duration_stat"
  | "ride_wait_curve"
  | "opening_hour_rank"
  | "zone_wait_heatmap"
  | "zone_crowd_heatmap"
  | "zone_wait_compare"
  | "daily_programme"
  | "time_split"
  | "history_timeline"
  | "slot_compare"
  | "sighting_probability"
  | "activity_window"
  | "departure_reliability"
  | "conditions_calendar"
  | "golden_hour_match"
  | "savings_breakdown"
  | "return_buffer_rank"
  | "seat_value_map"
  | "optimal_departure"
  | "price_curve"
  | "stop_frequency"
  | "route_profile"
  | "ticket_access_matrix"
  | "duration_budget"
  | "landmark_coverage"
  | "itinerary_flow"
  | "best_for_matrix"
  | "season_weather_fit"
  | "daily_pattern"
  | "entrance_map"
  | "floor_plan_flow"
  | "rules_checklist"
  | "transit_options"
  | "time_value_matrix"
  | "accessibility_guide"
  | "highlight_rank";

export interface ChartArchetype {
  id: ChartArchetypeId;
  label: string;
  answers: string;
  data_shape: string[];
  typical_subcategories: SubcategoryId[];
  interactive: boolean;
  implemented: boolean;
}

export type SubcategoryFamily =
  | "Tickets"
  | "Tours"
  | "Cruises"
  | "Entertainment"
  | "Adventure"
  | "Aerial"
  | "Water"
  | "Nature"
  | "Food"
  | "Wellness"
  | "Sports"
  | "Specials"
  | "Transport";

export type SubcategoryId =
  | "landmarks"
  | "museums"
  | "theme_parks"
  | "water_parks"
  | "zoos"
  | "aquariums"
  | "observation_decks"
  | "city_cards"
  | "religious_sites"
  | "immersive_experiences"
  | "guided_tours"
  | "day_trips"
  | "hop_on_hop_off"
  | "walking_tours"
  | "photography_tours"
  | "multi_day_tours"
  | "port_of_call_tours"
  | "sightseeing_cruises"
  | "dinner_cruises"
  | "whale_watching"
  | "plays"
  | "rock_concerts"
  | "nightlife"
  | "live_sports"
  | "desert_safari"
  | "skydiving"
  | "hot_air_balloon"
  | "skiing"
  | "go_karting"
  | "outdoor_activities"
  | "helicopter_tours"
  | "cable_car_tours"
  | "scuba_diving"
  | "surfing"
  | "rafting"
  | "safari"
  | "hiking_trails"
  | "food_tours"
  | "wineries"
  | "cooking_classes"
  | "pub_crawls"
  | "spa"
  | "baths"
  | "combos"
  | "formula_1"
  | "airport_transfers"
  | "train_tickets";

export interface SubcategoryMeta {
  id: SubcategoryId;
  label: string;
  family?: SubcategoryFamily;
  description: string;
}

/**
 * "Kind" is retained as a back-compat alias for provenance tagging and to
 * preserve the shape of `SelectedQuestion` produced by the assembler so
 * downstream code (research-pipeline.ts step 2 + persistence) doesn't need
 * to be rewired. "standard" maps to bundle defaults (timing, duration,
 * value's ticket_ladder, prep's stat_grid); "signature" maps to CE-specific
 * candidates inside a bundle.
 */
export type BankQuestionKind = "standard" | "signature";

/**
 * Legacy BankQuestion shape kept for the regen helper (`existingCharts`
 * snapshots from prior drafts may still carry this field) and the routes
 * layer that surfaces `proposedHeroQuestions` to the writer UI.
 */
export interface BankQuestion {
  question: string;
  recommended_archetype: ChartArchetypeId;
  kind: BankQuestionKind;
  topic_id?: string;
  notes?: string;
}
