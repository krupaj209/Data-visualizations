import type {
  BankQuestion,
  SubcategoryBank,
  SubcategoryFamily,
  SubcategoryId,
  SubcategoryMeta,
} from "./types";

/* ========================================================================== */
/* Standard questions (S1–S4) — every CE gets these unless skipped            */
/* ========================================================================== */

/**
 * The four standard questions every CE inherits in v3. S1 ("when do the
 * crowds show?") is split into two archetypes that ALWAYS travel together:
 * S1a (weekly_pattern) and S1b (hourly_heatmap), both tagged with
 * `topic_id: "crowd_timing"` so the writer-facing draft view can group them.
 *
 * The orchestrator never re-orders these: writer-facing UIs depend on the
 * S1a → S1b → S2 → S3 → S4 sequence.
 */
export const STANDARD_QUESTIONS: BankQuestion[] = [
  {
    question: "Which days are calmest or busiest?",
    recommended_archetype: "weekly_pattern",
    kind: "standard",
    topic_id: "crowd_timing",
    skip_if: { type: "drd_flag", flag: "no_crowd_variability" },
    notes:
      "Travels with the hourly view (S1b). Drop both together when the DRD flags no crowd variability (private charter, fixed capacity).",
  },
  {
    question: "What time of day feels easiest?",
    recommended_archetype: "hourly_heatmap",
    kind: "standard",
    topic_id: "crowd_timing",
    skip_if: { type: "drd_flag", flag: "no_crowd_variability" },
    notes:
      "Travels with the weekly view (S1a). Drop both together when the DRD flags no crowd variability.",
  },
  {
    question: "Which entrance or lane should I use?",
    recommended_archetype: "queue_compare",
    kind: "standard",
    skip_if: { type: "no_queue" },
    notes:
      "Skip when the CE has no physical queue (walking tours, cooking classes) or only a single entry lane.",
  },
  {
    question: "When should I book to avoid missing out?",
    recommended_archetype: "booking_window",
    kind: "standard",
    skip_if: { type: "drd_flag", flag: "unlimited_capacity" },
    notes:
      "Skip when the DRD says capacity is unlimited or there is no sell-out risk.",
  },
  {
    question: "How long should I spend here?",
    recommended_archetype: "duration_stat",
    kind: "standard",
    skip_if: { type: "fixed_duration" },
    notes:
      "Skip when the experience has a fixed runtime (a play, a 90-min cruise) — duration is already known to the visitor.",
  },
];

/* ========================================================================== */
/* Subcategory metadata                                                        */
/* ========================================================================== */

const subcat = (
  id: SubcategoryId,
  label: string,
  family: SubcategoryFamily,
  description: string,
): [SubcategoryId, SubcategoryMeta] => [
  id,
  { id, label, family, description },
];

const SUBCATEGORIES: Record<SubcategoryId, SubcategoryMeta> =
  Object.fromEntries([
    /* Tickets */
    subcat(
      "landmarks",
      "Landmarks",
      "Tickets",
      "Iconic outdoor or architectural attractions with timed entry, observation decks, or queue management (e.g. Eiffel Tower, Colosseum, Burj Khalifa).",
    ),
    subcat(
      "museums",
      "Museums",
      "Tickets",
      "Indoor cultural collections with timed slots, named galleries, and queue/skip-the-line ticket dynamics (e.g. Vatican Museums, Uffizi).",
    ),
    subcat(
      "theme_parks",
      "Theme parks",
      "Tickets",
      "Multi-zone parks with varied attractions, named lands, line-skipping passes, and strong weekday/season dynamics.",
    ),
    subcat(
      "water_parks",
      "Water parks",
      "Tickets",
      "Outdoor water-attraction parks with named slides, flow rides, and strong heat/season dynamics.",
    ),
    subcat(
      "zoos",
      "Zoos",
      "Tickets",
      "Multi-zone animal parks with fixed-time feeding shows and walking circuits between exhibits.",
    ),
    subcat(
      "aquariums",
      "Aquariums",
      "Tickets",
      "Indoor marine attractions with named exhibits, dive shows, and feeding-time programmes.",
    ),
    subcat(
      "observation_decks",
      "Observation decks",
      "Tickets",
      "Tower or skyscraper viewing experiences with multiple named levels and tier-based queue dynamics.",
    ),
    subcat(
      "city_cards",
      "City cards",
      "Tickets",
      "Multi-attraction city passes (Go City, OMNIA, etc.) where value is driven by the included attraction lineup and validity window.",
    ),
    subcat(
      "religious_sites",
      "Religious sites",
      "Tickets",
      "Active places of worship that are also visitor attractions; service / prayer schedules constrain access windows.",
    ),
    subcat(
      "immersive_experiences",
      "Immersive experiences",
      "Tickets",
      "Slot-based curated experiences (Van Gogh exhibitions, escape-room-adjacent installations) with finite walk-through duration.",
    ),

    /* Tours */
    subcat(
      "guided_tours",
      "Guided tours",
      "Tours",
      "Smaller-group expert-led tours, often inside a venue. Tier choice (group size, language, included tickets) is a key decision.",
    ),
    subcat(
      "day_trips",
      "Day trips",
      "Tours",
      "Full-day group excursions to one or more sites near a base city (Pompeii from Rome, Cliffs of Moher from Dublin). Heavy lead-time + seasonality.",
    ),
    subcat(
      "hop_on_hop_off",
      "Hop-on hop-off",
      "Tours",
      "Bus or boat networks with multiple stops. Route loop time, frequency, and pass duration are the big visitor questions.",
    ),
    subcat(
      "walking_tours",
      "Walking tours",
      "Tours",
      "Outdoor on-foot guided tours of a neighbourhood or theme. Route distance and elevation matter most.",
    ),
    subcat(
      "photography_tours",
      "Photography tours",
      "Tours",
      "Guided shoots at scenic locations; the slot pick is dominated by light quality and golden-hour alignment.",
    ),
    subcat(
      "multi_day_tours",
      "Multi-day tours",
      "Tours",
      "Multi-night package tours across multiple destinations; pricing varies meaningfully by departure date.",
    ),
    subcat(
      "port_of_call_tours",
      "Port of call tours",
      "Tours",
      "Shore excursions for cruise passengers; the dominant visitor fear is missing the ship at the end of the day.",
    ),

    /* Cruises */
    subcat(
      "sightseeing_cruises",
      "Sightseeing cruises",
      "Cruises",
      "Short scheduled boat tours through a city (Seine, Bosphorus, Hudson). Daily departure cadence and weather are the main visitor concerns.",
    ),
    subcat(
      "dinner_cruises",
      "Dinner cruises",
      "Cruises",
      "Evening dining cruises with tier-based menus and seating; weeknight vs weekend availability is the key planning axis.",
    ),
    subcat(
      "whale_watching",
      "Whale watching",
      "Cruises",
      "Wildlife-spotting boat trips; visitor's real question is sighting probability, not crowd or comfort.",
    ),

    /* Entertainment */
    subcat(
      "plays",
      "Plays, musicals, opera, ballet",
      "Entertainment",
      "Theatrical performances at a fixed venue with multiple seating tiers, scheduled show times, and sell-out dynamics.",
    ),
    subcat(
      "rock_concerts",
      "Rock concerts",
      "Entertainment",
      "Arena and stadium music events with named pit / floor / seated sections and rapid sell-out dynamics.",
    ),
    subcat(
      "nightlife",
      "Nightlife",
      "Entertainment",
      "Clubs, late bars, and venues where the nightly arc (peak hour, table demand) is the dominant question.",
    ),
    subcat(
      "live_sports",
      "Live sports",
      "Entertainment",
      "League fixtures and one-off sports events with demand variation by fixture and seating zone.",
    ),

    /* Adventure */
    subcat(
      "desert_safari",
      "Desert safari",
      "Adventure",
      "Half-day or evening desert excursions; sunrise vs midday vs sunset slot is the dominant choice.",
    ),
    subcat(
      "skydiving",
      "Skydiving & bungee",
      "Adventure",
      "High-adrenaline jumps where weather cancellation reliability is the dominant pre-booking concern.",
    ),
    subcat(
      "hot_air_balloon",
      "Hot air balloon",
      "Adventure",
      "Sunrise-dominated balloon flights with weather-driven cancellation risk and named slot demand.",
    ),
    subcat(
      "skiing",
      "Skiing & snowboarding",
      "Adventure",
      "Snow-sports day passes; conditions (snow depth, quality) outweigh crowd as the booking driver.",
    ),
    subcat(
      "go_karting",
      "Go karting & racing",
      "Adventure",
      "Indoor or outdoor track sessions with hourly wait dynamics for track access.",
    ),
    subcat(
      "outdoor_activities",
      "Outdoor activities",
      "Adventure",
      "Catch-all for adventure experiences without a dedicated subcat (paragliding, abseiling, cycling tours). Weather-window driven.",
    ),

    /* Aerial */
    subcat(
      "helicopter_tours",
      "Helicopter tours",
      "Aerial",
      "Short scenic flights over a city or landscape. Weather sensitivity and tier (shared vs private) drive choice.",
    ),
    subcat(
      "cable_car_tours",
      "Cable car tours",
      "Aerial",
      "Mountain or hill cable-car experiences; summit visibility by month is the planning question.",
    ),

    /* Water Sports */
    subcat(
      "scuba_diving",
      "Scuba diving & snorkelling",
      "Water",
      "Guided dives and snorkel trips; visibility and species presence by month dominate the decision.",
    ),
    subcat(
      "surfing",
      "Surfing",
      "Water",
      "Guided sessions and lessons at named breaks; swell quality by month and crowd at the break drive choice.",
    ),
    subcat(
      "rafting",
      "Rafting",
      "Water",
      "River-rafting experiences; safe-window vs flow-strength vs expert-only by month is the planning question.",
    ),

    /* Nature & Wildlife */
    subcat(
      "safari",
      "Safari",
      "Nature",
      "Game-drive experiences; species sighting probability by month and animal-activity by hour are the planning axes.",
    ),
    subcat(
      "hiking_trails",
      "Hiking trails",
      "Nature",
      "Self-guided or guided hikes on named trails; distance, elevation, and trail-condition seasonality matter.",
    ),

    /* Food & Drink */
    subcat(
      "food_tours",
      "Food tours",
      "Food",
      "Walking/eating tours of named stops; how time splits across stops is the planning question.",
    ),
    subcat(
      "wineries",
      "Wineries",
      "Food",
      "Tastings, tours, and meal experiences at a vineyard. Heavy seasonality (harvest), reservation lead time, and tier matter.",
    ),
    subcat(
      "cooking_classes",
      "Cooking classes",
      "Food",
      "Hands-on small-group classes, typically 2-4 hours. Class size, dish count, slot availability, and dietary inclusivity matter.",
    ),
    subcat(
      "pub_crawls",
      "Pub crawls",
      "Food",
      "Multi-venue evening drinking tours; night-of-week atmosphere is the planning question.",
    ),

    /* Wellness */
    subcat(
      "spa",
      "Spa",
      "Wellness",
      "Day spa visits with treatment menus; pool/wet-area cadence, tier choice, and treatment-specific lead times matter.",
    ),
    subcat(
      "baths",
      "Baths",
      "Wellness",
      "Self-directed bath complexes (Széchenyi, onsen, hammam); soak duration and pool-area cadence are the planning axes.",
    ),

    /* Specials */
    subcat(
      "combos",
      "Combo tickets",
      "Specials",
      "Bundled passes across multiple attractions. Per-attraction value, validity window, and skip-the-line inclusions matter most.",
    ),

    /* Sports (spectator) */
    subcat(
      "formula_1",
      "Formula 1",
      "Sports",
      "Multi-day grand prix events with Practice / Qualifying / Race day differences and named grandstand zones.",
    ),

    /* Transport */
    subcat(
      "airport_transfers",
      "Airport transfers",
      "Transport",
      "Private and shared transfers between airport and city; journey time varies materially by departure hour.",
    ),
    subcat(
      "train_tickets",
      "Train tickets",
      "Transport",
      "Inter-city rail bookings; price varies materially by lead time.",
    ),
  ]) as Record<SubcategoryId, SubcategoryMeta>;

/* ========================================================================== */
/* Signature questions per subcategory                                         */
/* ========================================================================== */

/**
 * Tiny constructor to keep the `kind: "signature"` boilerplate out of every
 * row. Signature entries always pair with a structured `skip_if` so the
 * orchestrator can drop them when the DRD doesn't carry the data.
 */
const sig = (
  q: Omit<BankQuestion, "kind"> & { kind?: "signature" },
): BankQuestion => ({ ...q, kind: "signature" });

const RAW_BANK: Partial<Record<SubcategoryId, BankQuestion[]>> = {
  /* ---------------- Tickets ---------------- */
  landmarks: [
    sig({
      question: "Which area or level is most worth prioritising?",
      recommended_archetype: "compare_zones",
      skip_if: { type: "no_data_signal", signal: "access_area_payoff" },
      notes:
        "Use for arenas, underground levels, towers, viewpoints, terraces, or named monument zones. Compare visitor payoff, access friction, and who each area suits.",
    }),
    sig({
      question: "Which ticket unlocks the areas people care about?",
      recommended_archetype: "ticket_ladder",
      skip_if: { type: "no_data_signal", signal: "ticket_access_by_area" },
    }),
    sig({
      question: "What are the major moments in its story?",
      recommended_archetype: "history_timeline",
      skip_if: { type: "no_data_signal", signal: "historical_dates" },
      notes:
        "Prefer for historically rich monuments. Needs 5-9 dated turning points; skip thin one-date histories.",
    }),
  ],
  museums: [
    sig({
      question: "Which gallery should I visit first, and when?",
      recommended_archetype: "zone_crowd_heatmap",
      skip_if: {
        type: "no_data_signal",
        signal: "visitor_flow_by_gallery_hour",
      },
    }),
    sig({
      question: "Which ticket unlocks the rooms people care about?",
      recommended_archetype: "ticket_ladder",
      skip_if: { type: "no_data_signal", signal: "tier_access_and_price" },
    }),
    sig({
      question: "What type of visit do most people choose?",
      recommended_archetype: "donut_breakdown",
      skip_if: { type: "no_data_signal", signal: "ticket_type_sales_mix" },
    }),
    sig({
      question: "What are the collection's biggest turning points?",
      recommended_archetype: "history_timeline",
      skip_if: { type: "no_data_signal", signal: "collection_history_dates" },
    }),
  ],
  theme_parks: [
    sig({
      question: "When should I ride the headline attraction?",
      recommended_archetype: "ride_wait_curve",
      skip_if: {
        type: "no_data_signal",
        signal: "hourly_wait_for_named_ride",
      },
    }),
    sig({
      question: "Which rides should I do first at opening?",
      recommended_archetype: "opening_hour_rank",
      skip_if: { type: "no_data_signal", signal: "opening_hour_ride_waits" },
    }),
    sig({
      question: "Which park zones are easiest at each hour?",
      recommended_archetype: "zone_wait_heatmap",
      skip_if: { type: "no_data_signal", signal: "wait_by_zone_hour" },
    }),
    sig({
      question: "Which pass tier actually saves meaningful time?",
      recommended_archetype: "ticket_ladder",
      skip_if: {
        type: "no_data_signal",
        signal: "wait_savings_by_pass_tier",
      },
    }),
    sig({
      question: "Which upcoming dates look easiest to visit?",
      recommended_archetype: "month_calendar",
      skip_if: { type: "no_data_signal", signal: "day_level_crowd_index" },
    }),
  ],
  water_parks: [
    sig({
      question: "When should I ride the headline slide?",
      recommended_archetype: "ride_wait_curve",
      skip_if: {
        type: "no_data_signal",
        signal: "hourly_wait_for_named_slide",
      },
    }),
    sig({
      question: "Which slides should I do first at opening?",
      recommended_archetype: "opening_hour_rank",
      skip_if: { type: "no_data_signal", signal: "opening_hour_slide_waits" },
    }),
    sig({
      question: "Which upcoming dates look easiest to visit?",
      recommended_archetype: "month_calendar",
      skip_if: { type: "no_data_signal", signal: "day_level_crowd_index" },
    }),
  ],
  zoos: [
    sig({
      question:
        "Which feedings or shows should I plan around?",
      recommended_archetype: "daily_programme",
      skip_if: { type: "no_data_signal", signal: "fixed_event_schedule" },
    }),
    sig({
      question:
        "Which animal zones should I visit at each hour?",
      recommended_archetype: "zone_crowd_heatmap",
      skip_if: { type: "no_data_signal", signal: "visitor_flow_by_zone_hour" },
    }),
  ],
  aquariums: [
    sig({
      question:
        "Which feeding or dive shows should I plan around?",
      recommended_archetype: "daily_programme",
      skip_if: { type: "no_data_signal", signal: "fixed_event_schedule" },
    }),
    sig({
      question:
        "Which exhibits should I visit at each hour?",
      recommended_archetype: "zone_crowd_heatmap",
      skip_if: {
        type: "no_data_signal",
        signal: "visitor_flow_by_exhibit_hour",
      },
    }),
  ],
  observation_decks: [
    sig({
      question: "Which viewing level gives the best payoff?",
      recommended_archetype: "compare_zones",
      skip_if: { type: "no_data_signal", signal: "view_payoff_per_level" },
    }),
    sig({
      question: "Which ticket gets me the view I want?",
      recommended_archetype: "ticket_ladder",
      skip_if: { type: "no_data_signal", signal: "ticket_access_by_level" },
    }),
    sig({
      question: "Which departure time has the best light?",
      recommended_archetype: "optimal_departure",
      skip_if: { type: "no_data_signal", signal: "light_visibility_by_slot" },
    }),
  ],
  city_cards: [
    sig({
      question:
        "Which included attractions actually unlock the value?",
      recommended_archetype: "savings_breakdown",
      skip_if: {
        type: "no_data_signal",
        signal: "standalone_price_per_attraction",
      },
    }),
    sig({
      question: "What do card holders actually use?",
      recommended_archetype: "donut_breakdown",
      skip_if: { type: "no_data_signal", signal: "card_redemption_mix" },
    }),
    sig({
      question: "Which card duration fits my itinerary?",
      recommended_archetype: "slot_compare",
      skip_if: { type: "no_data_signal", signal: "validity_window_use_cases" },
    }),
  ],
  religious_sites: [
    sig({
      question: "When can I visit without disrupting services?",
      recommended_archetype: "daily_programme",
      skip_if: { type: "no_data_signal", signal: "service_schedule" },
    }),
    sig({
      question: "Which ticket or route gets me in fastest?",
      recommended_archetype: "ticket_ladder",
      skip_if: { type: "no_data_signal", signal: "queue_time_by_entry_type" },
    }),
    sig({
      question: "What are the site's major historical moments?",
      recommended_archetype: "history_timeline",
      skip_if: { type: "no_data_signal", signal: "religious_site_history_dates" },
    }),
  ],
  immersive_experiences: [
    sig({
      question: "Which time slot gives me space to explore?",
      recommended_archetype: "hourly_heatmap",
      skip_if: { type: "no_data_signal", signal: "crowd_by_named_slot" },
    }),
    sig({
      question: "How long will I actually spend inside?",
      recommended_archetype: "duration_stat",
      skip_if: { type: "fixed_duration" },
    }),
  ],

  /* ---------------- Tours ---------------- */
  guided_tours: [
    sig({
      question:
        "Private or shared tour — what changes?",
      recommended_archetype: "donut_breakdown",
      skip_if: { type: "no_data_signal", signal: "tier_sales_mix" },
      notes:
        "Use donut only when mix data exists; otherwise prefer slot_compare from the planner with group size, pace, and access dimensions.",
    }),
    sig({
      question:
        "How much tour time is actually at the site?",
      recommended_archetype: "time_split",
      skip_if: { type: "no_data_signal", signal: "tour_time_breakdown" },
    }),
  ],
  day_trips: [
    sig({
      question: "How much of the day is travel?",
      recommended_archetype: "time_split",
      skip_if: { type: "no_data_signal", signal: "tour_time_breakdown" },
    }),
    sig({
      question: "Which stops define the day trip?",
      recommended_archetype: "route_profile",
      skip_if: { type: "no_data_signal", signal: "ordered_day_trip_stops" },
    }),
    sig({
      question: "Which itinerary style fits my travel day?",
      recommended_archetype: "slot_compare",
      skip_if: { type: "no_data_signal", signal: "named_itinerary_variants" },
    }),
  ],
  hop_on_hop_off: [
    sig({
      question: "How long will I wait after hopping off?",
      recommended_archetype: "stop_frequency",
      skip_if: { type: "no_data_signal", signal: "headway_by_stop_time" },
    }),
    sig({
      question: "Which route loop fits my day?",
      recommended_archetype: "route_profile",
      skip_if: { type: "no_data_signal", signal: "loop_time_per_route" },
    }),
  ],
  walking_tours: [
    sig({
      question: "How demanding is the route?",
      recommended_archetype: "route_profile",
      skip_if: { type: "no_data_signal", signal: "distance_elevation_route" },
    }),
    sig({
      question: "Which tour theme fits my interests?",
      recommended_archetype: "slot_compare",
      skip_if: { type: "no_data_signal", signal: "theme_duration_and_price" },
    }),
    sig({
      question: "Which months are most comfortable for walking?",
      recommended_archetype: "conditions_calendar",
      skip_if: { type: "no_data_signal", signal: "walking_weather_by_month" },
    }),
  ],
  photography_tours: [
    sig({
      question:
        "Which departure time captures golden hour at the headline locations?",
      recommended_archetype: "golden_hour_match",
      skip_if: {
        type: "no_data_signal",
        signal: "departure_slots_and_sun_times",
      },
    }),
    sig({
      question: "Which photo stops are actually covered?",
      recommended_archetype: "route_profile",
      skip_if: { type: "no_data_signal", signal: "photo_stop_route" },
    }),
  ],
  multi_day_tours: [
    sig({
      question: "Where does the itinerary spend real time?",
      recommended_archetype: "time_split",
      skip_if: { type: "no_data_signal", signal: "hours_per_destination" },
    }),
    sig({
      question: "Which departure months are better value?",
      recommended_archetype: "price_curve",
      skip_if: { type: "no_data_signal", signal: "price_by_departure" },
    }),
  ],
  port_of_call_tours: [
    sig({
      question: "Which tour gets me back safely before sailing?",
      recommended_archetype: "return_buffer_rank",
      skip_if: {
        type: "no_data_signal",
        signal: "return_buffer_minutes_per_tour",
      },
    }),
    sig({
      question: "How much shore time is actually at the site?",
      recommended_archetype: "time_split",
      skip_if: { type: "no_data_signal", signal: "shore_time_breakdown" },
    }),
  ],

  /* ---------------- Cruises ---------------- */
  sightseeing_cruises: [
    // Anchor for category CEs: head-to-head sub-product comparison.
    // The orchestrator's category-CE branch REQUIRES this archetype when
    // the DRD describes 3+ named sub-products with distinct positioning
    // (Uber Boat vs narrated sightseeing vs Greenwich vs dining vs HOHO).
    sig({
      question: "Which cruise type fits my day?",
      recommended_archetype: "slot_compare",
      skip_if: {
        type: "no_data_signal",
        signal: "named_subproducts_with_distinct_positioning",
      },
      notes:
        "Slots = the named sub-products in the DRD (e.g. Uber Boat / sightseeing cruise / Greenwich cruise / dining cruise). Dimensions = price tier, scenic payoff, narration quality, atmosphere — pulled from the DRD's own pain→product mapping.",
    }),
    sig({
      question: "What will I see on the main route?",
      recommended_archetype: "route_profile",
      skip_if: {
        type: "no_data_signal",
        signal: "ordered_route_landmarks_or_piers",
      },
      notes:
        "Best default for river/category CEs. Show ordered piers or landmarks, duration, and strongest visual payoff. Avoid static price cards unless pricing is fixed and sourced.",
    }),
    // Route choice (short central loop vs Greenwich destination cruise).
    sig({
      question: "Short loop or destination cruise?",
      recommended_archetype: "slot_compare",
      skip_if: {
        type: "no_data_signal",
        signal: "named_routes_with_duration_and_payoff",
      },
      notes:
        "Slots = named routes (Westminster–Tower vs Westminster–Greenwich). Dimensions = duration, scenic payoff, half-day potential.",
    }),
    // Day vs evening / sightseeing vs dining occasion split.
    sig({
      question: "Day cruise or after-dark cruise?",
      recommended_archetype: "slot_compare",
      skip_if: {
        type: "no_data_signal",
        signal: "day_vs_evening_payoff_difference",
      },
      notes:
        "Slots = daytime sightseeing vs evening sightseeing vs dinner cruise. Dimensions = skyline payoff, atmosphere, food/service weight, value-for-money.",
    }),
    // Upper-deck / early-boarding mechanic.
    sig({
      question: "Where should I sit for the best view?",
      recommended_archetype: "compare_zones",
      skip_if: {
        type: "no_data_signal",
        signal: "deck_or_seating_options_with_payoff",
      },
      notes:
        "Compare named zones (upper deck / lower deck / window / outdoor bow) on view quality and how competitive boarding is. Skip if the DRD doesn't surface a deck or seating mechanic.",
    }),
    // Dynamic fare calendar — better than a static ticket ladder when fares
    // shift by date/week.
    sig({
      question: "When do cruise prices actually change?",
      recommended_archetype: "month_calendar",
      skip_if: {
        type: "no_data_signal",
        signal: "date_level_or_week_level_ticket_prices",
      },
      notes:
        "Use for dynamic OTA/operator fares. If the DRD only has static inclusions by product, prefer the sub-product slot_compare instead of a price chart.",
    }),
    // HOHO flexibility value.
    sig({
      question: "Single cruise or hop-on hop-off pass?",
      recommended_archetype: "slot_compare",
      skip_if: {
        type: "no_data_signal",
        signal: "single_vs_hoho_usage_context",
      },
    }),
    // Time split — strongest on destination cruises (Greenwich) and dining cruises.
    sig({
      question: "How is the cruise time actually used?",
      recommended_archetype: "time_split",
      skip_if: { type: "no_data_signal", signal: "tour_time_breakdown" },
    }),
    // Light/visibility-by-slot — kept from v2 but now narrowly scoped.
    sig({
      question: "Which departure time gives the best views?",
      recommended_archetype: "optimal_departure",
      skip_if: {
        type: "no_data_signal",
        signal: "light_and_clarity_by_slot",
      },
    }),
  ],
  dinner_cruises: [
    sig({
      question:
        "Which nights are easiest to book?",
      recommended_archetype: "weekly_pattern",
      skip_if: { type: "no_data_signal", signal: "occupancy_by_day_of_week" },
      notes: "Standard chart, dinner-cruise framing.",
    }),
    sig({
      question: "Which dinner tier is worth the premium?",
      recommended_archetype: "ticket_ladder",
      skip_if: { type: "no_data_signal", signal: "inclusions_by_tier" },
    }),
    sig({
      question: "How is the evening actually paced?",
      recommended_archetype: "time_split",
      skip_if: { type: "no_data_signal", signal: "dinner_cruise_time_breakdown" },
    }),
  ],
  whale_watching: [
    sig({
      question: "What are my chances of a sighting?",
      recommended_archetype: "sighting_probability",
      skip_if: { type: "no_data_signal", signal: "monthly_sighting_rate" },
    }),
    sig({
      question: "What time of day are sightings most likely?",
      recommended_archetype: "hourly_heatmap",
      skip_if: { type: "no_data_signal", signal: "sighting_frequency_by_hour" },
      notes: "Same curve format, y-axis = sighting frequency not crowd.",
    }),
  ],

  /* ---------------- Entertainment ---------------- */
  plays: [
    sig({
      question: "Which seats are worth the premium?",
      recommended_archetype: "seat_value_map",
      skip_if: {
        type: "no_data_signal",
        signal: "price_and_sightline_per_section",
      },
    }),
    sig({
      question: "Which performance days have better availability?",
      recommended_archetype: "weekly_pattern",
      skip_if: {
        type: "no_data_signal",
        signal: "seat_availability_by_day_of_week",
      },
    }),
  ],
  rock_concerts: [
    sig({
      question:
        "Floor or seated — which zone fits me?",
      recommended_archetype: "slot_compare",
      skip_if: {
        type: "no_data_signal",
        signal: "price_and_experience_per_zone",
      },
    }),
    sig({
      question: "How quickly do premium sections sell out?",
      recommended_archetype: "ticket_ladder",
      skip_if: { type: "no_data_signal", signal: "days_to_sellout_per_tier" },
    }),
  ],
  nightlife: [
    sig({
      question:
        "What time does the night actually peak?",
      recommended_archetype: "hourly_heatmap",
      skip_if: { type: "no_data_signal", signal: "occupancy_through_night" },
    }),
    sig({
      question: "Which night has the best atmosphere?",
      recommended_archetype: "weekly_pattern",
      skip_if: { type: "no_data_signal", signal: "night_demand_by_day_of_week" },
    }),
  ],
  live_sports: [
    sig({
      question: "Which fixtures are hardest to get?",
      recommended_archetype: "month_calendar",
      skip_if: { type: "no_data_signal", signal: "demand_per_fixture" },
    }),
    sig({
      question: "Which seating zone is best value?",
      recommended_archetype: "seat_value_map",
      skip_if: { type: "no_data_signal", signal: "price_and_view_per_zone" },
    }),
  ],

  /* ---------------- Adventure ---------------- */
  desert_safari: [
    sig({
      question: "Sunrise or sunset — which slot delivers?",
      recommended_archetype: "slot_compare",
      skip_if: {
        type: "no_data_signal",
        signal: "conditions_per_named_slot",
      },
    }),
    sig({
      question: "How is safari time split across activities?",
      recommended_archetype: "time_split",
      skip_if: { type: "no_data_signal", signal: "safari_activity_time_breakdown" },
    }),
  ],
  skydiving: [
    sig({
      question:
        "How often do conditions cancel a session?",
      recommended_archetype: "departure_reliability",
      skip_if: {
        type: "no_data_signal",
        signal: "monthly_session_reliability",
      },
    }),
    sig({
      question: "When should I book a jump slot?",
      recommended_archetype: "booking_window",
      skip_if: { type: "no_data_signal", signal: "booking_lead_time_by_slot" },
    }),
  ],
  hot_air_balloon: [
    sig({
      question:
        "What share of flights actually take off?",
      recommended_archetype: "departure_reliability",
      skip_if: {
        type: "no_data_signal",
        signal: "monthly_flight_reliability",
      },
    }),
    sig({
      question:
        "Sunrise or later — which flight fits me?",
      recommended_archetype: "slot_compare",
      skip_if: { type: "no_data_signal", signal: "demand_per_named_slot" },
    }),
  ],
  skiing: [
    sig({
      question: "When are snow conditions strongest?",
      recommended_archetype: "conditions_calendar",
      skip_if: {
        type: "no_data_signal",
        signal: "snow_depth_and_quality_by_month",
      },
    }),
    sig({
      question:
        "Which ski area fits my ability?",
      recommended_archetype: "compare_zones",
      skip_if: {
        type: "no_data_signal",
        signal: "difficulty_and_crowd_per_run",
      },
    }),
  ],
  go_karting: [
    sig({
      question: "When is the shortest wait for track time?",
      recommended_archetype: "hourly_heatmap",
      skip_if: { type: "no_data_signal", signal: "track_wait_by_hour" },
      notes: "Same curve format, y-axis = wait minutes.",
    }),
    sig({
      question: "Which race format fits my group?",
      recommended_archetype: "slot_compare",
      skip_if: { type: "no_data_signal", signal: "race_format_time_price" },
    }),
  ],
  outdoor_activities: [
    sig({
      question: "Which months are in the right conditions window?",
      recommended_archetype: "conditions_calendar",
      skip_if: { type: "no_data_signal", signal: "weather_window_by_month" },
    }),
    sig({
      question: "When should I book this activity?",
      recommended_archetype: "booking_window",
      skip_if: { type: "no_data_signal", signal: "booking_lead_time" },
    }),
    sig({
      question: "Which difficulty tier fits me?",
      recommended_archetype: "slot_compare",
      skip_if: { type: "no_data_signal", signal: "difficulty_duration_tiers" },
    }),
  ],

  /* ---------------- Aerial ---------------- */
  helicopter_tours: [
    sig({
      question:
        "Which departure gives the clearest views?",
      recommended_archetype: "optimal_departure",
      skip_if: {
        type: "no_data_signal",
        signal: "visibility_and_light_per_slot",
      },
    }),
    sig({
      question: "Shared or private flight — what changes?",
      recommended_archetype: "slot_compare",
      skip_if: { type: "no_data_signal", signal: "flight_type_price_duration" },
    }),
  ],
  cable_car_tours: [
    sig({
      question: "When is the shortest queue to board?",
      recommended_archetype: "hourly_heatmap",
      skip_if: { type: "no_data_signal", signal: "queue_length_by_hour" },
    }),
    sig({
      question: "Which months give the clearest summit views?",
      recommended_archetype: "conditions_calendar",
      skip_if: {
        type: "no_data_signal",
        signal: "clear_summit_days_per_month",
      },
    }),
  ],

  /* ---------------- Water Sports ---------------- */
  scuba_diving: [
    sig({
      question:
        "When is visibility and marine life best?",
      recommended_archetype: "conditions_calendar",
      skip_if: {
        type: "no_data_signal",
        signal: "visibility_and_species_by_month",
      },
    }),
    sig({
      question:
        "Which dive site fits my skill level?",
      recommended_archetype: "compare_zones",
      skip_if: { type: "no_data_signal", signal: "site_difficulty_and_life" },
    }),
  ],
  surfing: [
    sig({
      question: "When is the swell best for this break?",
      recommended_archetype: "conditions_calendar",
      skip_if: {
        type: "no_data_signal",
        signal: "swell_height_and_quality_by_month",
      },
    }),
    sig({
      question:
        "Which surf break fits my level?",
      recommended_archetype: "compare_zones",
      skip_if: { type: "no_data_signal", signal: "wave_and_crowd_per_break" },
    }),
  ],
  rafting: [
    sig({
      question:
        "When is the river safest and most fun?",
      recommended_archetype: "conditions_calendar",
      skip_if: { type: "no_data_signal", signal: "river_flow_by_month" },
    }),
    sig({
      question: "Which rafting grade fits my group?",
      recommended_archetype: "slot_compare",
      skip_if: { type: "no_data_signal", signal: "rafting_grade_duration" },
    }),
  ],

  /* ---------------- Nature & Wildlife ---------------- */
  safari: [
    sig({
      question:
        "When am I most likely to see wildlife?",
      recommended_archetype: "sighting_probability",
      skip_if: { type: "no_data_signal", signal: "monthly_sighting_per_species" },
    }),
    sig({
      question: "What time of day are animals most active?",
      recommended_archetype: "activity_window",
      skip_if: { type: "no_data_signal", signal: "animal_activity_by_hour" },
    }),
    sig({
      question:
        "Which safari zone has the strongest sightings?",
      recommended_archetype: "compare_zones",
      skip_if: {
        type: "no_data_signal",
        signal: "wildlife_encounter_per_circuit",
      },
    }),
  ],
  hiking_trails: [
    sig({
      question:
        "Which trail fits my fitness level?",
      recommended_archetype: "route_profile",
      skip_if: {
        type: "no_data_signal",
        signal: "distance_elevation_duration_per_trail",
      },
    }),
    sig({
      question: "When are trail conditions at their best?",
      recommended_archetype: "conditions_calendar",
      skip_if: {
        type: "no_data_signal",
        signal: "trail_condition_by_month",
      },
    }),
  ],

  /* ---------------- Food & Drink ---------------- */
  food_tours: [
    sig({
      question:
        "How much time do we spend at each stop?",
      recommended_archetype: "time_split",
      skip_if: { type: "no_data_signal", signal: "time_per_named_stop" },
    }),
    sig({
      question: "Which food stops are actually covered?",
      recommended_archetype: "route_profile",
      skip_if: { type: "no_data_signal", signal: "food_stop_route" },
    }),
  ],
  wineries: [
    sig({
      question:
        "When does harvest change the visit?",
      recommended_archetype: "conditions_calendar",
      skip_if: {
        type: "no_data_signal",
        signal: "harvest_window_and_volume_by_month",
      },
    }),
    sig({
      question: "Which tasting tier fits my visit?",
      recommended_archetype: "ticket_ladder",
      skip_if: { type: "no_data_signal", signal: "tasting_tier_inclusions_price" },
    }),
  ],
  cooking_classes: [
    sig({
      question: "Which days have the most class availability?",
      recommended_archetype: "weekly_pattern",
      skip_if: { type: "no_data_signal", signal: "class_availability_by_day" },
    }),
    sig({
      question: "When should I book a class?",
      recommended_archetype: "booking_window",
      skip_if: { type: "no_data_signal", signal: "booking_lead_time" },
    }),
    sig({
      question: "Which class format fits my group?",
      recommended_archetype: "ticket_ladder",
      skip_if: { type: "no_data_signal", signal: "dish_count_and_price_by_tier" },
    }),
    sig({
      question: "Morning or afternoon — which class works better?",
      recommended_archetype: "slot_compare",
      skip_if: { type: "no_data_signal", signal: "class_slot_availability" },
    }),
    sig({
      question:
        "How dietary-friendly are the class options?",
      recommended_archetype: "donut_breakdown",
      notes:
        "Only when the DRD references the dietary mix — otherwise skip rather than invent.",
      skip_if: { type: "no_data_signal", signal: "dietary_mix" },
    }),
  ],
  pub_crawls: [
    sig({
      question:
        "Which night has the best crawl atmosphere?",
      recommended_archetype: "weekly_pattern",
      skip_if: { type: "no_data_signal", signal: "night_demand_by_day_of_week" },
    }),
  ],

  /* ---------------- Wellness ---------------- */
  spa: [
    sig({
      question: "Which days are calmest at the spa?",
      recommended_archetype: "weekly_pattern",
      notes:
        "Use day_notes for weekly cadence quirks (couples nights, ladies-only days).",
      skip_if: { type: "no_data_signal", signal: "spa_occupancy_by_day" },
    }),
    sig({
      question: "Which hours are calmest in wet areas?",
      recommended_archetype: "hourly_heatmap",
      skip_if: { type: "no_data_signal", signal: "wet_area_occupancy_by_hour" },
    }),
    sig({
      question: "Which spa package fits my day?",
      recommended_archetype: "ticket_ladder",
      skip_if: { type: "no_data_signal", signal: "spa_package_inclusions_time" },
    }),
  ],
  baths: [
    sig({
      question: "When are the baths quietest?",
      recommended_archetype: "hourly_heatmap",
      skip_if: { type: "no_data_signal", signal: "wet_area_occupancy_by_hour" },
    }),
    sig({
      question: "Which entry tier gives the right access?",
      recommended_archetype: "ticket_ladder",
      skip_if: {
        type: "no_data_signal",
        signal: "pool_access_inclusions_price",
      },
    }),
  ],

  /* ---------------- Specials ---------------- */
  combos: [
    sig({
      question: "Which included attraction unlocks the value?",
      recommended_archetype: "savings_breakdown",
      skip_if: { type: "no_data_signal", signal: "standalone_price_per_attraction" },
    }),
    sig({
      question: "Which combo tier fits my itinerary?",
      recommended_archetype: "ticket_ladder",
      skip_if: { type: "no_data_signal", signal: "combo_tier_inclusions_value" },
    }),
    sig({
      question: "What do combo buyers actually use?",
      recommended_archetype: "donut_breakdown",
      notes:
        "Only when the DRD reports tier-level sales mix — otherwise drop rather than estimate.",
      skip_if: { type: "no_data_signal", signal: "combo_tier_sales_mix" },
    }),
  ],

  /* ---------------- Sports (spectator) ---------------- */
  formula_1: [
    sig({
      question:
        "Practice, qualifying, or race day?",
      recommended_archetype: "slot_compare",
      skip_if: {
        type: "no_data_signal",
        signal: "attendance_per_session_day",
      },
    }),
    sig({
      question: "Which grandstand zone is best value?",
      recommended_archetype: "seat_value_map",
      skip_if: {
        type: "no_data_signal",
        signal: "price_and_view_per_grandstand",
      },
    }),
    sig({
      question: "How fast do premium sections sell out?",
      recommended_archetype: "ticket_ladder",
      skip_if: { type: "no_data_signal", signal: "days_to_sellout_per_tier" },
    }),
  ],

  /* ---------------- Transport ---------------- */
  airport_transfers: [
    sig({
      question: "When will the transfer take longest?",
      recommended_archetype: "hourly_heatmap",
      skip_if: { type: "no_data_signal", signal: "journey_time_by_hour" },
      notes: "Same curve format, y-axis = journey minutes.",
    }),
    sig({
      question: "Private or shared transfer — what changes?",
      recommended_archetype: "slot_compare",
      skip_if: { type: "no_data_signal", signal: "time_and_price_per_type" },
    }),
  ],
  train_tickets: [
    sig({
      question: "When should I book for better fares?",
      recommended_archetype: "price_curve",
      skip_if: { type: "no_data_signal", signal: "price_by_lead_time" },
      notes:
        "Prefer price_curve for dynamic fares. Use booking_window only when the source is booking-share lead time rather than fare movement.",
    }),
    sig({
      question: "Which departure time is fastest or cheapest?",
      recommended_archetype: "slot_compare",
      skip_if: { type: "no_data_signal", signal: "departure_time_price_duration" },
    }),
  ],
};

/* ========================================================================== */
/* Public API                                                                  */
/* ========================================================================== */

export const SUBCATEGORY_IDS = Object.keys(SUBCATEGORIES) as SubcategoryId[];

export function getSubcategoryMeta(id: SubcategoryId): SubcategoryMeta {
  return SUBCATEGORIES[id];
}

export function getSubcategoryBank(id: SubcategoryId): SubcategoryBank {
  const subcategory = SUBCATEGORIES[id];
  const questions = RAW_BANK[id];
  if (questions && questions.length > 0) {
    return { subcategory, questions, unratified: false };
  }
  // Long-tail or not-yet-curated subcategory — orchestrator will fall back
  // to STANDARD_QUESTIONS only and may bootstrap signature ideas from DRD.
  return { subcategory, questions: [], unratified: true };
}

export function listSubcategories(): SubcategoryMeta[] {
  return SUBCATEGORY_IDS.map((id) => SUBCATEGORIES[id]);
}

export function isKnownSubcategory(id: string): id is SubcategoryId {
  return Object.prototype.hasOwnProperty.call(SUBCATEGORIES, id);
}

/**
 * Long-tail / not-yet-curated subcategory bootstrap. Accepts ANY id; if we
 * don't know it, returns an `unratified: true` bank with only the standard
 * S1-S4 to anchor the orchestrator on.
 */
export function getSubcategoryBankFlexible(
  id: string,
  optionalLabel?: string,
  optionalDescription?: string,
): SubcategoryBank {
  if (isKnownSubcategory(id)) {
    return getSubcategoryBank(id);
  }
  const meta: SubcategoryMeta = {
    id: id as SubcategoryId,
    label: optionalLabel ?? humaniseId(id),
    description:
      optionalDescription ??
      `Long-tail subcategory "${id}" — no curated question bank yet. Bootstrap an unratified set from the DRD.`,
  };
  return { subcategory: meta, questions: [], unratified: true };
}

function humaniseId(id: string): string {
  return id
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
