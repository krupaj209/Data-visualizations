/**
 * Stable identifiers for the chart archetypes Viz Studio knows about.
 *
 * Today's nine `implemented: true` archetypes mirror
 * `artifacts/api-server/src/lib/chart-spec.ts`. The remaining ids are
 * RESERVED in v3: the bank already references them, but their schemas
 * and renderers are filled in by the sibling chart-family tasks. The
 * orchestrator skips a question whose archetype is still
 * `implemented: false` and records the reason in provenance.
 */
export type ChartArchetypeId =
  // Implemented today
  | "weekly_pattern"
  | "hourly_heatmap"
  | "month_calendar"
  | "booking_window"
  | "stat_grid"
  | "compare_zones"
  | "donut_breakdown"
  | "seasonal_curve"
  | "ticket_ladder"
  // Reserved (sibling tasks land schemas + renderers)
  | "queue_compare"
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
  // Task #67 v3 promoted archetypes
  | "ticket_access_matrix"
  | "duration_budget"
  | "landmark_coverage"
  | "itinerary_flow"
  | "best_for_matrix"
  | "season_weather_fit";

export interface ChartArchetype {
  id: ChartArchetypeId;
  /** Short human label used in admin UIs and prompt construction. */
  label: string;
  /** Plain-English description of the visitor question this archetype answers. */
  answers: string;
  /** Bullet list of the data shape required to populate the spec. */
  data_shape: string[];
  /**
   * Subcategories where this archetype is typically a strong fit. The pipeline
   * uses these as soft hints when no explicit `recommended_archetype` is given
   * by a question-bank entry.
   */
  typical_subcategories: SubcategoryId[];
  /** Whether the chart supports interactive overlays (hover, focus tooltip, etc.). */
  interactive: boolean;
  /**
   * False when the archetype is reserved but its Zod schema / React renderer
   * has not landed yet. The orchestrator NEVER asks Gemini to produce an
   * unimplemented archetype — it records `viz_not_yet_built` in provenance
   * and moves on.
   */
  implemented: boolean;
}

/**
 * Subcategory family groupings used by admin UIs (and as a hint to the
 * orchestrator about which signature questions might rhyme across siblings).
 */
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

/**
 * Subcategory identifiers (Headout v3 taxonomy). Slugs are stable and match
 * the platform's `subcategories` table.
 */
export type SubcategoryId =
  // Tickets
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
  // Tours
  | "guided_tours"
  | "day_trips"
  | "hop_on_hop_off"
  | "walking_tours"
  | "photography_tours"
  | "multi_day_tours"
  | "port_of_call_tours"
  // Cruises
  | "sightseeing_cruises"
  | "dinner_cruises"
  | "whale_watching"
  // Entertainment
  | "plays"
  | "rock_concerts"
  | "nightlife"
  | "live_sports"
  // Adventure
  | "desert_safari"
  | "skydiving"
  | "hot_air_balloon"
  | "skiing"
  | "go_karting"
  | "outdoor_activities"
  // Aerial
  | "helicopter_tours"
  | "cable_car_tours"
  // Water Sports
  | "scuba_diving"
  | "surfing"
  | "rafting"
  // Nature & Wildlife
  | "safari"
  | "hiking_trails"
  // Food & Drink
  | "food_tours"
  | "wineries"
  | "cooking_classes"
  | "pub_crawls"
  // Wellness
  | "spa"
  | "baths"
  // Specials
  | "combos"
  // Sports (spectator)
  | "formula_1"
  // Transport
  | "airport_transfers"
  | "train_tickets";

export interface SubcategoryMeta {
  id: SubcategoryId;
  label: string;
  /** Family grouping for admin UIs. Optional for forward-compatibility. */
  family?: SubcategoryFamily;
  /** Short prose context fed to the LLM when adapting the bank to a specific CE. */
  description: string;
}

/**
 * Structured "skip the question" predicate. The orchestrator passes the rule
 * to the LLM, which evaluates it against the DRD. The discriminator stays
 * open-ended (`type: string`) so banks can reference new signals before the
 * pipeline grows a dedicated case for them.
 */
export type SkipRule =
  /** No DRD signal for the named axis (e.g. "queue", "price", "duration"). */
  | { type: "no_data_signal"; signal: string }
  /** A DRD-flagged property (e.g. "fixed_duration", "private_charter"). */
  | { type: "drd_flag"; flag: string }
  /** No physical queue at all (walking tours, cooking classes, etc.). */
  | { type: "no_queue" }
  /** Single entry lane with no tier choice. */
  | { type: "single_lane" }
  /** Experience runs for a known fixed length — duration question is moot. */
  | { type: "fixed_duration" }
  /** Capacity is fixed by booking class — no crowd variability. */
  | { type: "fixed_capacity" }
  /** CE is multi-venue (combos) — crowd belongs on each child venue. */
  | { type: "multi_venue" }
  /** Always skip if the named optional field block is missing in the DRD. */
  | { type: "missing_drd_block"; block: string };

/**
 * "Standard" questions are the four (well, five — S1 is split into two
 * archetypes) universal asks every CE gets unless a `skip_if` fires.
 * "Signature" questions are subcat-specific add-ons (1-3 per CE).
 */
export type BankQuestionKind = "standard" | "signature";

export interface BankQuestion {
  /** Visitor-facing phrasing of the question. ≤ 14 words, sentence case. */
  question: string;
  /** Preferred archetype to answer this question. */
  recommended_archetype: ChartArchetypeId;
  /** Whether this is a universal standard or a subcat-specific signature. */
  kind: BankQuestionKind;
  /**
   * Topic identifier shared across questions that must travel together
   * (e.g. S1a + S1b both tagged "crowd_timing" so the writer-facing draft
   * view groups them). Optional — only set when there's a peer.
   */
  topic_id?: string;
  /**
   * Structured skip predicate evaluated by the LLM against the DRD. When
   * present and the predicate fires, the question is dropped and the reason
   * recorded in provenance.
   */
  skip_if?: SkipRule;
  /** Editorial notes for both the LLM and a human writer reviewing later. */
  notes?: string;
  /**
   * True when this entry is carried over from the v2 bank without a v3
   * rewrite (e.g. walking_tours, cooking_classes, spa, combos, outdoor
   * activities). Lets writers spot bank entries that still need a polish.
   */
  legacy?: boolean;
}

export interface SubcategoryBank {
  subcategory: SubcategoryMeta;
  /** Curated SIGNATURE questions specific to the subcategory. */
  questions: BankQuestion[];
  /**
   * If true, this subcategory has no curated bank yet — only the standard
   * S1-S4 questions are seeded, and the orchestrator is expected to bootstrap
   * a draft signature set from the DRD.
   */
  unratified: boolean;
}
