import { BRAND } from "./brand";

/**
 * Single source of truth for the Viz Studio chart design language.
 *
 * Every chart imports tokens and primitives from here so two charts placed
 * side-by-side rhyme: same axis-tick size, same callout pill shape, same
 * tooltip rectangle, same legend swatch, same color-rhythm rule.
 *
 * This file documents the unified spec — one decision per axis. If you find
 * yourself reaching for a custom font size or a different pill radius inside
 * a chart, the answer is almost always to extend a token here instead.
 *
 * Pairs with the primitives in `components/charts/system/`:
 *   <ChartTooltip>  — slate-900 pill with edge-clamping
 *   <CalloutPill>   — uniform "Busiest" / "Sweet spot" / "Peak" pill
 *   <Legend> + <LegendItem> + <LegendSwatch> — uniform legend rail
 */

/**
 * Typography scale. Sizes are clamp() expressions that scale via container
 * queries (cqi). Charts already declare `containerType: "inline-size"` on
 * their ChartCard wrapper.
 */
export const CHART_TYPE = {
  /** Subtitle / context line under the title strip. */
  context: {
    fontSize: "clamp(10px, 1.05cqi, 12px)" as const,
    fontWeight: 600 as const,
    color: BRAND.slate500 as string,
  },
  /** Y-axis & x-axis tick labels. Quiet, slate-700, weight 700. */
  axisTick: {
    fontSize: "clamp(9px, 0.95cqi, 11px)" as const,
    fontWeight: 700 as const,
    color: BRAND.slate700 as string,
  },
  /** Day-of-week / month / category labels under bars or columns. */
  catLabel: {
    fontSize: "clamp(10px, 1.15cqi, 13px)" as const,
    fontWeight: 800 as const,
    color: BRAND.slate900 as string,
  },
  /** Numeric label hovering above a dot/bar (e.g. the small "10" numerals). */
  dotLabel: {
    fontSize: "clamp(9px, 1cqi, 12px)" as const,
    fontWeight: 700 as const,
    color: BRAND.slate900 as string,
  },
  /** Zone band label centered above the plot (e.g. "Best", "Peak"). */
  zoneLabel: {
    fontSize: "clamp(10px, 1.1cqi, 13px)" as const,
    fontWeight: 800 as const,
  },
  /** Callout pill text (Busiest / Sweet spot / Best weather / Peak). */
  callout: {
    fontSize: "clamp(9px, 1cqi, 11px)" as const,
    fontWeight: 800 as const,
  },
  /** Hover/focus tooltip text (over slate-900 dark bg). */
  tooltip: {
    fontSize: "clamp(9px, 1cqi, 11px)" as const,
    fontWeight: 700 as const,
  },
  /** Legend swatch label. */
  legend: {
    fontSize: "clamp(9px, 1cqi, 11px)" as const,
    fontWeight: 600 as const,
    color: BRAND.slate700 as string,
  },
  /** Headline of a locked detail panel (lane detail, profile detail, etc.). */
  detailHeadline: {
    fontSize: "clamp(12px, 1.35cqi, 14px)" as const,
    fontWeight: 800 as const,
  },
  /** Body copy inside a locked detail panel. */
  detailBody: {
    fontSize: "clamp(10px, 1.1cqi, 12px)" as const,
    fontWeight: 600 as const,
    color: BRAND.slate900 as string,
  },
  /** Caption pill (e.g. "Opens 8:15am · Last entry 6:20pm"). */
  captionPill: {
    fontSize: "clamp(10px, 1.1cqi, 12px)" as const,
    fontWeight: 700 as const,
  },
} as const;

/**
 * Plot-area chrome: shared insets so charts compose the same way. When a
 * chart uses both a header strip and an x-axis strip, the plot SVG sits
 * between them at the same offsets across all charts.
 */
export const CHART_LAYOUT = {
  /** Top strip reserved for pills/zone labels. */
  headerStripPx: 32,
  /** Vertical breathing room between plot and the x-axis tick row beneath. */
  xAxisStripPx: 22,
  /** Plot horizontal inset so dots/labels don't kiss the card edge. */
  plotInsetX: 8,
  /** Width of the y-axis tick column when one is rendered. */
  yAxisColPx: 22,
  /** Headroom above bars for the called-out pill (Busiest, Peak, etc.). */
  pillHeadroomPx: 26,
  /** Standard gap above the focused/locked detail panel. */
  detailGapPx: 10,
} as const;

/**
 * Data dot sizing for line/curve charts (Daily pattern, Tribune density).
 * Centralizing the diameter and label offset here keeps the dot rhythm
 * consistent across charts and avoids drift between the dot size and the
 * "10"-style numeric label that hangs above it.
 */
export const CHART_DOT = {
  /** Default dot diameter in px. */
  diameter: 8,
  /** Vertical offset for the small numeric label above each dot. */
  labelOffset: 9,
} as const;

/**
 * One callout pill shape for the entire system: pill (radius 999), shared
 * padding, shared font weight. Used by <CalloutPill> and by any inline pill
 * that can't go through the component (e.g. the SeasonalCurve animated
 * pills that need a `motion.div` wrapper).
 */
export const CALLOUT_PILL = {
  paddingY: 4,
  paddingX: 10,
  radius: 999,
  fontSize: CHART_TYPE.callout.fontSize,
  fontWeight: CHART_TYPE.callout.fontWeight,
} as const;

/**
 * Tooltip rectangle: dark slate-900 on white text, rounded 8, used by every
 * hover/focus tooltip across the chart system.
 */
export const CHART_TOOLTIP_TOKENS = {
  bg: BRAND.slate900 as string,
  fg: "#FFFFFF",
  paddingY: 5,
  paddingX: 9,
  radius: 8,
  fontSize: CHART_TYPE.tooltip.fontSize,
  fontWeight: CHART_TYPE.tooltip.fontWeight,
} as const;

/** Horizontal gridline color/thickness — the only kind of gridline we use. */
export const CHART_GRID = {
  stroke: BRAND.slate100 as string,
  strokeWidth: 0.2,
} as const;

/**
 * Color-rhythm rule (codified from Task #13). Default fills are soft so the
 * chart reads as a calm field; the bars that wear an explicit callout pill
 * (Busiest, Peak, Best balance, Sweet spot, etc.) saturate to the brand
 * accent. Pass per-chart soft and vivid maps; this just selects.
 */
export function pickFill<T extends string>(
  key: T,
  isCallout: boolean,
  soft: Record<T, string>,
  vivid: Record<T, string>,
): string {
  return isCallout ? vivid[key] : soft[key];
}

/**
 * Edge-clamp helper for tooltips/markers anchored at an x position inside a
 * plot. Returns left/transform values that keep the tooltip inside the plot
 * area when the anchor is near the left or right edge (folds in #15's
 * edge-clamp lesson). `anchorXPct` is 0..100.
 */
export function clampHorizontal(anchorXPct: number): {
  left: string;
  transform: string;
} {
  if (anchorXPct < 12) return { left: "0%", transform: "translateX(0)" };
  if (anchorXPct > 88) return { left: "100%", transform: "translateX(-100%)" };
  return { left: "50%", transform: "translateX(-50%)" };
}
