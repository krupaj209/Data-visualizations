import type {
  AccentKey,
  LevelKey,
  SeasonKey,
  ZoneStatusKey,
} from "./brand";

export type DayCode = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type MonthCode =
  | "jan"
  | "feb"
  | "mar"
  | "apr"
  | "may"
  | "jun"
  | "jul"
  | "aug"
  | "sep"
  | "oct"
  | "nov"
  | "dec";

export const DAY_LABELS: Record<DayCode, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export const DAY_FULL: Record<DayCode, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const DAY_ORDER: DayCode[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

export const MONTH_LABELS: Record<MonthCode, string> = {
  jan: "Jan",
  feb: "Feb",
  mar: "Mar",
  apr: "Apr",
  may: "May",
  jun: "Jun",
  jul: "Jul",
  aug: "Aug",
  sep: "Sep",
  oct: "Oct",
  nov: "Nov",
  dec: "Dec",
};

export const MONTH_ORDER: MonthCode[] = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

export interface WeeklyPatternSpec {
  type: "weekly_pattern";
  days: {
    day: DayCode;
    level: LevelKey;
    score: number;
    /**
     * Optional short label shown when the day is selected/locked, e.g.
     * "Closed", "Quietest open day", "Tour-group heavy".
     */
    note?: string;
  }[];
  /** Optional day-of-week chips rendered under the chart. */
  day_notes?: { label: string; kind: "closed" | "free" | "info" }[];
}

export interface HourlyHeatmapSpec {
  type: "hourly_heatmap";
  open_hour: number;
  close_hour: number;
  rows: { day: DayCode; hours: number[]; closed: boolean }[];
  best_window?: {
    label: string;
    day: DayCode;
    start_hour: number;
    end_hour: number;
  };
  /**
   * Optional "when to go and why" highlight cards rendered under the
   * heatmap. Hidden in compact mode.
   */
  highlight_cards?: {
    kind:
      | "quietest_hours"
      | "best_photography"
      | "best_weather"
      | "fastest_entry"
      | "best_evening"
      | "best_off_season";
    headline: string;
    detail: string;
  }[];
}

export interface MonthCalendarSpec {
  type: "month_calendar";
  start_date: string;
  days: {
    date: string;
    score: number;
    status: SeasonKey;
    label?: string;
  }[];
  recommended_dates: { date: string; reason: string }[];
}

export interface BookingWindowSpec {
  type: "booking_window";
  curve: { days_before: number; share: number }[];
  sweet_spot: {
    days_before_min: number;
    days_before_max: number;
    label: string;
  };
  sold_out_risk?: { threshold_days: number; message: string };
}

export interface StatGridSpec {
  type: "stat_grid";
  stats: {
    label: string;
    value: string;
    unit?: string;
    delta?: string;
    accent?: AccentKey;
    sparkline?: number[];
    footnote?: string;
  }[];
}

export interface CompareZonesSpec {
  type: "compare_zones";
  metric_label: string;
  zones: {
    name: string;
    emoji?: string;
    wait_min: number;
    wait_max: number;
    status: ZoneStatusKey;
    tip?: string;
    share_of_visitors?: number;
  }[];
}

export interface DonutBreakdownSpec {
  type: "donut_breakdown";
  center_value: string;
  center_label: string;
  segments: { label: string; value: number; accent?: AccentKey }[];
}

export interface SeasonalCurveSpec {
  type: "seasonal_curve";
  months: {
    month: MonthCode;
    score: number;
    status: SeasonKey;
    note?: string;
    /** Optional 0–100 weather quality score; higher = better weather. */
    weather_score?: number;
    /** Optional 0–100 price pressure score; higher = more expensive. */
    price_score?: number;
  }[];
  best_months: string[];
  worst_months: string[];
  /** Optional calendar-fact chips rendered under the chart. */
  calendar_notes?: { label: string; kind: "closed" | "free" | "info" }[];
  /** Optional one-sentence insights surfaced beneath the chart per active metric. */
  metric_insights?: {
    crowd?: string;
    weather?: string;
    price?: string;
  };
}

export interface TicketLadderSpec {
  type: "ticket_ladder";
  currency: string;
  tiers: {
    name: string;
    price: number;
    includes: string[];
    recommended: boolean;
    share?: number;
    wait_savings_min?: number;
  }[];
}

/** Smooth daily-pattern curve with Best/Peak/2nd best zone backgrounds. */
export interface DailyPatternSpec {
  type: "daily_pattern";
  /** Time-of-day points. `time` is "HH:MM" 24h. `crowd` is 0–10. */
  points: { time: string; crowd: number }[];
  /** Background zones, in display order. Edges given in "HH:MM" 24h. */
  zones: {
    label: string;
    tone: "best" | "peak" | "second_best";
    start: string;
    end: string;
  }[];
  /** Optional caption pill at the bottom (e.g., "Opens 8:15am · Last entry 6:20pm"). */
  caption?: { opens?: string; last_entry?: string };
}

/** Annotated peak-season crowd density line (e.g. "Tribune only"). */
export interface TribuneDensitySpec {
  type: "tribune_density";
  /** Which area / scope is this measuring. Shown as small caption. */
  scope: string;
  /** Y-axis label, e.g. "Crowd density in Tribune". */
  y_label: string;
  /** Data points, "HH:MM" 24h, 0–10 density. */
  points: { time: string; density: number }[];
  /** Three colored zone backgrounds spanning time ranges. */
  zones: {
    label: string;
    tone: "quiet" | "packed" | "second_window";
    start: string;
    end: string;
  }[];
  /** Optional callout pill anchored at a specific time/value. */
  arrow_callout?: {
    label: string;
    /** "HH:MM" 24h — anchors the arrow tip to this point. */
    at: string;
    /** Optional secondary helper text near the start of the zone. */
    helper?: string;
  };
  /** Bottom row of context pills. */
  context_pills: {
    icon: "calendar" | "people" | "people_full" | "sun" | "clock";
    title: string;
    subtitle: string;
    tone: "candy" | "okay" | "purps";
    /**
     * Optional focus target — when provided, clicking this pill locks the
     * matching time (or time range) on the curve. Times are "HH:MM" 24h.
     */
    focus?: { at?: string; start?: string; end?: string };
  }[];
}

/** 5-row visitor-profile horizontal time bars with persona icons. */
export interface DurationProfilesSpec {
  type: "duration_profiles";
  /** Headline value, e.g. "Most visitors stay 60–90 minutes". */
  headline: string;
  /** Tick stops on the time scale (minutes). */
  scale_min: { label: string; minutes: number }[];
  profiles: {
    name: string;
    icon: "stopwatch" | "head" | "column" | "lyre" | "bust" | "bench";
    /** Inclusive range in minutes (max may equal min for a single value). */
    range_min: number;
    range_max: number;
    note?: string;
    /** Highlight as the recommended/most-common profile. */
    highlight?: boolean;
    /** Long-form description shown in the locked detail panel. */
    description?: string;
    /** What this profile typically skips, shown as a pill in the locked panel. */
    skips?: string;
    /** Recommended lane / route, shown as a pill in the locked panel. */
    lane?: string;
  }[];
  /** Optional candy-pill tip at the bottom. */
  tip?: string;
}

/** 4-lane entrance comparison shown as colored dot grids. */
export interface EntranceLanesSpec {
  type: "entrance_lanes";
  /** Title strip, e.g. "Accademia Gallery entrance". */
  venue_label: string;
  /** Sub-strip caption, e.g. "All four lanes share the same doorway". */
  shared_caption: string;
  lanes: {
    name: string;
    /** Tag pill text, e.g. "10–20 min", "Variable", "Priority". */
    wait_label: string;
    tone: "candy" | "purps" | "okay" | "slate";
    /** Number of dots to render — visualises relative wait length. */
    dots: number;
    /** Whether the box should have a dashed (vs solid) border. */
    dashed?: boolean;
    /** Who this lane is for. Shown when the lane is locked/expanded. */
    who?: string;
    /** Typical peak-season wait shown in the expanded detail. */
    wait_peak?: string;
    /** Typical off-peak wait shown in the expanded detail. */
    wait_off_peak?: string;
    /** What to book or where to queue, shown in the expanded detail. */
    how?: string;
  }[];
}

/** Ranked horizontal "what visitors pair with" bars. */
export interface CoBookingsSpec {
  type: "co_bookings";
  items: {
    name: string;
    /** % of visitors who also book this. */
    share: number;
    /** Optional small badge under the name, e.g. "Top pairing". */
    badge?: string;
    /** Lucide icon name to draw inside the rank circle. */
    icon:
      | "landmark"
      | "church"
      | "castle"
      | "building"
      | "trees"
      | "gem";
    /** Suggested pairing copy shown in the locked detail panel. */
    pairing?: string;
    /** Walking-distance hint shown as a pill in the locked panel. */
    walk?: string;
    /** Whether the pair is included in the same library/bundle. */
    on_library?: string;
  }[];
  /** How many top items to highlight in solid Purps (rest stay pale). */
  highlight_top?: number;
}

/** Zone × hour grid with 0-100 crowd scores per cell. Museums, aquariums. */
export interface ZoneCrowdHeatmapSpec {
  type: "zone_crowd_heatmap";
  open_hour: number;
  close_hour: number;
  zones: { name: string; emoji?: string; hours: number[] }[];
  best_window?: {
    label: string;
    zone: string;
    start_hour: number;
    end_hour: number;
  };
}

/** Zone × hour grid with wait minutes per cell. Theme parks. */
export interface ZoneWaitHeatmapSpec {
  type: "zone_wait_heatmap";
  open_hour: number;
  close_hour: number;
  unit: string;
  zones: { name: string; emoji?: string; hours: number[] }[];
  best_window?: {
    label: string;
    zone: string;
    start_hour: number;
    end_hour: number;
  };
}

/** Month × departure-slot matrix marking golden-hour alignment. Photography tours. */
export interface GoldenHourMatchSpec {
  type: "golden_hour_match";
  location_label: string;
  slots: { label: string }[];
  months: {
    month: MonthCode;
    cells: { aligned: boolean; sub_rating?: number }[];
  }[];
  helper?: string;
}

export type SeatTier =
  | "stalls"
  | "circle"
  | "upper_circle"
  | "balcony"
  | "box"
  | "gallery";

/** v3 specialty: city-card / combo savings vs standalone gate prices. */
export interface SavingsBreakdownSpec {
  type: "savings_breakdown";
  currency: string;
  card_price: number;
  card_label: string;
  attractions: {
    name: string;
    standalone_price: number;
    /** % of cardholders who actually use this attraction. */
    usage_rate?: number;
  }[];
}

/** v3 specialty: port-of-call return-buffer ranking vs ship departure. */
export interface ReturnBufferRankSpec {
  type: "return_buffer_rank";
  ship_departure_time: string;
  options: {
    name: string;
    /** Minutes between scheduled return and ship departure (positive = safe). */
    buffer_minutes: number;
    notes?: string;
  }[];
}

/** v3 specialty: theatre seat-value map (section-level only). */
export interface SeatValueMapSpec {
  type: "seat_value_map";
  currency: string;
  venue_label?: string;
  /** Tiers in top-down display order. */
  layout: SeatTier[];
  sections: {
    name: string;
    tier: SeatTier;
    price: number;
    sightline_score: number;
    value_score: number;
    note?: string;
  }[];
  best_section?: string;
}

/** v3 specialty: helicopter / cruise optimal-departure rating. */
export interface OptimalDepartureSpec {
  type: "optimal_departure";
  /** Must match one slots[].id. */
  recommended_slot: string;
  slots: {
    id: string;
    name: string;
    light_quality: number;
    conditions: number;
    /** LOWER is better; 100 = packed. */
    crowd_level: number;
    note?: string;
  }[];
}

/** v3 specialty: hop-on-hop-off bus stop frequency / headway by stop. */
export interface StopFrequencySpec {
  type: "stop_frequency";
  route_label?: string;
  stops: {
    name: string;
    peak_headway_min: number;
    offpeak_headway_min: number;
    note?: string;
  }[];
}

export interface RouteProfileSpec {
  type: "route_profile";
  route_label: string;
  mode: "cruise" | "bus" | "walk" | "day_trip" | "transfer" | "other";
  distance_km?: number;
  total_duration_min?: number;
  headline_metric?: string;
  stops: {
    name: string;
    kind: "start" | "landmark" | "transfer" | "stop" | "end";
    duration_from_start_min?: number;
    landmark_count?: number;
    note?: string;
    highlight?: boolean;
  }[];
  best_for?: string[];
  callout?: string;
}

/**
 * Promoted Accademia bespokes (Task #33). Same shapes as
 * EntranceLanesSpec / DurationProfilesSpec — the renderers wrap the
 * bespoke components so writers can author one canonical archetype that
 * works on any CE, not just the curated Florence cluster. Older rows in
 * the DB stay valid under the legacy discriminators above.
 */
export interface QueueCompareSpec {
  type: "queue_compare";
  venue_label: string;
  shared_caption: string;
  lanes: EntranceLanesSpec["lanes"];
}

export interface DurationStatSpec {
  type: "duration_stat";
  headline: string;
  scale_min: DurationProfilesSpec["scale_min"];
  profiles: DurationProfilesSpec["profiles"];
  tip?: string;
}

/** Smooth hourly curve for a single named subject (ride / activity). */
export interface RideWaitCurveSpec {
  type: "ride_wait_curve";
  /** What the curve is measuring, e.g. "Tron Lightcycle Run". */
  subject: string;
  /** Y-axis label, e.g. "Wait (min)". */
  y_label: string;
  /** Unit suffix shown on tooltips, e.g. "min". */
  unit: string;
  open_hour: number;
  close_hour: number;
  /** 24 entries (hour 0..23). Closed hours just sit at 0. */
  hours: { hour: number; value: number }[];
  zones: {
    label: string;
    tone: "best" | "peak" | "second_best";
    start_hour: number;
    end_hour: number;
  }[];
  insight?: string;
}

/** Same curve treatment as RideWaitCurve, used for activity index curves. */
export interface ActivityWindowSpec {
  type: "activity_window";
  subject: string;
  y_label: string;
  unit: string;
  open_hour: number;
  close_hour: number;
  hours: { hour: number; value: number }[];
  zones: {
    label: string;
    tone: "best" | "peak" | "second_best";
    start_hour: number;
    end_hour: number;
  }[];
  insight?: string;
}

/** Horizontal ranked-bar of named subjects, sorted shortest to longest. */
export interface OpeningHourRankSpec {
  type: "opening_hour_rank";
  subject_label: string;
  unit: string;
  hour_label: string;
  bands: { green_max: number; amber_max: number };
  subjects: { name: string; wait_minutes: number; note?: string }[];
  insight?: string;
}

/* -------------------------------------------------------------------------- *
 * v3 — calendar & seasonal family                                            *
 * Four sibling 12-month archetypes that swap crowd volume for a different    *
 * decision signal: physical conditions, sighting probability, departure     *
 * reliability, or price.                                                    *
 * -------------------------------------------------------------------------- */

export type ConditionsMetric =
  | "snow_depth_cm"
  | "visibility_m"
  | "swell_m"
  | "river_flow_index"
  | "harvest_intensity"
  | "temperature_c";

export type ConditionsStatus =
  | "closed"
  | "poor"
  | "fair"
  | "good"
  | "optimal"
  | "expert";

export interface ConditionsCalendarSpec {
  type: "conditions_calendar";
  metric: ConditionsMetric;
  unit_label: string;
  metric_label: string;
  months: {
    month: MonthCode;
    value: number;
    status: ConditionsStatus;
    note?: string;
    icons?: string[];
  }[];
  reference_bands?: {
    label: string;
    min: number;
    max: number;
    tone: Exclude<ConditionsStatus, "closed">;
  }[];
  best_months: string[];
  worst_months: string[];
}

export interface SightingProbabilitySpec {
  type: "sighting_probability";
  display: "single" | "grouped" | "stacked";
  series: {
    name: string;
    accent?: AccentKey;
    monthly: number[];
  }[];
  confidence_note?: string;
  best_months: string[];
  worst_months: string[];
}

export interface DepartureReliabilitySpec {
  type: "departure_reliability";
  months: {
    month: MonthCode;
    pct_ran: number;
    cancellation_reasons?: { reason: string; share: number }[];
    note?: string;
  }[];
  target_pct?: number;
  best_months: string[];
  worst_months: string[];
}

export interface PriceCurveSpec {
  type: "price_curve";
  currency: string;
  base_value: number;
  base_label?: string;
  points: {
    month: MonthCode;
    index: number;
    note?: string;
  }[];
  cheapest_months: string[];
  priciest_months: string[];
}

/** Horizontal day-timeline (open → close) with pinned fixed events. */
export interface DailyProgrammeSpec {
  type: "daily_programme";
  /** "HH:MM" 24h. */
  open_time: string;
  /** "HH:MM" 24h. */
  close_time: string;
  events: {
    name: string;
    /** "HH:MM" 24h. */
    start_time: string;
    duration_min: number;
    location: string;
    /** 0–100; higher = fills up first. */
    popularity: number;
    icon?:
      | "feeding"
      | "show"
      | "talk"
      | "prayer"
      | "tour"
      | "ceremony"
      | "encounter"
      | "demo";
    note?: string;
  }[];
  /** Exact `name` of an event to spotlight. */
  highlight_event?: string;
}

/** Stacked horizontal bar splitting a tour's total time across categories. */
export interface TimeSplitSpec {
  type: "time_split";
  total_min: number;
  total_label?: string;
  segments: {
    label: string;
    minutes: number;
    accent: AccentKey;
    note?: string;
    /**
     * When true, the segment renders as a skippable add-on (dashed
     * outline + softened fill). Used by combo-ticket visits where some
     * sub-sites are optional extensions on a shared ticket.
     */
    optional?: boolean;
  }[];
  callout?: string;
}

/** Chronological narrative timeline for historical attractions. */
export interface HistoryTimelineSpec {
  type: "history_timeline";
  span_label: string;
  events: {
    date_label: string;
    sort_year: number;
    title: string;
    era:
      | "origins"
      | "construction"
      | "spectacle"
      | "decline"
      | "reuse"
      | "restoration"
      | "modern";
    description: string;
    metric_label?: string;
    metric_value?: string;
  }[];
  highlight_event?: string;
  callout?: string;
}

/** 2–3 named time slots compared on 3–5 dimensions (grouped horizontal bars). */
export interface SlotCompareSpec {
  type: "slot_compare";
  slots: {
    name: string;
    /** Optional clock window like "5:00–7:30 am". */
    time_window?: string;
    accent: AccentKey;
    recommended: boolean;
  }[];
  dimensions: {
    label: string;
    /** One 0–100 score per slot, in slot order. */
    scores: number[];
  }[];
  insight?: string;
}

export type ChartSpec =
  | WeeklyPatternSpec
  | HourlyHeatmapSpec
  | MonthCalendarSpec
  | BookingWindowSpec
  | StatGridSpec
  | CompareZonesSpec
  | DonutBreakdownSpec
  | SeasonalCurveSpec
  | ConditionsCalendarSpec
  | SightingProbabilitySpec
  | DepartureReliabilitySpec
  | PriceCurveSpec
  | TicketLadderSpec
  | DailyPatternSpec
  | TribuneDensitySpec
  | DurationProfilesSpec
  | EntranceLanesSpec
  | CoBookingsSpec
  | ZoneCrowdHeatmapSpec
  | ZoneWaitHeatmapSpec
  | GoldenHourMatchSpec
  | SavingsBreakdownSpec
  | ReturnBufferRankSpec
  | SeatValueMapSpec
  | OptimalDepartureSpec
  | StopFrequencySpec
  | RouteProfileSpec
  | QueueCompareSpec
  | DurationStatSpec
  | RideWaitCurveSpec
  | ActivityWindowSpec
  | OpeningHourRankSpec
  | DailyProgrammeSpec
  | TimeSplitSpec
  | HistoryTimelineSpec
  | SlotCompareSpec
  | TicketAccessMatrixSpec
  | DurationBudgetSpec
  | LandmarkCoverageSpec
  | ItineraryFlowSpec
  | BestForMatrixSpec
  | SeasonWeatherFitSpec
  | EntranceMapSpec
  | FloorPlanFlowSpec
  | RulesChecklistSpec
  | TransitOptionsSpec
  | TimeValueMatrixSpec
  | AccessibilityGuideSpec;

/* ========================================================================== */
/* Task #92 page-type chart specs                                              */
/* ========================================================================== */

export type EntranceStatus =
  | "recommended"
  | "avoid"
  | "groups"
  | "accessible"
  | "closed"
  | "standard";

export interface EntranceMapSpec {
  type: "entrance_map";
  venue_label?: string;
  entrances: {
    name: string;
    status: EntranceStatus;
    wait_label?: string;
    best_for?: string[];
    accent?: AccentKey;
    note?: string;
  }[];
  callout?: string;
}

export interface FloorPlanFlowSpec {
  type: "floor_plan_flow";
  start_label?: string;
  total_min?: number;
  stops: {
    name: string;
    level?: string;
    kind: "start" | "highlight" | "stop" | "end";
    dwell_min?: number;
    accent?: AccentKey;
    note?: string;
  }[];
  callout?: string;
}

export type RulesSeverity = "allowed" | "restricted" | "prohibited" | "required";
export type RulesCategory =
  | "items"
  | "dress"
  | "behavior"
  | "security"
  | "photography"
  | "food"
  | "other";

export interface RulesChecklistSpec {
  type: "rules_checklist";
  headline?: string;
  items: {
    label: string;
    severity: RulesSeverity;
    category: RulesCategory;
    note?: string;
  }[];
  source_note?: string;
}

export type TransitMode =
  | "metro"
  | "bus"
  | "tram"
  | "train"
  | "walk"
  | "taxi"
  | "car"
  | "ferry"
  | "shuttle";

export interface TransitOptionsSpec {
  type: "transit_options";
  origin_label?: string;
  destination_label?: string;
  options: {
    mode: TransitMode;
    label: string;
    minutes_min: number;
    minutes_max: number;
    cost_label?: string;
    frequency_label?: string;
    walk_min?: number;
    accent?: AccentKey;
    recommended?: boolean;
    note?: string;
  }[];
  callout?: string;
}

export interface TimeValueMatrixSpec {
  type: "time_value_matrix";
  currency?: string;
  scenarios: {
    id: string;
    label: string;
    accent: AccentKey;
    time_label?: string;
    price_label?: string;
    note?: string;
  }[];
  dimensions: {
    label: string;
    /** One 0-100 score per scenario, in scenario order. */
    scores: number[];
    note?: string;
  }[];
  summary: {
    /** Must match one of scenarios[].id. */
    best_value_scenario: string;
    headline?: string;
  };
  insight?: string;
}

export type AccessAvailability = "full" | "partial" | "none" | "on_request";
export type AccessCategory =
  | "mobility"
  | "sensory"
  | "cognitive"
  | "services"
  | "facilities";

export interface AccessibilityGuideSpec {
  type: "accessibility_guide";
  headline?: string;
  features: {
    label: string;
    category: AccessCategory;
    availability: AccessAvailability;
    detail?: string;
  }[];
  contact?: string;
  callout?: string;
}

/* ========================================================================== */
/* Task #67 v3 promoted archetypes                                             */
/* ========================================================================== */

export type TicketAccessCell =
  | { state: "included" }
  | { state: "excluded" }
  | { state: "extra"; extra_price?: number; label?: string }
  | { state: "limited"; label?: string };

export interface TicketAccessMatrixSpec {
  type: "ticket_access_matrix";
  currency: string;
  tiers: {
    name: string;
    price: number;
    accent?: AccentKey;
    recommended?: boolean;
    note?: string;
  }[];
  features: {
    label: string;
    /** One cell per tier, in tier order. */
    cells: TicketAccessCell[];
    note?: string;
  }[];
  insight?: string;
}

export type DurationBudgetBadge = "skip_if_tight" | "extend_if_deep_dive";

export interface DurationBudgetSpec {
  type: "duration_budget";
  total_min: number;
  total_label?: string;
  blocks: {
    label: string;
    minutes: number;
    accent: AccentKey;
    badge?: DurationBudgetBadge;
    note?: string;
  }[];
  tip?: string;
}

export type LandmarkCoverageCell =
  | "covered"
  | "near"
  | "view_only"
  | "none";

export interface LandmarkCoverageSpec {
  type: "landmark_coverage";
  route_label?: string;
  routes: {
    name: string;
    accent?: AccentKey;
    recommended?: boolean;
    note?: string;
  }[];
  landmarks: {
    name: string;
    kind: "icon" | "highlight" | "standard";
    /** One coverage state per route, in route order. */
    coverage: LandmarkCoverageCell[];
    note?: string;
  }[];
  best_for?: string[];
  callout?: string;
}

export interface ItineraryFlowSpec {
  type: "itinerary_flow";
  mode: "walk" | "bus" | "boat" | "mixed" | "day_trip";
  total_duration_min?: number;
  stops: {
    name: string;
    kind: "start" | "stop" | "highlight" | "end";
    dwell_min?: number;
    note?: string;
  }[];
  /** EXACTLY stops.length - 1 entries — one per gap between consecutive stops. */
  transits: {
    minutes: number;
    mode?: "walk" | "bus" | "boat" | "mixed" | "transfer";
    note?: string;
  }[];
  callout?: string;
}

export interface BestForMatrixSpec {
  type: "best_for_matrix";
  facets: {
    name: string;
    note?: string;
    /** Optional override of the auto-computed top audience for this facet. */
    top_audience_index?: number;
  }[];
  audiences: {
    label: string;
    accent: AccentKey;
    /** One score 0-100 per facet, in facet order. */
    scores: number[];
    note?: string;
  }[];
  insight?: string;
}

export type SeasonStatus = "closed" | "poor" | "fair" | "good" | "optimal";

export interface SeasonWeatherFitSpec {
  type: "season_weather_fit";
  activity_label: string;
  dimensions: { name: string; note?: string }[];
  months: {
    month:
      | "jan" | "feb" | "mar" | "apr" | "may" | "jun"
      | "jul" | "aug" | "sep" | "oct" | "nov" | "dec";
    /** One cell per dimension, in dimension order. */
    cells: { score: number; status: SeasonStatus }[];
    overall_status?: SeasonStatus;
    temp_label?: string;
    note?: string;
  }[];
  best_months: string[];
  worst_months: string[];
  helper?: string;
}

/**
 * Evidence-kind taxonomy (Task #63). Mirrors `EvidenceKind` on the server
 * — kept as a string union here so the viz-studio package doesn't need to
 * depend on api-server internals. Legacy provenance rows have no kind
 * tags; renderers must treat missing/unrecognised kinds as "unknown".
 */
export type EvidenceKind =
  | "official"
  | "marketplace"
  | "review"
  | "inferred"
  | "estimate"
  | "unknown";

/** Subset of the chart provenance object the renderers may surface to users. */
export interface ChartProvenanceLite {
  status?: "drd_grounded" | "web_grounded" | "estimated" | string;
  /**
   * Legacy rows store bare strings; new rows from the Task #63 pipeline
   * store the tagged shape. Renderers must accept both.
   */
  drd_snippets?: (string | { text?: string; kind?: string })[];
  web_sources?: { title?: string; url?: string; kind?: string }[];
  estimates?: { field?: string; reasoning?: string; kind?: string }[];
  verifier_notes?: string;
  /**
   * Either bare fact ids (legacy) or tagged refs `{ id, kind }` (Task #63).
   * Both shapes coexist in the wild — counts/UI must accept either.
   */
  intelligence_refs?: (string | { id: string; kind?: string })[];
  /** Task #99 — intent-driven assembler tags every chart with a bundle id,
   *  the visitor intent it answers, the per-CE score the assembler picked
   *  it at, the signals that triggered the bundle, and the page template
   *  the deck was assembled for. All optional for back-compat with v2 rows.
   */
  bundle_id?: string;
  intent_id?: string;
  bundle_score?: number;
  triggering_signals?: string[];
  page_type?: string;
  /** Task #111 — ISO timestamp recorded when the research pipeline
   *  generated this chart's spec. Surfaced in the editorial overlay
   *  freshness badge. Optional for legacy rows. */
  generated_at?: string;
}

const EVIDENCE_KIND_VALUES: readonly EvidenceKind[] = [
  "official",
  "marketplace",
  "review",
  "inferred",
  "estimate",
  "unknown",
];

function asKind(v: unknown): EvidenceKind {
  return typeof v === "string" && (EVIDENCE_KIND_VALUES as readonly string[]).includes(v)
    ? (v as EvidenceKind)
    : "unknown";
}

/**
 * Aggregate provenance citations into per-kind counts so writer/embed UIs
 * can render a compact rollup chip group without re-walking the structure
 * in every component. Counts ALL citations across web sources, DRD
 * snippets, and explicit estimates. Legacy untagged citations bucket into
 * "unknown".
 */
export function evidenceKindCounts(
  provenance: ChartProvenanceLite | null | undefined,
): Record<EvidenceKind, number> {
  const counts: Record<EvidenceKind, number> = {
    official: 0,
    marketplace: 0,
    review: 0,
    inferred: 0,
    estimate: 0,
    unknown: 0,
  };
  if (!provenance) return counts;
  for (const s of provenance.web_sources ?? []) {
    counts[asKind(s.kind)] += 1;
  }
  for (const d of provenance.drd_snippets ?? []) {
    if (typeof d === "string") counts.unknown += 1;
    else counts[asKind(d.kind)] += 1;
  }
  for (const e of provenance.estimates ?? []) {
    counts[asKind(e.kind ?? "estimate")] += 1;
  }
  for (const r of provenance.intelligence_refs ?? []) {
    if (typeof r === "string") counts.unknown += 1;
    else counts[asKind(r.kind)] += 1;
  }
  return counts;
}

/** Display metadata for each evidence kind — label + chip colours. */
export const EVIDENCE_KIND_META: Record<
  EvidenceKind,
  { label: string; bg: string; fg: string }
> = {
  official:    { label: "Official",    bg: "#E6F4EA", fg: "#0E8F4E" },
  marketplace: { label: "Marketplace", bg: "#EFE5FF", fg: "#5B21B6" },
  review:      { label: "Review",      bg: "#FFE9F2", fg: "#A8235C" },
  inferred:    { label: "Inferred",    bg: "#FFF4DD", fg: "#A65A00" },
  estimate:    { label: "Estimate",    bg: "#F2F2F4", fg: "#54545C" },
  unknown:     { label: "Unknown",     bg: "#F2F2F4", fg: "#54545C" },
};

export interface ChartHeader {
  title: string;
  subtitle?: string;
  question: string;
  insight?: string;
}
