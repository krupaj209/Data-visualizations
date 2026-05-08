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
    question: "When do the crowds show? (weekly view)",
    recommended_archetype: "weekly_pattern",
    kind: "standard",
    topic_id: "crowd_timing",
    skip_if: { type: "drd_flag", flag: "no_crowd_variability" },
    notes:
      "Travels with the hourly view (S1b). Drop both together when the DRD flags no crowd variability (private charter, fixed capacity).",
  },
  {
    question: "When do the crowds show? (hourly view)",
    recommended_archetype: "hourly_heatmap",
    kind: "standard",
    topic_id: "crowd_timing",
    skip_if: { type: "drd_flag", flag: "no_crowd_variability" },
    notes:
      "Travels with the weekly view (S1a). Drop both together when the DRD flags no crowd variability.",
  },
  {
    question: "Choose the right entry lane",
    recommended_archetype: "queue_compare",
    kind: "standard",
    skip_if: { type: "no_queue" },
    notes:
      "Skip when the CE has no physical queue (walking tours, cooking classes) or only a single entry lane.",
  },
  {
    question: "How early should you book?",
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
      question: "How do the named viewing levels compare on wait time?",
      recommended_archetype: "zone_wait_compare",
      skip_if: { type: "no_data_signal", signal: "wait_time_per_level" },
    }),
    sig({
      question: "Which ticket tier saves the most queue time?",
      recommended_archetype: "ticket_ladder",
      skip_if: { type: "no_data_signal", signal: "queue_time_by_tier" },
    }),
    sig({
      question: "Which dates in the next 3 months are calmest?",
      recommended_archetype: "month_calendar",
      skip_if: { type: "no_data_signal", signal: "day_level_crowd_index" },
    }),
  ],
  museums: [
    sig({
      question:
        "Which galleries are busiest — and when should you visit each?",
      recommended_archetype: "zone_crowd_heatmap",
      skip_if: {
        type: "no_data_signal",
        signal: "visitor_flow_by_gallery_hour",
      },
    }),
    sig({
      question: "Which ticket tier gives the best access for the price?",
      recommended_archetype: "ticket_ladder",
      skip_if: { type: "no_data_signal", signal: "tier_access_and_price" },
    }),
    sig({
      question: "What share of visitors buy skip-the-line?",
      recommended_archetype: "donut_breakdown",
      skip_if: { type: "no_data_signal", signal: "ticket_type_sales_mix" },
    }),
  ],
  theme_parks: [
    sig({
      question: "When's the best window to ride the headline attraction?",
      recommended_archetype: "ride_wait_curve",
      skip_if: {
        type: "no_data_signal",
        signal: "hourly_wait_for_named_ride",
      },
    }),
    sig({
      question: "Which rides have the shortest waits right at opening?",
      recommended_archetype: "opening_hour_rank",
      skip_if: { type: "no_data_signal", signal: "opening_hour_ride_waits" },
    }),
    sig({
      question:
        "How do wait times compare across the named lands throughout the day?",
      recommended_archetype: "zone_wait_heatmap",
      skip_if: { type: "no_data_signal", signal: "wait_by_zone_hour" },
    }),
    sig({
      question:
        "Which pass tier actually saves the most time — not just money?",
      recommended_archetype: "ticket_ladder",
      skip_if: {
        type: "no_data_signal",
        signal: "wait_savings_by_pass_tier",
      },
    }),
    sig({
      question: "Which dates in the next 3 months are calmest?",
      recommended_archetype: "month_calendar",
      skip_if: { type: "no_data_signal", signal: "day_level_crowd_index" },
    }),
  ],
  water_parks: [
    sig({
      question: "When's the shortest wait for the headline slide?",
      recommended_archetype: "ride_wait_curve",
      skip_if: {
        type: "no_data_signal",
        signal: "hourly_wait_for_named_slide",
      },
    }),
    sig({
      question: "Which slides have the shortest queues at opening?",
      recommended_archetype: "opening_hour_rank",
      skip_if: { type: "no_data_signal", signal: "opening_hour_slide_waits" },
    }),
    sig({
      question: "Which dates in the next 3 months are calmest?",
      recommended_archetype: "month_calendar",
      skip_if: { type: "no_data_signal", signal: "day_level_crowd_index" },
    }),
  ],
  zoos: [
    sig({
      question:
        "When are the feeding and show times — and which fills up fastest?",
      recommended_archetype: "daily_programme",
      skip_if: { type: "no_data_signal", signal: "fixed_event_schedule" },
    }),
    sig({
      question:
        "Which zones are busiest at what time of day — and when to visit each?",
      recommended_archetype: "zone_crowd_heatmap",
      skip_if: { type: "no_data_signal", signal: "visitor_flow_by_zone_hour" },
    }),
  ],
  aquariums: [
    sig({
      question:
        "When are the feeding and dive shows — and which fills up fastest?",
      recommended_archetype: "daily_programme",
      skip_if: { type: "no_data_signal", signal: "fixed_event_schedule" },
    }),
    sig({
      question:
        "Which exhibits peak in crowd, and when is the best time for each?",
      recommended_archetype: "zone_crowd_heatmap",
      skip_if: {
        type: "no_data_signal",
        signal: "visitor_flow_by_exhibit_hour",
      },
    }),
  ],
  observation_decks: [
    sig({
      question: "How do the named viewing levels compare on wait time?",
      recommended_archetype: "zone_wait_compare",
      skip_if: { type: "no_data_signal", signal: "wait_time_per_level" },
    }),
    sig({
      question: "Which ticket tier saves the most queue time?",
      recommended_archetype: "ticket_ladder",
      skip_if: { type: "no_data_signal", signal: "queue_time_by_tier" },
    }),
    sig({
      question: "Which dates in the next 3 months are calmest?",
      recommended_archetype: "month_calendar",
      skip_if: { type: "no_data_signal", signal: "day_level_crowd_index" },
    }),
  ],
  city_cards: [
    sig({
      question:
        "How much do you save vs buying separately — and which attractions drive the value?",
      recommended_archetype: "savings_breakdown",
      skip_if: {
        type: "no_data_signal",
        signal: "standalone_price_per_attraction",
      },
    }),
    sig({
      question: "What do most card holders actually visit?",
      recommended_archetype: "donut_breakdown",
      skip_if: { type: "no_data_signal", signal: "card_redemption_mix" },
    }),
  ],
  religious_sites: [
    sig({
      question: "Which access windows avoid prayer and service times?",
      recommended_archetype: "daily_programme",
      skip_if: { type: "no_data_signal", signal: "service_schedule" },
    }),
    sig({
      question: "Which ticket tier or entry route gets you in fastest?",
      recommended_archetype: "ticket_ladder",
      skip_if: { type: "no_data_signal", signal: "queue_time_by_entry_type" },
    }),
  ],
  immersive_experiences: [
    sig({
      question: "Which time slot gives you the most space to explore?",
      recommended_archetype: "hourly_heatmap",
      skip_if: { type: "no_data_signal", signal: "crowd_by_named_slot" },
    }),
    sig({
      question: "How long does the experience actually run?",
      recommended_archetype: "duration_stat",
      skip_if: { type: "fixed_duration" },
    }),
  ],

  /* ---------------- Tours ---------------- */
  guided_tours: [
    sig({
      question:
        "What share of guests pick private vs shared, and why does it matter?",
      recommended_archetype: "donut_breakdown",
      skip_if: { type: "no_data_signal", signal: "tier_sales_mix" },
    }),
    sig({
      question:
        "How is the time actually split — travel, queuing, and time at the site?",
      recommended_archetype: "time_split",
      skip_if: { type: "no_data_signal", signal: "tour_time_breakdown" },
    }),
  ],
  day_trips: [
    sig({
      question: "How is the day actually split between travel and being there?",
      recommended_archetype: "time_split",
      skip_if: { type: "no_data_signal", signal: "tour_time_breakdown" },
    }),
    sig({
      question:
        "How do the named stops compare on time spent vs visitor interest?",
      recommended_archetype: "zone_wait_compare",
      skip_if: { type: "no_data_signal", signal: "time_and_rating_per_stop" },
    }),
  ],
  hop_on_hop_off: [
    sig({
      question: "How long do you actually wait at each stop?",
      recommended_archetype: "stop_frequency",
      skip_if: { type: "no_data_signal", signal: "headway_by_stop_time" },
    }),
    sig({
      question: "How long does a full loop take on each route?",
      recommended_archetype: "zone_wait_compare",
      skip_if: { type: "no_data_signal", signal: "loop_time_per_route" },
    }),
  ],
  walking_tours: [
    // CARRIED OVER FROM v2 BANK VERBATIM — v3 rewrite is a follow-up.
    sig({
      question: "Which day of the week is the route quietest?",
      recommended_archetype: "weekly_pattern",
      legacy: true,
    }),
    sig({
      question: "Which months balance good weather with lighter foot traffic?",
      recommended_archetype: "seasonal_curve",
      notes: "Weather is the dominant axis here — populate weather_score.",
      legacy: true,
    }),
    sig({
      question: "How do the tour themes compare on length and price?",
      recommended_archetype: "ticket_ladder",
      legacy: true,
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
  ],
  multi_day_tours: [
    sig({
      question: "How is time split across the named destinations?",
      recommended_archetype: "zone_wait_compare",
      skip_if: { type: "no_data_signal", signal: "hours_per_destination" },
    }),
    sig({
      question: "How does pricing vary by departure date?",
      recommended_archetype: "price_curve",
      skip_if: { type: "no_data_signal", signal: "price_by_departure" },
    }),
  ],
  port_of_call_tours: [
    sig({
      question: "Which tours return to the ship with the safest buffer?",
      recommended_archetype: "return_buffer_rank",
      skip_if: {
        type: "no_data_signal",
        signal: "return_buffer_minutes_per_tour",
      },
    }),
  ],

  /* ---------------- Cruises ---------------- */
  sightseeing_cruises: [
    sig({
      question: "Which departure time gives the best light and views?",
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
        "Which nights are easiest to book, and which almost always sell out?",
      recommended_archetype: "weekly_pattern",
      skip_if: { type: "no_data_signal", signal: "occupancy_by_day_of_week" },
      notes: "Standard chart, dinner-cruise framing.",
    }),
    sig({
      question: "What's included in each tier — and is the premium worth it?",
      recommended_archetype: "ticket_ladder",
      skip_if: { type: "no_data_signal", signal: "inclusions_by_tier" },
    }),
  ],
  whale_watching: [
    sig({
      question: "What are the chances of a sighting on your dates?",
      recommended_archetype: "sighting_probability",
      skip_if: { type: "no_data_signal", signal: "monthly_sighting_rate" },
    }),
    sig({
      question: "What time of day are sightings most commonly reported?",
      recommended_archetype: "hourly_heatmap",
      skip_if: { type: "no_data_signal", signal: "sighting_frequency_by_hour" },
      notes: "Same curve format, y-axis = sighting frequency not crowd.",
    }),
  ],

  /* ---------------- Entertainment ---------------- */
  plays: [
    sig({
      question: "Which seats are worth the premium — and which aren't?",
      recommended_archetype: "seat_value_map",
      skip_if: {
        type: "no_data_signal",
        signal: "price_and_sightline_per_section",
      },
    }),
    sig({
      question: "Which performance days have the most availability?",
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
        "Floor vs seated — how do the zones compare on price, view, and energy?",
      recommended_archetype: "zone_wait_compare",
      skip_if: {
        type: "no_data_signal",
        signal: "price_and_experience_per_zone",
      },
    }),
    sig({
      question: "How fast do floor and pit sections sell out from on-sale?",
      recommended_archetype: "ticket_ladder",
      skip_if: { type: "no_data_signal", signal: "days_to_sellout_per_tier" },
    }),
  ],
  nightlife: [
    sig({
      question:
        "What time does it actually peak — and when do the best tables go?",
      recommended_archetype: "hourly_heatmap",
      skip_if: { type: "no_data_signal", signal: "occupancy_through_night" },
    }),
  ],
  live_sports: [
    sig({
      question: "Which fixtures are most in demand this season?",
      recommended_archetype: "month_calendar",
      skip_if: { type: "no_data_signal", signal: "demand_per_fixture" },
    }),
    sig({
      question: "How do the seating zones compare on view and price?",
      recommended_archetype: "zone_wait_compare",
      skip_if: { type: "no_data_signal", signal: "price_and_view_per_zone" },
    }),
  ],

  /* ---------------- Adventure ---------------- */
  desert_safari: [
    sig({
      question: "Sunrise or sunset — which departure actually delivers?",
      recommended_archetype: "slot_compare",
      skip_if: {
        type: "no_data_signal",
        signal: "conditions_per_named_slot",
      },
    }),
  ],
  skydiving: [
    sig({
      question:
        "How reliable are departures — how often do conditions cancel a session?",
      recommended_archetype: "departure_reliability",
      skip_if: {
        type: "no_data_signal",
        signal: "monthly_session_reliability",
      },
    }),
  ],
  hot_air_balloon: [
    sig({
      question:
        "How reliable are departures — what share of flights actually take off?",
      recommended_archetype: "departure_reliability",
      skip_if: {
        type: "no_data_signal",
        signal: "monthly_flight_reliability",
      },
    }),
    sig({
      question:
        "Which departure time (sunrise vs later) is most popular?",
      recommended_archetype: "slot_compare",
      skip_if: { type: "no_data_signal", signal: "demand_per_named_slot" },
    }),
  ],
  skiing: [
    sig({
      question: "What are the snow conditions like across the season?",
      recommended_archetype: "conditions_calendar",
      skip_if: {
        type: "no_data_signal",
        signal: "snow_depth_and_quality_by_month",
      },
    }),
    sig({
      question:
        "How do the named runs or areas compare on difficulty and crowd level?",
      recommended_archetype: "zone_wait_compare",
      skip_if: {
        type: "no_data_signal",
        signal: "difficulty_and_crowd_per_run",
      },
    }),
  ],
  go_karting: [
    sig({
      question: "When's the shortest wait to get on track?",
      recommended_archetype: "hourly_heatmap",
      skip_if: { type: "no_data_signal", signal: "track_wait_by_hour" },
      notes: "Same curve format, y-axis = wait minutes.",
    }),
  ],
  outdoor_activities: [
    // CARRIED OVER FROM v2 BANK VERBATIM — v3 rewrite is a follow-up.
    // Wrapped with the new kind/skip_if/legacy shape only.
    sig({
      question: "Which months are in the right weather window?",
      recommended_archetype: "seasonal_curve",
      legacy: true,
    }),
    sig({
      question: "How far in advance do most guests book?",
      recommended_archetype: "booking_window",
      legacy: true,
    }),
    sig({
      question: "How do the difficulty/duration tiers compare?",
      recommended_archetype: "ticket_ladder",
      legacy: true,
    }),
  ],

  /* ---------------- Aerial ---------------- */
  helicopter_tours: [
    sig({
      question:
        "Which time of day gives the clearest visibility and best light for photos?",
      recommended_archetype: "optimal_departure",
      skip_if: {
        type: "no_data_signal",
        signal: "visibility_and_light_per_slot",
      },
    }),
  ],
  cable_car_tours: [
    sig({
      question: "When's the shortest queue to board?",
      recommended_archetype: "hourly_heatmap",
      skip_if: { type: "no_data_signal", signal: "queue_length_by_hour" },
    }),
    sig({
      question: "Which months give the best summit visibility?",
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
        "When is visibility at its best — and what marine life can you expect?",
      recommended_archetype: "conditions_calendar",
      skip_if: {
        type: "no_data_signal",
        signal: "visibility_and_species_by_month",
      },
    }),
    sig({
      question:
        "How do the named dive sites compare on depth, current, and marine life?",
      recommended_archetype: "zone_wait_compare",
      skip_if: { type: "no_data_signal", signal: "site_difficulty_and_life" },
    }),
  ],
  surfing: [
    sig({
      question: "When is the swell at its best for this break?",
      recommended_archetype: "conditions_calendar",
      skip_if: {
        type: "no_data_signal",
        signal: "swell_height_and_quality_by_month",
      },
    }),
    sig({
      question:
        "How do the named breaks compare on wave quality and crowd level?",
      recommended_archetype: "zone_wait_compare",
      skip_if: { type: "no_data_signal", signal: "wave_and_crowd_per_break" },
    }),
  ],
  rafting: [
    sig({
      question:
        "When is the river running at its best — and when is it too low or too dangerous?",
      recommended_archetype: "conditions_calendar",
      skip_if: { type: "no_data_signal", signal: "river_flow_by_month" },
    }),
  ],

  /* ---------------- Nature & Wildlife ---------------- */
  safari: [
    sig({
      question:
        "Which months give you the best chance of seeing the headline species?",
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
        "How do the named circuits or zones compare on wildlife density?",
      recommended_archetype: "zone_wait_compare",
      skip_if: {
        type: "no_data_signal",
        signal: "wildlife_encounter_per_circuit",
      },
    }),
  ],
  hiking_trails: [
    sig({
      question:
        "How do the named trails compare on distance, elevation, and typical duration?",
      recommended_archetype: "zone_wait_compare",
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
        "How is the tour time split across the stops — and which stop takes longest?",
      recommended_archetype: "time_split",
      skip_if: { type: "no_data_signal", signal: "time_per_named_stop" },
    }),
  ],
  wineries: [
    sig({
      question:
        "Which months align with harvest — and how does that change the visit?",
      recommended_archetype: "conditions_calendar",
      skip_if: {
        type: "no_data_signal",
        signal: "harvest_window_and_volume_by_month",
      },
    }),
  ],
  cooking_classes: [
    // CARRIED OVER FROM v2 BANK VERBATIM — v3 rewrite is a follow-up.
    sig({
      question: "Which day of the week has the most class availability?",
      recommended_archetype: "weekly_pattern",
      legacy: true,
    }),
    sig({
      question: "How far in advance do guests typically book?",
      recommended_archetype: "booking_window",
      legacy: true,
    }),
    sig({
      question: "How do the class tiers compare on dish count and price?",
      recommended_archetype: "ticket_ladder",
      legacy: true,
    }),
    sig({
      question:
        "What share of guests pick veggie or dietary-flexible classes?",
      recommended_archetype: "donut_breakdown",
      notes:
        "Only when the DRD references the dietary mix — otherwise skip rather than invent.",
      legacy: true,
    }),
  ],
  pub_crawls: [
    sig({
      question:
        "Which night of the week has the best atmosphere and most stops open?",
      recommended_archetype: "weekly_pattern",
      skip_if: { type: "no_data_signal", signal: "night_demand_by_day_of_week" },
    }),
  ],

  /* ---------------- Wellness ---------------- */
  spa: [
    // CARRIED OVER FROM v2 BANK VERBATIM — v3 rewrite is a follow-up.
    sig({
      question: "Which day of the week is least crowded at the spa?",
      recommended_archetype: "weekly_pattern",
      notes:
        "Use day_notes for weekly cadence quirks (couples nights, ladies-only days).",
      legacy: true,
    }),
    sig({
      question: "Which hour of the day is calmest in the wet areas?",
      recommended_archetype: "hourly_heatmap",
      legacy: true,
    }),
    sig({
      question: "How do the package tiers compare on inclusions and time?",
      recommended_archetype: "ticket_ladder",
      legacy: true,
    }),
  ],
  baths: [
    sig({
      question: "When is the bathing area at its quietest?",
      recommended_archetype: "hourly_heatmap",
      skip_if: { type: "no_data_signal", signal: "wet_area_occupancy_by_hour" },
    }),
    sig({
      question: "How do the entry tiers compare on pool access and price?",
      recommended_archetype: "ticket_ladder",
      skip_if: {
        type: "no_data_signal",
        signal: "pool_access_inclusions_price",
      },
    }),
  ],

  /* ---------------- Specials ---------------- */
  combos: [
    // CARRIED OVER FROM v2 BANK VERBATIM — v3 rewrite is a follow-up.
    sig({
      question: "How do the bundled attractions compare on standalone price?",
      recommended_archetype: "compare_zones",
      notes:
        "Use 'metric_label': 'Standalone ticket price' and put price ranges into wait_min/wait_max as currency units.",
      legacy: true,
    }),
    sig({
      question: "How do the combo tiers compare on inclusions and value?",
      recommended_archetype: "ticket_ladder",
      legacy: true,
    }),
    sig({
      question: "What share of buyers pick each combo tier?",
      recommended_archetype: "donut_breakdown",
      notes:
        "Only when the DRD reports tier-level sales mix — otherwise drop rather than estimate.",
      legacy: true,
    }),
  ],

  /* ---------------- Sports (spectator) ---------------- */
  formula_1: [
    sig({
      question:
        "How do Practice, Qualifying, and Race day compare on crowd size and atmosphere?",
      recommended_archetype: "zone_wait_compare",
      skip_if: {
        type: "no_data_signal",
        signal: "attendance_per_session_day",
      },
    }),
    sig({
      question: "How do the grandstand zones compare on view and price?",
      recommended_archetype: "zone_wait_compare",
      skip_if: {
        type: "no_data_signal",
        signal: "price_and_view_per_grandstand",
      },
    }),
    sig({
      question: "How fast do premium sections sell out from on-sale?",
      recommended_archetype: "ticket_ladder",
      skip_if: { type: "no_data_signal", signal: "days_to_sellout_per_tier" },
    }),
  ],

  /* ---------------- Transport ---------------- */
  airport_transfers: [
    sig({
      question: "How does journey time change depending on when you travel?",
      recommended_archetype: "hourly_heatmap",
      skip_if: { type: "no_data_signal", signal: "journey_time_by_hour" },
      notes: "Same curve format, y-axis = journey minutes.",
    }),
    sig({
      question: "Private vs shared — how do they compare on time and price?",
      recommended_archetype: "zone_wait_compare",
      skip_if: { type: "no_data_signal", signal: "time_and_price_per_type" },
    }),
  ],
  train_tickets: [
    sig({
      question: "How does ticket price change based on when you book?",
      recommended_archetype: "booking_window",
      skip_if: { type: "no_data_signal", signal: "price_by_lead_time" },
      notes: "booking_window variant with price y-axis (not % of bookings).",
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
