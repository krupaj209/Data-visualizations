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

export type ChartSpec =
  | WeeklyPatternSpec
  | HourlyHeatmapSpec
  | MonthCalendarSpec
  | BookingWindowSpec
  | StatGridSpec
  | CompareZonesSpec
  | DonutBreakdownSpec
  | SeasonalCurveSpec
  | TicketLadderSpec
  | DailyPatternSpec
  | TribuneDensitySpec
  | DurationProfilesSpec
  | EntranceLanesSpec
  | CoBookingsSpec
  | ZoneCrowdHeatmapSpec
  | ZoneWaitHeatmapSpec
  | GoldenHourMatchSpec;

export interface ChartHeader {
  title: string;
  subtitle?: string;
  question: string;
  insight?: string;
}
