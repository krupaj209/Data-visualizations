export const BRAND = {
  purps: "#8000FF",
  purpsHover: "#6D00E0",
  purpsSoft: "#F3E8FF",
  candy: "#FF0076",
  candySoft: "#FFE4EF",
  hola: "#FF9800",
  holaSoft: "#FFF1D9",
  joyMustard: "#FFBC00",
  okayGreen: "#15D876",
  subtleGreen: "#CDF280",
  bgMint: "#D2FDEB",
  bgSage: "#DBF9DB",
  bgCream: "#FFF8EF",
  bgBlush: "#FFE4EF",
  bgLilac: "#F3E8FF",
  bgCool: "#E8F1FF",
  bgShell: "#FAF7FF",
  slate950: "#0F0F10",
  slate900: "#222222",
  slate700: "#666666",
  slate500: "#A6A6A6",
  slate300: "#D0D0D0",
  slate200: "#E6E6E9",
  slate100: "#F0F0F0",
  slate50: "#F8F8F8",
} as const;

export type AccentKey = "purps" | "candy" | "hola" | "okay" | "slate";

export const ACCENT_FILL: Record<AccentKey, string> = {
  purps: BRAND.purps,
  candy: BRAND.candy,
  hola: BRAND.hola,
  okay: BRAND.okayGreen,
  slate: BRAND.slate950,
};

export const ACCENT_SOFT: Record<AccentKey, string> = {
  purps: BRAND.purpsSoft,
  candy: BRAND.candySoft,
  hola: BRAND.holaSoft,
  okay: BRAND.bgMint,
  slate: BRAND.slate100,
};

export type LevelKey =
  | "closed"
  | "quietest"
  | "quiet"
  | "busy"
  | "busiest";

export const LEVEL_FILL: Record<LevelKey, string> = {
  closed: "transparent",
  quietest: BRAND.okayGreen,
  quiet: BRAND.subtleGreen,
  busy: BRAND.hola,
  busiest: BRAND.candy,
};

/**
 * Soft-tint companion to LEVEL_FILL. Use this as the *default* bar fill so
 * the chart reads as a calm field of muted color, and reserve the saturated
 * LEVEL_FILL above for the bars that carry an explicit callout pill
 * (Busiest / Quietest). Pick between them with `getLevelFill(level, isCallout)`.
 */
export const LEVEL_FILL_SOFT: Record<LevelKey, string> = {
  closed: "transparent",
  quietest: BRAND.bgMint,
  quiet: BRAND.bgSage,
  busy: BRAND.holaSoft,
  busiest: BRAND.candySoft,
};

export function getLevelFill(level: LevelKey, isCallout: boolean): string {
  if (level === "closed") return "transparent";
  return isCallout ? LEVEL_FILL[level] : LEVEL_FILL_SOFT[level];
}

export const LEVEL_LABEL: Record<LevelKey, string> = {
  closed: "Closed",
  quietest: "Quietest",
  quiet: "Not too busy",
  busy: "Busy",
  busiest: "As busy as it gets",
};

export type SeasonKey =
  | "closed"
  | "very_quiet"
  | "quiet"
  | "moderate"
  | "busy"
  | "peak";

export const SEASON_FILL: Record<SeasonKey, string> = {
  closed: BRAND.slate100,
  very_quiet: BRAND.bgMint,
  quiet: BRAND.bgSage,
  moderate: BRAND.bgCream,
  busy: BRAND.holaSoft,
  peak: BRAND.candySoft,
};

/**
 * Saturated companion to SEASON_FILL for the seasonal bars that carry an
 * explicit callout (Peak / Quietest / Best balance). The default fills above
 * stay soft so the chart reads as a calm field; only callouts pop.
 */
export const SEASON_FILL_ACCENT: Record<SeasonKey, string> = {
  closed: BRAND.slate300,
  very_quiet: BRAND.okayGreen,
  quiet: BRAND.subtleGreen,
  moderate: BRAND.joyMustard,
  busy: BRAND.hola,
  peak: BRAND.candy,
};

export const SEASON_DOT: Record<SeasonKey, string> = {
  closed: BRAND.slate300,
  very_quiet: BRAND.okayGreen,
  quiet: BRAND.subtleGreen,
  moderate: BRAND.joyMustard,
  busy: BRAND.hola,
  peak: BRAND.candy,
};

export const SEASON_LABEL: Record<SeasonKey, string> = {
  closed: "Closed",
  very_quiet: "Very quiet",
  quiet: "Quiet",
  moderate: "Moderate",
  busy: "Busy",
  peak: "Peak",
};

export type ZoneStatusKey =
  | "no_wait"
  | "short"
  | "medium"
  | "long"
  | "very_long"
  | "closed";

export const ZONE_FILL: Record<ZoneStatusKey, string> = {
  no_wait: BRAND.okayGreen,
  short: BRAND.subtleGreen,
  medium: BRAND.joyMustard,
  long: BRAND.hola,
  very_long: BRAND.candy,
  closed: BRAND.slate300,
};

export const ZONE_SOFT: Record<ZoneStatusKey, string> = {
  no_wait: BRAND.bgMint,
  short: BRAND.bgSage,
  medium: BRAND.bgCream,
  long: BRAND.holaSoft,
  very_long: BRAND.candySoft,
  closed: BRAND.slate100,
};

export const ZONE_LABEL: Record<ZoneStatusKey, string> = {
  no_wait: "No wait",
  short: "Short wait",
  medium: "Medium wait",
  long: "Long wait",
  very_long: "Very long wait",
  closed: "Closed",
};

/**
 * Shared spacing/type tokens for the three flagship charts (Tribune density,
 * Daily pattern, Weekly pattern). Keeping these in one place is what makes the
 * charts read as one designed family instead of three independent components.
 *
 * Sizes are clamp() strings that scale with the chart card's container width
 * via container queries (cqi). Charts already declare `containerType: "inline-size"`
 * on their ChartCard wrapper.
 */
export const CHART_TOKENS = {
  /** Reserved strip at the top of the plot area for zone labels + callout pills. */
  headerStripPx: 38,
  /** Vertical breathing room between plot and the x-axis tick row beneath. */
  xAxisStripPx: 22,
  /** Plot horizontal padding so dots/labels don't kiss the card edge. */
  plotInsetX: 8,

  /** y-axis & x-axis tick label type scale. */
  axisLabel: {
    fontSize: "clamp(9px, 0.95cqi, 11px)" as const,
    fontWeight: 700 as const,
  },
  /** Zone band labels (Best / Peak / Quiet start / etc.). */
  zoneLabel: {
    fontSize: "clamp(10px, 1.1cqi, 13px)" as const,
    fontWeight: 800 as const,
  },
  /** Pill (e.g. Busiest, Quietest, Tour groups arrive). */
  pill: {
    fontSize: "clamp(9px, 1cqi, 11px)" as const,
    fontWeight: 800 as const,
    paddingY: 4,
    paddingX: 10,
    radius: 999,
  },
  /** Dot diameter and label offset. */
  dot: {
    diameter: 8,
    /** vertical offset for the small numeric label above each dot. */
    labelOffset: 9,
  },
  /** Inline label that hangs above each data dot (the small "10" numerals). */
  dotLabel: {
    fontSize: "clamp(9px, 1cqi, 12px)" as const,
    fontWeight: 700 as const,
  },
} as const;
