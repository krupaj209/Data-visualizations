/**
 * Task #151 — render-time presentation overrides.
 *
 * Presentation controls let writers re-skin and re-frame a chart WITHOUT
 * triggering a new Gemini call:
 *
 *   - `palette`    swaps the colour set (brand / traffic / mono / cool /
 *                  warm / high_contrast)
 *   - `direction`  flips the "low value is good vs bad" colour mapping for
 *                  charts that encode a single quantitative axis
 *   - `view`       picks an alternate visual form per chart type (e.g.
 *                  hourly_heatmap → grid / strip)
 *   - `density`    `comfortable` vs `compact` chrome
 *   - `emphasis`   chart-specific target id that gets a ring / extra weight
 *
 * Persisted on `charts.presentation` jsonb. Embeds can override any field
 * via URL params (`?palette=`, `?direction=`, `?view=`, `?density=`,
 * `?emphasis=`). Edits are allowed on locked CEs (presentation is purely
 * decorative — the chart spec never changes).
 */

import { BRAND } from "@/lib/brand";

export const PALETTE_IDS = [
  "brand",
  "traffic",
  "mono",
  "cool",
  "warm",
  "high_contrast",
] as const;
export type PaletteId = (typeof PALETTE_IDS)[number];

export const DIRECTION_IDS = ["low_good", "low_bad"] as const;
export type DirectionId = (typeof DIRECTION_IDS)[number];

export const DENSITY_IDS = ["comfortable", "compact"] as const;
export type DensityId = (typeof DENSITY_IDS)[number];

export interface PresentationOverrides {
  palette?: PaletteId;
  direction?: DirectionId;
  view?: string;
  density?: DensityId;
  emphasis?: string;
}

export const EMPTY_PRESENTATION: PresentationOverrides = {};

/* -------------------------------------------------------------------------- */
/* Palette ramps                                                              */
/* -------------------------------------------------------------------------- */

export interface PaletteRamp {
  /** Quantitative ramp of 5 stops, light → dark / cool → hot. */
  scale: [string, string, string, string, string];
  /** Single primary accent — used by curve/dot fills, primary bar fill. */
  primary: string;
  /** Soft companion of `primary` for fills, hover halos. */
  primarySoft: string;
  /** Foreground readable on `primarySoft`. */
  primaryFg: string;
  /** Saturated highlight for the single "callout" bar / dot / segment. */
  callout: string;
  /** Soft companion of `callout`. */
  calloutSoft: string;
  /** Foreground readable on `calloutSoft`. */
  calloutFg: string;
  /** Tone for a "negative" / "warn" branch (queue, peak, expensive). */
  warn: string;
  warnSoft: string;
  /** Tone for a "positive" / "best" branch (quiet, best value). */
  ok: string;
  okSoft: string;
}

export const PALETTES: Record<PaletteId, PaletteRamp> = {
  brand: {
    scale: ["#F4EEFF", "#D9C5FF", "#B796FF", "#9355FF", BRAND.purps],
    primary: BRAND.purps,
    primarySoft: BRAND.purpsSoft,
    primaryFg: BRAND.purps,
    callout: BRAND.candy,
    calloutSoft: BRAND.candySoft,
    calloutFg: BRAND.candy,
    warn: BRAND.candy,
    warnSoft: BRAND.candySoft,
    ok: BRAND.okayGreen,
    okSoft: BRAND.bgMint,
  },
  traffic: {
    scale: [BRAND.bgMint, BRAND.bgSage, BRAND.bgCream, BRAND.holaSoft, BRAND.candySoft],
    primary: BRAND.hola,
    primarySoft: BRAND.holaSoft,
    primaryFg: BRAND.hola,
    callout: BRAND.candy,
    calloutSoft: BRAND.candySoft,
    calloutFg: BRAND.candy,
    warn: BRAND.candy,
    warnSoft: BRAND.candySoft,
    ok: BRAND.okayGreen,
    okSoft: BRAND.bgMint,
  },
  mono: {
    scale: ["#F8F8F8", "#E6E6E9", "#C9C9CE", "#7A7A82", "#222226"],
    primary: BRAND.slate900,
    primarySoft: BRAND.slate100,
    primaryFg: BRAND.slate900,
    callout: BRAND.slate950,
    calloutSoft: BRAND.slate200,
    calloutFg: BRAND.slate950,
    warn: BRAND.slate900,
    warnSoft: BRAND.slate200,
    ok: BRAND.slate700,
    okSoft: BRAND.slate100,
  },
  cool: {
    scale: ["#EEF4FF", "#CFE0FF", "#A1BFFF", "#5A8CFF", "#1F4ED8"],
    primary: "#1F4ED8",
    primarySoft: "#E8F1FF",
    primaryFg: "#1F4ED8",
    callout: "#5A8CFF",
    calloutSoft: "#CFE0FF",
    calloutFg: "#1F4ED8",
    warn: BRAND.candy,
    warnSoft: BRAND.candySoft,
    ok: "#1F4ED8",
    okSoft: "#E8F1FF",
  },
  warm: {
    scale: [BRAND.bgCream, "#FFE1B8", BRAND.holaSoft, BRAND.candySoft, BRAND.candy],
    primary: BRAND.candy,
    primarySoft: BRAND.candySoft,
    primaryFg: BRAND.candy,
    callout: BRAND.hola,
    calloutSoft: BRAND.holaSoft,
    calloutFg: BRAND.hola,
    warn: BRAND.candy,
    warnSoft: BRAND.candySoft,
    ok: BRAND.joyMustard,
    okSoft: BRAND.bgCream,
  },
  high_contrast: {
    scale: ["#FFFFFF", "#E6E6E9", BRAND.purpsSoft, BRAND.purps, "#19002F"],
    primary: "#19002F",
    primarySoft: BRAND.purpsSoft,
    primaryFg: "#19002F",
    callout: BRAND.candy,
    calloutSoft: BRAND.candySoft,
    calloutFg: BRAND.candy,
    warn: BRAND.candy,
    warnSoft: BRAND.candySoft,
    ok: BRAND.purps,
    okSoft: BRAND.purpsSoft,
  },
};

export const PALETTE_LABELS: Record<PaletteId, string> = {
  brand: "Brand purple",
  traffic: "Traffic light",
  mono: "Monochrome",
  cool: "Cool blue",
  warm: "Warm sunset",
  high_contrast: "High contrast",
};

export const DIRECTION_LABELS: Record<DirectionId, string> = {
  low_good: "Low = good",
  low_bad: "Low = bad",
};

export const DENSITY_LABELS: Record<DensityId, string> = {
  comfortable: "Comfortable",
  compact: "Compact",
};

/**
 * Resolve a palette ramp from a partial overrides object. Always returns a
 * concrete ramp so callers don't have to null-check. Unknown palette ids
 * fall back to `brand`.
 */
export function resolvePalette(
  presentation: PresentationOverrides | null | undefined,
): PaletteRamp {
  const id = presentation?.palette;
  if (id && PALETTES[id]) return PALETTES[id];
  return PALETTES.brand;
}

/** When `direction === "low_bad"`, flip a 0..1 intensity so 1 reads as "good". */
export function applyDirection(
  intensity: number,
  presentation: PresentationOverrides | null | undefined,
): number {
  return presentation?.direction === "low_bad" ? 1 - intensity : intensity;
}

/* -------------------------------------------------------------------------- */
/* Per-chart-type registry                                                    */
/* -------------------------------------------------------------------------- */

export interface ChartPresentationOptions {
  /** Available palettes for this chart, in display order. */
  palettes: PaletteId[];
  /** Available views; first entry is the default. Empty = no view choice. */
  views: { id: string; label: string }[];
  /** Whether `direction` flip is meaningful for this chart. */
  supportsDirection: boolean;
  /** Whether `density` is meaningful (most charts: yes, via compact mode). */
  supportsDensity: boolean;
  /**
   * Emphasis target ids the writer can pick from, paired with a human label.
   * Empty = chart doesn't expose emphasis. Generated dynamically by passing
   * the chart spec to `getEmphasisTargets`.
   */
  emphasisLabel?: string;
}

/**
 * Chart types that opt-in to the presentation panel. Listed in `replit.md`.
 * Legacy types (compare_zones, ticket_ladder, stat_grid, month_calendar,
 * donut_breakdown) are intentionally excluded — they predate the curated
 * cluster and are not part of the CMS embed contract.
 */
export const PRESENTATION_REGISTRY: Partial<
  Record<string, ChartPresentationOptions>
> = {
  weekly_pattern: {
    palettes: ["brand", "traffic", "mono", "cool", "warm", "high_contrast"],
    views: [],
    supportsDirection: true,
    supportsDensity: true,
    emphasisLabel: "Highlight day",
  },
  hourly_heatmap: {
    palettes: ["brand", "traffic", "mono", "cool", "warm", "high_contrast"],
    views: [
      { id: "grid", label: "Grid (7×24)" },
      { id: "strip", label: "Single strip (avg per hour)" },
    ],
    supportsDirection: true,
    supportsDensity: true,
    emphasisLabel: "Highlight hour-of-day",
  },
  booking_window: {
    palettes: ["brand", "traffic", "mono", "cool", "warm", "high_contrast"],
    views: [],
    supportsDirection: false,
    supportsDensity: true,
  },
  seasonal_curve: {
    palettes: ["brand", "traffic", "mono", "cool", "warm", "high_contrast"],
    views: [
      { id: "bars", label: "Bars (default)" },
      { id: "curve", label: "Smoothed curve" },
    ],
    supportsDirection: true,
    supportsDensity: true,
    emphasisLabel: "Highlight month",
  },
  daily_pattern: {
    palettes: ["brand", "mono", "cool", "warm", "high_contrast"],
    views: [
      { id: "curve", label: "Curve (default)" },
      { id: "bars", label: "Bars" },
    ],
    supportsDirection: false,
    supportsDensity: true,
    emphasisLabel: "Highlight time",
  },
  tribune_density: {
    palettes: ["brand", "mono", "cool", "warm", "high_contrast"],
    views: [],
    supportsDirection: false,
    supportsDensity: true,
  },
  duration_profiles: {
    palettes: ["brand", "traffic", "mono", "cool", "warm", "high_contrast"],
    views: [],
    supportsDirection: false,
    supportsDensity: true,
  },
  duration_stat: {
    palettes: ["brand", "traffic", "mono", "cool", "warm", "high_contrast"],
    views: [],
    supportsDirection: false,
    supportsDensity: true,
  },
  entrance_lanes: {
    palettes: ["brand", "traffic", "mono", "high_contrast"],
    views: [],
    supportsDirection: false,
    supportsDensity: true,
  },
  queue_compare: {
    palettes: ["brand", "traffic", "mono", "high_contrast"],
    views: [],
    supportsDirection: false,
    supportsDensity: true,
  },
  co_bookings: {
    palettes: ["brand", "mono", "cool", "warm", "high_contrast"],
    views: [],
    supportsDirection: false,
    supportsDensity: true,
  },
  history_timeline: {
    palettes: ["brand", "mono", "warm", "high_contrast"],
    views: [],
    supportsDirection: false,
    supportsDensity: true,
    emphasisLabel: "Highlight era / event title",
  },
  daily_programme: {
    palettes: ["brand", "mono", "cool", "warm", "high_contrast"],
    views: [],
    supportsDirection: false,
    supportsDensity: true,
  },
  time_split: {
    palettes: ["brand", "traffic", "mono", "cool", "warm", "high_contrast"],
    views: [
      { id: "stacked", label: "Stacked bar (default)" },
      { id: "rows", label: "Rows" },
    ],
    supportsDirection: false,
    supportsDensity: true,
  },
  slot_compare: {
    palettes: ["brand", "traffic", "mono", "cool", "warm", "high_contrast"],
    views: [
      { id: "bars", label: "Grouped bars (default)" },
      { id: "table", label: "Score table" },
    ],
    supportsDirection: false,
    supportsDensity: true,
    emphasisLabel: "Highlight slot index (slot-0, slot-1, …)",
  },
};

/**
 * Returns the options registry for a chart type, or null if the type is
 * not in scope of Task #151 (legacy chart types).
 */
export function getPresentationOptions(
  chartType: string,
): ChartPresentationOptions | null {
  return PRESENTATION_REGISTRY[chartType] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

const PALETTE_SET = new Set<string>(PALETTE_IDS);
const DIRECTION_SET = new Set<string>(DIRECTION_IDS);
const DENSITY_SET = new Set<string>(DENSITY_IDS);

/**
 * Coerce arbitrary input (URL params, JSON from DB, form values) into a
 * clean PresentationOverrides. Unknown enum values are dropped silently so
 * a stale URL param can never crash a render.
 */
export function normalizePresentation(
  raw: unknown,
  chartType?: string,
): PresentationOverrides {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const out: PresentationOverrides = {};

  if (typeof obj["palette"] === "string" && PALETTE_SET.has(obj["palette"])) {
    out.palette = obj["palette"] as PaletteId;
  }
  if (
    typeof obj["direction"] === "string" &&
    DIRECTION_SET.has(obj["direction"])
  ) {
    out.direction = obj["direction"] as DirectionId;
  }
  if (typeof obj["density"] === "string" && DENSITY_SET.has(obj["density"])) {
    out.density = obj["density"] as DensityId;
  }
  if (typeof obj["view"] === "string" && obj["view"].length <= 40) {
    out.view = obj["view"];
  }
  if (typeof obj["emphasis"] === "string" && obj["emphasis"].length <= 120) {
    out.emphasis = obj["emphasis"];
  }

  // Drop fields the registry says aren't meaningful for this type.
  if (chartType) {
    const opts = getPresentationOptions(chartType);
    if (opts) {
      if (out.palette && !opts.palettes.includes(out.palette)) {
        delete out.palette;
      }
      if (out.direction && !opts.supportsDirection) delete out.direction;
      if (out.density && !opts.supportsDensity) delete out.density;
      if (out.view) {
        if (opts.views.length === 0) delete out.view;
        else if (!opts.views.some((v) => v.id === out.view)) delete out.view;
      }
      if (out.emphasis && !opts.emphasisLabel) delete out.emphasis;
    }
  }

  return out;
}

/**
 * Read presentation overrides from the current URL's query string. Used by
 * Embed.tsx so the CMS / writers can A/B variants without touching the DB.
 */
export function readPresentationFromQuery(
  search: string,
  chartType?: string,
): PresentationOverrides {
  if (!search) return {};
  const params = new URLSearchParams(search);
  const raw: Record<string, string> = {};
  for (const key of ["palette", "direction", "view", "density", "emphasis"]) {
    const v = params.get(key);
    if (v !== null) raw[key] = v;
  }
  return normalizePresentation(raw, chartType);
}

/**
 * Merge a saved presentation with optional overrides (e.g. URL params).
 * Overrides win on a per-field basis.
 */
export function mergePresentation(
  base: PresentationOverrides | null | undefined,
  override: PresentationOverrides | null | undefined,
): PresentationOverrides {
  return { ...(base ?? {}), ...(override ?? {}) };
}
