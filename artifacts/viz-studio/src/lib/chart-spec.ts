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
  days: { day: DayCode; level: LevelKey; score: number; note?: string }[];
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
  months: { month: MonthCode; score: number; status: SeasonKey; note?: string }[];
  best_months: string[];
  worst_months: string[];
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

export type ChartSpec =
  | WeeklyPatternSpec
  | HourlyHeatmapSpec
  | MonthCalendarSpec
  | BookingWindowSpec
  | StatGridSpec
  | CompareZonesSpec
  | DonutBreakdownSpec
  | SeasonalCurveSpec
  | TicketLadderSpec;

export interface ChartHeader {
  title: string;
  subtitle?: string;
  question: string;
  insight?: string;
}
