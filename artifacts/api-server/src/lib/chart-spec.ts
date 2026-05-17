import { z } from "zod";

const dayLevelEnum = z.enum([
  "closed",
  "quietest",
  "quiet",
  "busy",
  "busiest",
]);

const dayCodeEnum = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);

const seasonStatusEnum = z.enum([
  "closed",
  "very_quiet",
  "quiet",
  "moderate",
  "busy",
  "peak",
]);

const zoneStatusEnum = z.enum([
  "no_wait",
  "short",
  "medium",
  "long",
  "very_long",
  "closed",
]);

export const weeklyPatternSpec = z.object({
  type: z.literal("weekly_pattern"),
  days: z
    .array(
      z.object({
        day: dayCodeEnum,
        level: dayLevelEnum,
        score: z.number().min(0).max(100),
        note: z.string().max(60).optional(),
      }),
    )
    .length(7),
  /** Optional day-of-week facts shown as chips below the chart. */
  day_notes: z
    .array(
      z.object({
        label: z.string().max(60),
        kind: z.enum(["closed", "free", "info"]),
      }),
    )
    .max(4)
    .optional(),
});

export const hourlyHeatmapSpec = z.object({
  type: z.literal("hourly_heatmap"),
  open_hour: z.number().int().min(0).max(23),
  close_hour: z.number().int().min(1).max(24),
  rows: z
    .array(
      z.object({
        day: dayCodeEnum,
        hours: z.array(z.number().min(0).max(100)).length(24),
        closed: z.boolean().default(false),
      }),
    )
    .length(7),
  best_window: z
    .object({
      label: z.string().max(80),
      day: dayCodeEnum,
      start_hour: z.number().int().min(0).max(23),
      end_hour: z.number().int().min(1).max(24),
    })
    .optional(),
  /**
   * Optional "when to go and why" highlight cards rendered beneath the
   * heatmap. Curated-only for now; AI-generated heatmaps may omit. Hidden
   * in compact mode so the grid + legend stay legible at small sizes.
   */
  highlight_cards: z
    .array(
      z.object({
        kind: z.enum([
          "quietest_hours",
          "best_photography",
          "best_weather",
          "fastest_entry",
          "best_evening",
          "best_off_season",
        ]),
        headline: z.string().max(40),
        detail: z.string().max(140),
      }),
    )
    .max(6)
    .optional(),
});

export const monthCalendarSpec = z.object({
  type: z.literal("month_calendar"),
  start_date: z.string(),
  days: z
    .array(
      z.object({
        date: z.string(),
        score: z.number().min(0).max(100),
        status: seasonStatusEnum,
        label: z.string().max(40).optional(),
      }),
    )
    .min(28)
    .max(120),
  recommended_dates: z
    .array(
      z.object({
        date: z.string(),
        reason: z.string().max(80),
      }),
    )
    .max(6),
});

export const bookingWindowSpec = z.object({
  type: z.literal("booking_window"),
  curve: z
    .array(
      z.object({
        days_before: z.number().int().min(0).max(180),
        share: z.number().min(0).max(100),
      }),
    )
    .min(8),
  sweet_spot: z.object({
    days_before_min: z.number().int().min(0).max(180),
    days_before_max: z.number().int().min(0).max(180),
    label: z.string().max(80),
  }),
  sold_out_risk: z
    .object({
      threshold_days: z.number().int().min(0).max(180),
      message: z.string().max(120),
    })
    .optional(),
});

export const statGridSpec = z.object({
  type: z.literal("stat_grid"),
  stats: z
    .array(
      z.object({
        label: z.string().max(40),
        value: z.string().max(20),
        unit: z.string().max(16).optional(),
        delta: z.string().max(40).optional(),
        accent: z.enum(["purps", "candy", "hola", "okay", "slate"]).optional(),
        sparkline: z.array(z.number()).max(24).optional(),
        footnote: z.string().max(80).optional(),
      }),
    )
    .min(2)
    .max(6),
});

export const compareZonesSpec = z.object({
  type: z.literal("compare_zones"),
  metric_label: z.string().max(40),
  zones: z
    .array(
      z.object({
        name: z.string().max(60),
        emoji: z.string().max(8).optional(),
        wait_min: z.number().min(0).max(360),
        wait_max: z.number().min(0).max(360),
        status: zoneStatusEnum,
        tip: z.string().max(140).optional(),
        share_of_visitors: z.number().min(0).max(100).optional(),
      }),
    )
    .min(2)
    .max(6),
});

export const donutBreakdownSpec = z.object({
  type: z.literal("donut_breakdown"),
  center_value: z.string().max(20),
  center_label: z.string().max(40),
  segments: z
    .array(
      z.object({
        label: z.string().max(40),
        value: z.number().min(0).max(100),
        accent: z.enum(["purps", "candy", "hola", "okay", "slate"]).optional(),
      }),
    )
    .min(2)
    .max(6),
});

export const seasonalCurveSpec = z.object({
  type: z.literal("seasonal_curve"),
  months: z
    .array(
      z.object({
        month: z.enum([
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
        ]),
        score: z.number().min(0).max(100),
        status: seasonStatusEnum,
        note: z.string().max(60).optional(),
        /** Optional 0–100 weather quality score; higher = better weather. */
        weather_score: z.number().min(0).max(100).optional(),
        /** Optional 0–100 price pressure score; higher = more expensive / more demand. */
        price_score: z.number().min(0).max(100).optional(),
      }),
    )
    .length(12),
  best_months: z.array(z.string()).max(4),
  worst_months: z.array(z.string()).max(4),
  /** Optional calendar facts shown as chips below the chart. */
  calendar_notes: z
    .array(
      z.object({
        label: z.string().max(60),
        kind: z.enum(["closed", "free", "info"]),
      }),
    )
    .max(8)
    .optional(),
  /** Optional one-sentence insights surfaced beneath the chart per active metric. */
  metric_insights: z
    .object({
      crowd: z.string().max(160).optional(),
      weather: z.string().max(160).optional(),
      price: z.string().max(160).optional(),
    })
    .optional(),
});

/* -------------------------------------------------------------------------- *
 * v3 — calendar & seasonal family                                            *
 *                                                                            *
 * Four sibling archetypes that share the 12-month calendar shape but swap   *
 * crowd volume for a different decision signal: conditions, sighting       *
 * success, departure reliability, or price.                                 *
 * -------------------------------------------------------------------------- */

const calendarMonthEnum = z.enum([
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
]);

export const conditionsCalendarSpec = z.object({
  type: z.literal("conditions_calendar"),
  /** Which physical metric the y-axis encodes. Drives default unit + label. */
  metric: z.enum([
    "snow_depth_cm",
    "visibility_m",
    "swell_m",
    "river_flow_index",
    "harvest_intensity",
    "temperature_c",
  ]),
  /** Short visible unit, e.g. "cm", "m", "°C". */
  unit_label: z.string().max(8),
  /** Plot title hint, e.g. "Average snow depth". */
  metric_label: z.string().max(60),
  months: z
    .array(
      z.object({
        month: calendarMonthEnum,
        value: z.number().min(0).max(10000),
        status: z.enum(["closed", "poor", "fair", "good", "optimal", "expert"]),
        note: z.string().max(80).optional(),
        /** Tiny per-month markers (turtle, manta, harvest, etc.). */
        icons: z.array(z.string().max(16)).max(3).optional(),
      }),
    )
    .length(12),
  /**
   * Optional reference bands rendered on the y-axis (e.g. "good 30–60cm",
   * "expert >60cm"). Inclusive numeric thresholds keyed to `metric`.
   */
  reference_bands: z
    .array(
      z.object({
        label: z.string().max(40),
        min: z.number().min(0).max(10000),
        max: z.number().min(0).max(10000),
        tone: z.enum(["poor", "fair", "good", "optimal", "expert"]),
      }),
    )
    .max(5)
    .optional(),
  best_months: z.array(z.string()).max(4),
  worst_months: z.array(z.string()).max(4),
});

export const sightingProbabilitySpec = z.object({
  type: z.literal("sighting_probability"),
  /** How to render multiple series, when present. */
  display: z.enum(["single", "grouped", "stacked"]).default("single"),
  /** 1–4 named series (species, event, etc.). */
  series: z
    .array(
      z.object({
        name: z.string().max(40),
        accent: z.enum(["purps", "candy", "hola", "okay", "slate"]).optional(),
        monthly: z.array(z.number().min(0).max(100)).length(12),
      }),
    )
    .min(1)
    .max(4),
  /** Optional confidence label, e.g. "Based on operator logs 2019–2024". */
  confidence_note: z.string().max(120).optional(),
  best_months: z.array(z.string()).max(4),
  worst_months: z.array(z.string()).max(4),
});

export const departureReliabilitySpec = z.object({
  type: z.literal("departure_reliability"),
  months: z
    .array(
      z.object({
        month: calendarMonthEnum,
        /** % of scheduled departures that ran. */
        pct_ran: z.number().min(0).max(100),
        /** Optional cancellation-reason breakdown for this month. */
        cancellation_reasons: z
          .array(
            z.object({
              reason: z.string().max(40),
              share: z.number().min(0).max(100),
            }),
          )
          .max(4)
          .optional(),
        note: z.string().max(80).optional(),
      }),
    )
    .length(12),
  /** Optional company-stated target line, e.g. 90%. */
  target_pct: z.number().min(0).max(100).optional(),
  best_months: z.array(z.string()).max(4),
  worst_months: z.array(z.string()).max(4),
});

export const priceCurveSpec = z.object({
  type: z.literal("price_curve"),
  currency: z.string().max(4).default("EUR"),
  /** Reference (index = 100) price, e.g. 1200 for a 7-day tour. */
  base_value: z.number().min(0).max(100000),
  /** Short label for the base, e.g. "from €1,200". */
  base_label: z.string().max(40).optional(),
  points: z
    .array(
      z.object({
        month: calendarMonthEnum,
        /** Price index relative to base_value (100 = base). */
        index: z.number().min(0).max(500),
        note: z.string().max(80).optional(),
      }),
    )
    .length(12),
  cheapest_months: z.array(z.string()).max(4),
  priciest_months: z.array(z.string()).max(4),
});

export const ticketLadderSpec = z.object({
  type: z.literal("ticket_ladder"),
  currency: z.string().max(4).default("EUR"),
  tiers: z
    .array(
      z.object({
        name: z.string().max(60),
        price: z.number().min(0).max(2000),
        includes: z.array(z.string().max(60)).max(5),
        recommended: z.boolean().default(false),
        share: z.number().min(0).max(100).optional(),
        wait_savings_min: z.number().min(0).max(360).optional(),
      }),
    )
    .min(2)
    .max(5),
});

/* -------------------------------------------------------------------------- *
 * Curated-only chart types                                                   *
 *                                                                            *
 * The five archetypes below (daily_pattern, tribune_density,                 *
 * duration_profiles, entrance_lanes, co_bookings) ship with the hand-built  *
 * Florence cluster decks (`scripts/src/data/{accademia,uffizi,duomo}.mjs`). *
 * The AI generation pipeline never produces them, but writers MUST be able  *
 * to PATCH them via /charts/:id, so the union below validates them.         *
 *                                                                           *
 * Schemas mirror the viz-studio renderer types in                           *
 * `artifacts/viz-studio/src/lib/chart-spec.ts` — mostly enums + small       *
 * objects with `.passthrough()` so an unknown optional field a writer adds  *
 * doesn't fail validation.                                                  *
 * -------------------------------------------------------------------------- */

const dailyPatternSpec = z
  .object({
    type: z.literal("daily_pattern"),
    points: z
      .array(
        z.object({ time: z.string().max(5), crowd: z.number().min(0).max(10) }),
      )
      .min(1),
    zones: z.array(
      z.object({
        label: z.string().max(60),
        tone: z.enum(["best", "peak", "second_best"]),
        start: z.string().max(5),
        end: z.string().max(5),
      }),
    ),
    caption: z
      .object({
        opens: z.string().max(40).optional(),
        last_entry: z.string().max(40).optional(),
      })
      .optional(),
  })
  .passthrough();

const tribuneDensitySpec = z
  .object({
    type: z.literal("tribune_density"),
    scope: z.string().max(120),
    y_label: z.string().max(80),
    points: z
      .array(
        z.object({
          time: z.string().max(5),
          density: z.number().min(0).max(10),
        }),
      )
      .min(1),
    zones: z.array(
      z.object({
        label: z.string().max(60),
        tone: z.enum(["quiet", "packed", "second_window"]),
        start: z.string().max(5),
        end: z.string().max(5),
      }),
    ),
    arrow_callout: z
      .object({
        label: z.string().max(80),
        at: z.string().max(5),
        helper: z.string().max(120).optional(),
      })
      .optional(),
    context_pills: z.array(
      z
        .object({
          icon: z.enum([
            "calendar",
            "people",
            "people_full",
            "sun",
            "clock",
          ]),
          title: z.string().max(60),
          subtitle: z.string().max(80),
          tone: z.enum(["candy", "okay", "purps"]),
        })
        .passthrough(),
    ),
  })
  .passthrough();

const durationProfilesSpec = z
  .object({
    type: z.literal("duration_profiles"),
    headline: z.string().max(160),
    scale_min: z.array(
      z.object({
        label: z.string().max(20),
        minutes: z.number().int().min(0).max(600),
      }),
    ),
    profiles: z
      .array(
        z
          .object({
            name: z.string().max(60),
            icon: z.enum([
              "stopwatch",
              "head",
              "column",
              "lyre",
              "bust",
              "bench",
            ]),
            range_min: z.number().int().min(0).max(600),
            range_max: z.number().int().min(0).max(600),
            note: z.string().max(120).optional(),
            highlight: z.boolean().optional(),
          })
          .passthrough(),
      )
      .min(1),
    tip: z.string().max(160).optional(),
  })
  .passthrough();

const entranceLanesSpec = z
  .object({
    type: z.literal("entrance_lanes"),
    venue_label: z.string().max(80),
    shared_caption: z.string().max(160),
    lanes: z
      .array(
        z
          .object({
            name: z.string().max(60),
            wait_label: z.string().max(40),
            tone: z.enum(["candy", "purps", "okay", "slate"]),
            dots: z.number().int().min(0).max(40),
            dashed: z.boolean().optional(),
          })
          .passthrough(),
      )
      .min(1),
  })
  .passthrough();

/* -------------------------------------------------------------------------- *
 * v3 heatmap & matrix family                                                 *
 *                                                                            *
 * Two zone × hour heatmaps share the same grid shape but encode different    *
 * units: `zone_crowd_heatmap` carries 0-100 crowd scores (museums,           *
 * aquariums) while `zone_wait_heatmap` carries wait minutes (theme parks).   *
 * `golden_hour_match` is a month × slot matrix used by photography tours.    *
 * -------------------------------------------------------------------------- */

const monthEnum = z.enum([
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
]);

const zoneRowBase = z.object({
  name: z.string().min(1).max(60),
  emoji: z.string().max(8).optional(),
});

const heatmapBestWindow = z
  .object({
    label: z.string().max(80),
    zone: z.string().max(60),
    start_hour: z.number().int().min(0).max(23),
    end_hour: z.number().int().min(1).max(24),
  })
  .optional();

export const zoneCrowdHeatmapSpec = z.object({
  type: z.literal("zone_crowd_heatmap"),
  open_hour: z.number().int().min(0).max(23),
  close_hour: z.number().int().min(1).max(24),
  zones: z
    .array(
      zoneRowBase.extend({
        hours: z.array(z.number().min(0).max(100)).length(24),
      }),
    )
    .min(2)
    .max(8),
  best_window: heatmapBestWindow,
});

export const zoneWaitHeatmapSpec = z.object({
  type: z.literal("zone_wait_heatmap"),
  open_hour: z.number().int().min(0).max(23),
  close_hour: z.number().int().min(1).max(24),
  unit: z.string().max(8).default("min"),
  zones: z
    .array(
      zoneRowBase.extend({
        hours: z.array(z.number().min(0).max(360)).length(24),
      }),
    )
    .min(2)
    .max(8),
  best_window: heatmapBestWindow,
});

export const goldenHourMatchSpec = z.object({
  type: z.literal("golden_hour_match"),
  location_label: z.string().max(80),
  slots: z
    .array(z.object({ label: z.string().min(1).max(40) }))
    .min(1)
    .max(6),
  months: z
    .array(
      z.object({
        month: monthEnum,
        cells: z
          .array(
            z.object({
              aligned: z.boolean(),
              sub_rating: z.number().min(0).max(100).optional(),
            }),
          )
          .min(1)
          .max(6),
      }),
    )
    .length(12),
  helper: z.string().max(160).optional(),
});

const coBookingsSpec = z
  .object({
    type: z.literal("co_bookings"),
    items: z
      .array(
        z
          .object({
            name: z.string().max(80),
            share: z.number().min(0).max(100),
            badge: z.string().max(40).optional(),
            icon: z.enum([
              "landmark",
              "church",
              "castle",
              "building",
              "trees",
              "gem",
            ]),
          })
          .passthrough(),
      )
      .min(1),
    highlight_top: z.number().int().min(0).max(20).optional(),
  })
  .passthrough();

/* -------------------------------------------------------------------------- *
 * v3 specialty family                                                        *
 *                                                                            *
 * Five archetypes that don't fit any other family — each is the signature    *
 * visualization for a specific subcategory and answers a question no other   *
 * chart can. Renderers live in `artifacts/viz-studio/src/components/charts/` *
 * (one file per type) and respect the compact prop / 340px auto-collapse.    *
 * -------------------------------------------------------------------------- */

export const savingsBreakdownSpec = z.object({
  type: z.literal("savings_breakdown"),
  currency: z.string().max(4).default("EUR"),
  card_price: z.number().min(0).max(10000),
  card_label: z.string().max(60).default("Card price"),
  attractions: z
    .array(
      z.object({
        name: z.string().max(60),
        standalone_price: z.number().min(0).max(10000),
        usage_rate: z.number().min(0).max(100).optional(),
      }),
    )
    .min(3)
    .max(10),
});

export const returnBufferRankSpec = z.object({
  type: z.literal("return_buffer_rank"),
  ship_departure_time: z.string().max(8),
  options: z
    .array(
      z.object({
        name: z.string().max(80),
        buffer_minutes: z.number().int().min(-120).max(720),
        notes: z.string().max(120).optional(),
      }),
    )
    .min(3)
    .max(8),
});

const seatTierEnum = z.enum([
  "stalls",
  "circle",
  "upper_circle",
  "balcony",
  "box",
  "gallery",
]);

export const seatValueMapSpec = z.object({
  type: z.literal("seat_value_map"),
  currency: z.string().max(4).default("USD"),
  venue_label: z.string().max(80).optional(),
  layout: z
    .array(seatTierEnum)
    .min(1)
    .max(6),
  sections: z
    .array(
      z.object({
        name: z.string().max(40),
        tier: seatTierEnum,
        price: z.number().min(0).max(10000),
        sightline_score: z.number().min(0).max(100),
        value_score: z.number().min(0).max(100),
        note: z.string().max(80).optional(),
      }),
    )
    .min(4)
    .max(10),
  best_section: z.string().max(40).optional(),
});

export const optimalDepartureSpec = z.object({
  type: z.literal("optimal_departure"),
  recommended_slot: z.string().max(40),
  slots: z
    .array(
      z.object({
        id: z
          .string()
          .max(40)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "id must be kebab-case"),
        name: z.string().max(40),
        light_quality: z.number().min(0).max(100),
        conditions: z.number().min(0).max(100),
        crowd_level: z.number().min(0).max(100),
        note: z.string().max(120).optional(),
      }),
    )
    .min(2)
    .max(5),
});

export const stopFrequencySpec = z.object({
  type: z.literal("stop_frequency"),
  route_label: z.string().max(80).optional(),
  stops: z
    .array(
      z.object({
        name: z.string().max(60),
        peak_headway_min: z.number().int().min(1).max(180),
        offpeak_headway_min: z.number().int().min(1).max(180),
        note: z.string().max(80).optional(),
      }),
    )
    .min(4)
    .max(20),
});

export const routeProfileSpec = z.object({
  type: z.literal("route_profile"),
  route_label: z.string().max(80),
  mode: z.enum(["cruise", "bus", "walk", "day_trip", "transfer", "other"]),
  distance_km: z.number().min(0).max(1000).optional(),
  total_duration_min: z.number().int().min(1).max(1440).optional(),
  headline_metric: z.string().max(60).optional(),
  stops: z
    .array(
      z.object({
        name: z.string().max(60),
        kind: z.enum(["start", "landmark", "transfer", "stop", "end"]),
        duration_from_start_min: z.number().int().min(0).max(1440).optional(),
        landmark_count: z.number().int().min(0).max(40).optional(),
        note: z.string().max(120).optional(),
        highlight: z.boolean().optional(),
      }),
    )
    .min(3)
    .max(12),
  best_for: z.array(z.string().max(40)).max(4).optional(),
  callout: z.string().max(160).optional(),
});

/* -------------------------------------------------------------------------- *
 * v3 curve & promotion family (Task #33)                                     *
 *                                                                            *
 *  - queue_compare      (promoted from the bespoke entrance_lanes spec)      *
 *  - duration_stat      (promoted from the bespoke duration_profiles spec)   *
 *  - ride_wait_curve    (smooth hourly wait-time curve, single subject)      *
 *  - activity_window    (smooth hourly activity-index curve, single subject) *
 *  - opening_hour_rank  (horizontal ranked-bar of rope-drop waits)           *
 *                                                                            *
 * queue_compare and duration_stat are shape-compatible with their bespoke    *
 * predecessors so the same React renderer powers both, and the curated      *
 * Florence cluster keeps rendering during the rename. Old discriminators    *
 * remain valid above for any rows already in the DB.                         *
 * -------------------------------------------------------------------------- */

const queueCompareSpec = z
  .object({
    type: z.literal("queue_compare"),
    venue_label: z.string().max(80),
    shared_caption: z.string().max(160),
    lanes: z
      .array(
        z
          .object({
            name: z.string().max(60),
            wait_label: z.string().max(40),
            tone: z.enum(["candy", "purps", "okay", "slate"]),
            dots: z.number().int().min(0).max(40),
            dashed: z.boolean().optional(),
            who: z.string().max(160).optional(),
            wait_peak: z.string().max(40).optional(),
            wait_off_peak: z.string().max(40).optional(),
            how: z.string().max(200).optional(),
          })
          .passthrough(),
      )
      .min(2)
      .max(5),
  })
  .passthrough();

const durationStatSpec = z
  .object({
    type: z.literal("duration_stat"),
    headline: z.string().max(160),
    scale_min: z
      .array(
        z.object({
          label: z.string().max(20),
          minutes: z.number().int().min(0).max(600),
        }),
      )
      .min(2)
      .max(8),
    profiles: z
      .array(
        z
          .object({
            name: z.string().max(60),
            icon: z.enum([
              "stopwatch",
              "head",
              "column",
              "lyre",
              "bust",
              "bench",
            ]),
            range_min: z.number().int().min(0).max(600),
            range_max: z.number().int().min(0).max(600),
            note: z.string().max(120).optional(),
            highlight: z.boolean().optional(),
          })
          .passthrough(),
      )
      .min(2)
      .max(6),
    tip: z.string().max(160).optional(),
  })
  .passthrough();

const hourPointSchema = z.object({
  hour: z.number().int().min(0).max(23),
  value: z.number().min(0).max(1000),
});

const curveZoneSchema = z.object({
  label: z.string().max(40),
  tone: z.enum(["best", "peak", "second_best"]),
  start_hour: z.number().int().min(0).max(23),
  end_hour: z.number().int().min(1).max(24),
});

const rideWaitCurveSpec = z.object({
  type: z.literal("ride_wait_curve"),
  subject: z.string().max(80),
  y_label: z.string().max(40).default("Wait time"),
  unit: z.string().max(16).default("min"),
  open_hour: z.number().int().min(0).max(23),
  close_hour: z.number().int().min(1).max(24),
  hours: z.array(hourPointSchema).length(24),
  zones: z.array(curveZoneSchema).min(1).max(4),
  insight: z.string().max(160).optional(),
});

const activityWindowSpec = z.object({
  type: z.literal("activity_window"),
  subject: z.string().max(80),
  y_label: z.string().max(40).default("Activity index"),
  unit: z.string().max(16).default(""),
  open_hour: z.number().int().min(0).max(23),
  close_hour: z.number().int().min(1).max(24),
  hours: z.array(hourPointSchema).length(24),
  zones: z.array(curveZoneSchema).min(1).max(4),
  insight: z.string().max(160).optional(),
});

const openingHourRankSpec = z.object({
  type: z.literal("opening_hour_rank"),
  subject_label: z.string().max(40).default("Ride"),
  unit: z.string().max(16).default("min"),
  hour_label: z.string().max(60).default("Wait at opening"),
  bands: z
    .object({
      green_max: z.number().min(0).max(360),
      amber_max: z.number().min(0).max(360),
    })
    .default({ green_max: 15, amber_max: 35 }),
  subjects: z
    .array(
      z.object({
        name: z.string().max(60),
        wait_minutes: z.number().min(0).max(360),
        note: z.string().max(80).optional(),
      }),
    )
    .min(3)
    .max(8),
  insight: z.string().max(160).optional(),
});

/* -------------------------------------------------------------------------- *
 * v3 timeline & narrative family                                             *
 *                                                                            *
 * `daily_programme`, `time_split`, `slot_compare` — see Task #36. These      *
 * three are first-class AI-pipeline archetypes (registered in               *
 * `chart-archetype-prompts.ts`, flagged `implemented: true`).               *
 * -------------------------------------------------------------------------- */

const hhmm = z
  .string()
  .max(5)
  .regex(
    /^(?:[01]?\d|2[0-3]):[0-5]\d$/,
    'time must be 24h "H:MM" or "HH:MM" (00:00–23:59)',
  );

export const dailyProgrammeSpec = z.object({
  type: z.literal("daily_programme"),
  open_time: hhmm,
  close_time: hhmm,
  events: z
    .array(
      z.object({
        name: z.string().max(60),
        start_time: hhmm,
        duration_min: z.number().int().min(1).max(720),
        location: z.string().max(60),
        popularity: z.number().int().min(0).max(100),
        icon: z
          .enum([
            "feeding",
            "show",
            "talk",
            "prayer",
            "tour",
            "ceremony",
            "encounter",
            "demo",
          ])
          .optional(),
        note: z.string().max(120).optional(),
      }),
    )
    .min(3)
    .max(10),
  highlight_event: z.string().max(60).optional(),
});

export const timeSplitSpec = z.object({
  type: z.literal("time_split"),
  total_min: z.number().int().min(15).max(2880),
  total_label: z.string().max(40).optional(),
  segments: z
    .array(
      z.object({
        label: z.string().max(40),
        minutes: z.number().int().min(1).max(2880),
        accent: z.enum(["purps", "candy", "hola", "okay", "slate"]),
        note: z.string().max(120).optional(),
        /**
         * When true, the segment is a skippable add-on (e.g. an optional
         * extension included in the combo ticket but not required to
         * complete the visit). Renders with a dashed outline + softened
         * fill rather than a solid block. Defaults to false.
         */
        optional: z.boolean().optional(),
      }),
    )
    .min(3)
    .max(6),
  callout: z.string().max(160).optional(),
});

export const slotCompareSpec = z.object({
  type: z.literal("slot_compare"),
  slots: z
    .array(
      z.object({
        name: z.string().max(40),
        time_window: z.string().max(40).optional(),
        accent: z.enum(["purps", "candy", "hola", "okay", "slate"]),
        recommended: z.boolean().default(false),
      }),
    )
    .min(2)
    .max(3),
  dimensions: z
    .array(
      z.object({
        label: z.string().max(40),
        scores: z.array(z.number().int().min(0).max(100)).min(2).max(3),
      }),
    )
    .min(3)
    .max(5),
  insight: z.string().max(200).optional(),
});

export const historyTimelineSpec = z.object({
  type: z.literal("history_timeline"),
  span_label: z.string().max(40),
  events: z
    .array(
      z.object({
        date_label: z.string().max(24),
        sort_year: z.number().min(-5000).max(3000),
        title: z.string().max(30),
        era: z.enum([
          "origins",
          "construction",
          "spectacle",
          "decline",
          "reuse",
          "restoration",
          "modern",
        ]),
        description: z.string().max(140),
        metric_label: z.string().max(40).optional(),
        metric_value: z.string().max(32).optional(),
      }),
    )
    .min(7)
    .max(9),
  highlight_event: z.string().max(40).optional(),
  callout: z.string().max(160).optional(),
});

/* ========================================================================== */
/* Task #67 — v3 promoted archetypes                                           */
/* ========================================================================== */

const accentEnum = z.enum(["purps", "candy", "hola", "okay", "slate"]);

/**
 * `ticket_access_matrix` — supersedes `ticket_ladder`. Tier × access-feature
 * matrix where each cell shows the *kind* of access a tier grants for a
 * feature, not just a yes/no. Cell states model the real ticket-page
 * nuance writers see in the wild: full inclusion, paid add-on (e.g.
 * "extra €5"), limited/timed access, or excluded.
 */
const ticketAccessCellSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("included") }),
  z.object({ state: z.literal("excluded") }),
  z.object({
    state: z.literal("extra"),
    extra_price: z.number().min(0).max(100000).optional(),
    label: z.string().max(40).optional(),
  }),
  z.object({
    state: z.literal("limited"),
    label: z.string().max(40).optional(),
  }),
]);

export const ticketAccessMatrixSpec = z.object({
  type: z.literal("ticket_access_matrix"),
  currency: z.string().min(1).max(8),
  tiers: z
    .array(
      z.object({
        name: z.string().max(40),
        price: z.number().min(0).max(100000),
        accent: accentEnum.optional(),
        recommended: z.boolean().optional(),
        note: z.string().max(120).optional(),
      }),
    )
    .min(2)
    .max(5),
  features: z
    .array(
      z.object({
        label: z.string().max(60),
        cells: z.array(ticketAccessCellSchema).min(2).max(5),
        note: z.string().max(120).optional(),
      }),
    )
    .min(3)
    .max(8),
  insight: z.string().max(200).optional(),
});

/**
 * `duration_budget` — supersedes `duration_stat`. Total visit budget split
 * into 3-6 named blocks. Block minutes must sum within 5% of total_min.
 * Optional per-block badge tells the visitor which block to drop on a
 * tight schedule and which to extend on a deep-dive day.
 */
export const durationBudgetSpec = z.object({
  type: z.literal("duration_budget"),
  total_min: z.number().int().min(15).max(2880),
  total_label: z.string().max(60).optional(),
  blocks: z
    .array(
      z.object({
        label: z.string().max(40),
        minutes: z.number().int().min(1).max(2880),
        accent: accentEnum,
        badge: z
          .enum(["skip_if_tight", "extend_if_deep_dive"])
          .optional(),
        note: z.string().max(120).optional(),
      }),
    )
    .min(3)
    .max(6),
  tip: z.string().max(200).optional(),
});

/**
 * `landmark_coverage` — supersedes `route_profile` for HOHO loops, sightseeing
 * cruise routes, and photography tours. **Routes × landmarks matrix** where
 * each cell shows the *kind* of coverage that route gives a landmark:
 * `covered` (the route stops at it), `near` (stops within easy walking),
 * `view_only` (passes by / visible from board), `none` (not on route).
 * Lets the writer compare two or three operator routes side-by-side.
 */
export const landmarkCoverageSpec = z.object({
  type: z.literal("landmark_coverage"),
  route_label: z.string().max(60).optional(),
  routes: z
    .array(
      z.object({
        name: z.string().max(40),
        accent: accentEnum.optional(),
        recommended: z.boolean().optional(),
        note: z.string().max(120).optional(),
      }),
    )
    .min(2)
    .max(4),
  landmarks: z
    .array(
      z.object({
        name: z.string().max(60),
        kind: z.enum(["icon", "highlight", "standard"]),
        coverage: z
          .array(z.enum(["covered", "near", "view_only", "none"]))
          .min(2)
          .max(4),
        note: z.string().max(120).optional(),
      }),
    )
    .min(3)
    .max(12),
  best_for: z.array(z.string().max(40)).max(4).optional(),
  callout: z.string().max(200).optional(),
});

/**
 * `itinerary_flow` — supersedes `route_profile` for walking tours, day trips,
 * food tours, and port-of-call shore tours. **Timed sequence** of stops
 * with per-stop dwell minutes AND inter-stop transit minutes (so visitors
 * can see "20 min stop, 8 min walk, 30 min stop, …"). FIRST stop must be
 * `start` and LAST must be `end`. `transits.length === stops.length - 1`.
 */
export const itineraryFlowSpec = z.object({
  type: z.literal("itinerary_flow"),
  mode: z.enum(["walk", "bus", "boat", "mixed", "day_trip"]),
  total_duration_min: z.number().int().min(15).max(2880).optional(),
  stops: z
    .array(
      z.object({
        name: z.string().max(60),
        kind: z.enum(["start", "stop", "highlight", "end"]),
        dwell_min: z.number().int().min(0).max(720).optional(),
        note: z.string().max(140).optional(),
      }),
    )
    .min(3)
    .max(12),
  transits: z
    .array(
      z.object({
        minutes: z.number().int().min(0).max(360),
        mode: z
          .enum(["walk", "bus", "boat", "mixed", "transfer"])
          .optional(),
        note: z.string().max(80).optional(),
      }),
    )
    .min(2)
    .max(11),
  callout: z.string().max(200).optional(),
});

/**
 * `best_for_matrix` — audiences × facets numeric matrix. Each cell is a
 * 0-100 score for how well an audience is served by a facet (pace,
 * access, headline-payoff, kid-friendliness, photography, etc.). The
 * top-scoring audience per facet is auto-marked in the renderer; an
 * optional per-facet `top_audience_index` lets the writer override.
 * Light-weight complement to `slot_compare` when the comparison is
 * audience-fit rather than slot-vs-slot.
 */
export const bestForMatrixSpec = z.object({
  type: z.literal("best_for_matrix"),
  facets: z
    .array(
      z.object({
        name: z.string().max(40),
        note: z.string().max(120).optional(),
        top_audience_index: z.number().int().min(0).max(5).optional(),
      }),
    )
    .min(3)
    .max(5),
  audiences: z
    .array(
      z.object({
        label: z.string().max(40),
        accent: accentEnum,
        scores: z.array(z.number().int().min(0).max(100)).min(3).max(5),
        note: z.string().max(120).optional(),
      }),
    )
    .min(3)
    .max(6),
  insight: z.string().max(200).optional(),
});

/**
 * `season_weather_fit` — supersedes `conditions_calendar`. **12 months ×
 * 3-5 named dimensions** (e.g. temperature, rainfall, daylight, crowd,
 * operator availability) where every cell carries both a 0-100 score
 * and a discrete status (`closed | poor | fair | good | optimal`). This
 * is a richer signal than a single monthly `fit` rating and lets the
 * heatmap show *why* a month is poor (e.g. closed lifts vs. heavy rain).
 */
const seasonFitStatusEnum = z.enum([
  "closed",
  "poor",
  "fair",
  "good",
  "optimal",
]);

export const seasonWeatherFitSpec = z.object({
  type: z.literal("season_weather_fit"),
  activity_label: z.string().max(60),
  dimensions: z
    .array(
      z.object({
        name: z.string().max(30),
        note: z.string().max(120).optional(),
      }),
    )
    .min(3)
    .max(5),
  months: z
    .array(
      z.object({
        month: monthEnum,
        cells: z
          .array(
            z.object({
              score: z.number().int().min(0).max(100),
              status: seasonFitStatusEnum,
            }),
          )
          .min(3)
          .max(5),
        overall_status: seasonFitStatusEnum.optional(),
        temp_label: z.string().max(20).optional(),
        note: z.string().max(120).optional(),
      }),
    )
    .length(12),
  best_months: z.array(z.string().max(20)).max(6),
  worst_months: z.array(z.string().max(20)).max(6),
  helper: z.string().max(200).optional(),
});


/* ========================================================================== */
/* Task #92 page-type chart specs                                              */
/* ========================================================================== */

/**
 * `entrance_map` — list of named entrances at a CE with a status badge,
 * who each one is for, and an optional wait-time hint. Designed for venues
 * with multiple gates where the visitor's decision is "which door?".
 */
const entranceStatusEnum = z.enum([
  "recommended",
  "avoid",
  "groups",
  "accessible",
  "closed",
  "standard",
]);

export const entranceMapSpec = z.object({
  type: z.literal("entrance_map"),
  venue_label: z.string().max(60).optional(),
  entrances: z
    .array(
      z.object({
        name: z.string().max(60),
        status: entranceStatusEnum,
        wait_label: z.string().max(40).optional(),
        best_for: z.array(z.string().max(40)).max(4).optional(),
        accent: accentEnum.optional(),
        note: z.string().max(160).optional(),
      }),
    )
    .min(2)
    .max(6),
  callout: z.string().max(200).optional(),
});

/**
 * `floor_plan_flow` — recommended order of floors / rooms / wings inside a
 * single venue, with per-stop dwell minutes. Distinct from `itinerary_flow`
 * (city-scale tour) and from `daily_programme` (timed events). FIRST stop
 * must be `start`, LAST must be `end`.
 */
export const floorPlanFlowSpec = z.object({
  type: z.literal("floor_plan_flow"),
  start_label: z.string().max(60).optional(),
  total_min: z.number().int().min(15).max(720).optional(),
  stops: z
    .array(
      z.object({
        name: z.string().max(60),
        level: z.string().max(40).optional(),
        kind: z.enum(["start", "highlight", "stop", "end"]),
        dwell_min: z.number().int().min(0).max(360).optional(),
        accent: accentEnum.optional(),
        note: z.string().max(140).optional(),
      }),
    )
    .min(3)
    .max(10),
  callout: z.string().max(200).optional(),
});

/**
 * `rules_checklist` — what's allowed / restricted / prohibited at a CE.
 * Each item carries a category so the renderer can group them (security,
 * dress code, behavior, items, photography, food). Use ONLY when grounded
 * from the official site or first-party security/dress policy.
 */
const rulesSeverityEnum = z.enum([
  "allowed",
  "restricted",
  "prohibited",
  "required",
]);
const rulesCategoryEnum = z.enum([
  "items",
  "dress",
  "behavior",
  "security",
  "photography",
  "food",
  "other",
]);

export const rulesChecklistSpec = z.object({
  type: z.literal("rules_checklist"),
  headline: z.string().max(80).optional(),
  items: z
    .array(
      z.object({
        label: z.string().max(80),
        severity: rulesSeverityEnum,
        category: rulesCategoryEnum,
        note: z.string().max(140).optional(),
      }),
    )
    .min(4)
    .max(12),
  source_note: z.string().max(200).optional(),
});

/**
 * `transit_options` — how to get to a CE from a common origin (city centre,
 * nearest airport). Each option has a mode, time range, optional cost +
 * frequency labels, and an optional final-leg walking minutes.
 */
const transitModeEnum = z.enum([
  "metro",
  "bus",
  "tram",
  "train",
  "walk",
  "taxi",
  "car",
  "ferry",
  "shuttle",
]);

export const transitOptionsSpec = z.object({
  type: z.literal("transit_options"),
  origin_label: z.string().max(60).optional(),
  destination_label: z.string().max(60).optional(),
  options: z
    .array(
      z.object({
        mode: transitModeEnum,
        label: z.string().max(60),
        minutes_min: z.number().int().min(0).max(720),
        minutes_max: z.number().int().min(0).max(720),
        cost_label: z.string().max(40).optional(),
        frequency_label: z.string().max(60).optional(),
        walk_min: z.number().int().min(0).max(60).optional(),
        accent: accentEnum.optional(),
        recommended: z.boolean().optional(),
        note: z.string().max(160).optional(),
      }),
    )
    .min(2)
    .max(6),
  callout: z.string().max(200).optional(),
});

/**
 * `time_value_matrix` — small set of "trip scenarios" (e.g. Half-day basic,
 * Full-day skip-the-line, Two-day deep dive) scored on 3-6 dimensions
 * (e.g. coverage, queue savings, cost-per-hour, kid-friendliness). The
 * summary must point to one scenario id as `best_value_scenario`.
 */
export const timeValueMatrixSpec = z.object({
  type: z.literal("time_value_matrix"),
  currency: z.string().min(1).max(8).optional(),
  scenarios: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        label: z.string().max(60),
        accent: accentEnum,
        time_label: z.string().max(40).optional(),
        price_label: z.string().max(40).optional(),
        note: z.string().max(140).optional(),
      }),
    )
    .min(2)
    .max(5),
  dimensions: z
    .array(
      z.object({
        label: z.string().max(40),
        scores: z.array(z.number().int().min(0).max(100)).min(2).max(5),
        note: z.string().max(120).optional(),
      }),
    )
    .min(3)
    .max(6),
  summary: z.object({
    best_value_scenario: z.string().min(1).max(40),
    headline: z.string().max(160).optional(),
  }),
  insight: z.string().max(200).optional(),
});

/**
 * `accessibility_guide` — discrete accessibility features at a CE with an
 * availability status (full / partial / none / on_request) and a category.
 * Used on the Plan-Your-Visit page. Must be grounded from the official
 * accessibility page; drop the chart if grounding is thin.
 */
const accessAvailabilityEnum = z.enum([
  "full",
  "partial",
  "none",
  "on_request",
]);
const accessCategoryEnum = z.enum([
  "mobility",
  "sensory",
  "cognitive",
  "services",
  "facilities",
]);

export const accessibilityGuideSpec = z.object({
  type: z.literal("accessibility_guide"),
  headline: z.string().max(80).optional(),
  features: z
    .array(
      z.object({
        label: z.string().max(80),
        category: accessCategoryEnum,
        availability: accessAvailabilityEnum,
        detail: z.string().max(160).optional(),
      }),
    )
    .min(4)
    .max(12),
  contact: z.string().max(160).optional(),
  callout: z.string().max(200).optional(),
});


const baseChartSpecSchema = z.discriminatedUnion("type", [
  weeklyPatternSpec,
  hourlyHeatmapSpec,
  monthCalendarSpec,
  bookingWindowSpec,
  statGridSpec,
  compareZonesSpec,
  donutBreakdownSpec,
  seasonalCurveSpec,
  conditionsCalendarSpec,
  sightingProbabilitySpec,
  departureReliabilitySpec,
  priceCurveSpec,
  ticketLadderSpec,
  dailyPatternSpec,
  tribuneDensitySpec,
  durationProfilesSpec,
  entranceLanesSpec,
  coBookingsSpec,
  zoneCrowdHeatmapSpec,
  zoneWaitHeatmapSpec,
  goldenHourMatchSpec,
  savingsBreakdownSpec,
  returnBufferRankSpec,
  seatValueMapSpec,
  optimalDepartureSpec,
  stopFrequencySpec,
  routeProfileSpec,
  queueCompareSpec,
  durationStatSpec,
  rideWaitCurveSpec,
  activityWindowSpec,
  openingHourRankSpec,
  dailyProgrammeSpec,
  timeSplitSpec,
  historyTimelineSpec,
  slotCompareSpec,
  ticketAccessMatrixSpec,
  durationBudgetSpec,
  landmarkCoverageSpec,
  itineraryFlowSpec,
  bestForMatrixSpec,
  seasonWeatherFitSpec,
  entranceMapSpec,
  floorPlanFlowSpec,
  rulesChecklistSpec,
  transitOptionsSpec,
  timeValueMatrixSpec,
  accessibilityGuideSpec,
]);

export const chartSpecSchema = baseChartSpecSchema.superRefine((val, ctx) => {
  if (val.type === "weekly_pattern") {
    if (new Set(val.days.map((d) => d.day)).size !== 7) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "weekly_pattern.days must contain mon..sun exactly once",
        path: ["days"],
      });
    }
  } else if (val.type === "hourly_heatmap") {
    if (new Set(val.rows.map((r) => r.day)).size !== 7) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "hourly_heatmap.rows must contain mon..sun exactly once",
        path: ["rows"],
      });
    }
    if (val.close_hour <= val.open_hour) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "close_hour must be > open_hour",
        path: ["close_hour"],
      });
    }
  } else if (val.type === "seasonal_curve") {
    if (new Set(val.months.map((m) => m.month)).size !== 12) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "seasonal_curve.months must contain jan..dec exactly once",
        path: ["months"],
      });
    }
  } else if (val.type === "conditions_calendar") {
    if (new Set(val.months.map((m) => m.month)).size !== 12) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "conditions_calendar.months must contain jan..dec exactly once",
        path: ["months"],
      });
    }
  } else if (val.type === "departure_reliability") {
    if (new Set(val.months.map((m) => m.month)).size !== 12) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "departure_reliability.months must contain jan..dec exactly once",
        path: ["months"],
      });
    }
  } else if (val.type === "price_curve") {
    if (new Set(val.points.map((p) => p.month)).size !== 12) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "price_curve.points must contain jan..dec exactly once",
        path: ["points"],
      });
    }
  } else if (val.type === "booking_window") {
    if (val.sweet_spot.days_before_min > val.sweet_spot.days_before_max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sweet_spot.days_before_min must be ≤ days_before_max",
        path: ["sweet_spot"],
      });
    }
  } else if (val.type === "compare_zones") {
    val.zones.forEach((zone, i) => {
      if (zone.wait_min > zone.wait_max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `zones[${i}].wait_min must be ≤ wait_max`,
          path: ["zones", i, "wait_min"],
        });
      }
    });
  } else if (
    val.type === "zone_crowd_heatmap" ||
    val.type === "zone_wait_heatmap"
  ) {
    if (val.close_hour <= val.open_hour) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "close_hour must be > open_hour",
        path: ["close_hour"],
      });
    }
    const names = val.zones.map((z) => z.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "zone names must be unique",
        path: ["zones"],
      });
    }
  } else if (val.type === "ride_wait_curve" || val.type === "activity_window") {
    if (val.close_hour <= val.open_hour) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "close_hour must be > open_hour",
        path: ["close_hour"],
      });
    }
    val.zones.forEach((zone, i) => {
      if (zone.end_hour <= zone.start_hour) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `zones[${i}].end_hour must be > start_hour`,
          path: ["zones", i, "end_hour"],
        });
      }
    });
    const hours = val.hours.map((p) => p.hour);
    if (new Set(hours).size !== 24) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "hours[] must contain hour 0..23 exactly once",
        path: ["hours"],
      });
    }
  } else if (val.type === "golden_hour_match") {
    if (new Set(val.months.map((m) => m.month)).size !== 12) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "golden_hour_match.months must contain jan..dec exactly once",
        path: ["months"],
      });
    }
    const slotCount = val.slots.length;
    val.months.forEach((m, i) => {
      if (m.cells.length !== slotCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `months[${i}].cells must have one entry per slot (${slotCount})`,
          path: ["months", i, "cells"],
        });
      }
    });
  } else if (val.type === "opening_hour_rank") {
    if (val.bands.amber_max <= val.bands.green_max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "bands.amber_max must be > bands.green_max",
        path: ["bands", "amber_max"],
      });
    }
  } else if (val.type === "duration_stat") {
    val.profiles.forEach((p, i) => {
      if (p.range_min > p.range_max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `profiles[${i}].range_min must be ≤ range_max`,
          path: ["profiles", i, "range_min"],
        });
      }
    });
  } else if (val.type === "ticket_ladder") {
    const recCount = val.tiers.filter((t) => t.recommended).length;
    if (recCount > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At most one ticket tier may be recommended",
        path: ["tiers"],
      });
    }
  } else if (val.type === "seat_value_map") {
    const layoutTiers = new Set(val.layout);
    val.sections.forEach((s, i) => {
      if (!layoutTiers.has(s.tier)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `sections[${i}].tier "${s.tier}" not present in layout`,
          path: ["sections", i, "tier"],
        });
      }
    });
    if (val.best_section) {
      const names = new Set(val.sections.map((s) => s.name));
      if (!names.has(val.best_section)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "best_section must match one of sections[].name",
          path: ["best_section"],
        });
      }
    }
  } else if (val.type === "optimal_departure") {
    const ids = val.slots.map((s) => s.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "slots[].id must be unique",
        path: ["slots"],
      });
    }
    if (!ids.includes(val.recommended_slot)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "recommended_slot must match one of slots[].id",
        path: ["recommended_slot"],
      });
    }
  } else if (val.type === "route_profile") {
    let prev = -1;
    val.stops.forEach((stop, i) => {
      if (stop.duration_from_start_min === undefined) return;
      if (stop.duration_from_start_min < prev) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "duration_from_start_min must be non-decreasing",
          path: ["stops", i, "duration_from_start_min"],
        });
      }
      prev = stop.duration_from_start_min;
    });
    if (
      val.total_duration_min !== undefined &&
      val.stops.some(
        (stop) =>
          stop.duration_from_start_min !== undefined &&
          stop.duration_from_start_min > val.total_duration_min!,
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "stops must fall within total_duration_min",
        path: ["stops"],
      });
    }
  } else if (val.type === "daily_programme") {
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + (m || 0);
    };
    const open = toMin(val.open_time);
    const close = toMin(val.close_time);
    if (close <= open) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "close_time must be after open_time",
        path: ["close_time"],
      });
    }
    val.events.forEach((e, i) => {
      const s = toMin(e.start_time);
      if (s < open || s + e.duration_min > close) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `events[${i}] must fall inside open_time..close_time`,
          path: ["events", i, "start_time"],
        });
      }
    });
  } else if (val.type === "time_split") {
    const sum = val.segments.reduce((s, x) => s + x.minutes, 0);
    const tol = Math.max(2, Math.round(val.total_min * 0.05));
    if (Math.abs(sum - val.total_min) > tol) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `segment minutes (${sum}) must sum to within ${tol}m of total_min (${val.total_min})`,
        path: ["segments"],
      });
    }
  } else if (val.type === "history_timeline") {
    for (let i = 1; i < val.events.length; i += 1) {
      if (val.events[i]!.sort_year < val.events[i - 1]!.sort_year) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "history_timeline.events must be in chronological order",
          path: ["events", i, "sort_year"],
        });
      }
    }
    if (
      val.highlight_event &&
      !val.events.some((e) => e.title === val.highlight_event)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "highlight_event must match one events[].title",
        path: ["highlight_event"],
      });
    }
  } else if (val.type === "slot_compare") {
    val.dimensions.forEach((d, i) => {
      if (d.scores.length !== val.slots.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `dimensions[${i}].scores must have one entry per slot (${val.slots.length})`,
          path: ["dimensions", i, "scores"],
        });
      }
    });
    if (val.slots.filter((s) => s.recommended).length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At most one slot may be recommended",
        path: ["slots"],
      });
    }
  } else if (val.type === "ticket_access_matrix") {
    if (val.tiers.filter((t) => t.recommended).length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At most one tier may be recommended",
        path: ["tiers"],
      });
    }
    val.features.forEach((f, i) => {
      if (f.cells.length !== val.tiers.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `features[${i}].cells must have one entry per tier (${val.tiers.length})`,
          path: ["features", i, "cells"],
        });
      }
    });
  } else if (val.type === "duration_budget") {
    const sum = val.blocks.reduce((s, x) => s + x.minutes, 0);
    const tol = Math.max(2, Math.round(val.total_min * 0.05));
    if (Math.abs(sum - val.total_min) > tol) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `block minutes (${sum}) must sum to within ${tol}m of total_min (${val.total_min})`,
        path: ["blocks"],
      });
    }
    // Badge cardinality: at most one of each kind across all blocks.
    const skipIdx: number[] = [];
    const extendIdx: number[] = [];
    val.blocks.forEach((b, i) => {
      if (b.badge === "skip_if_tight") skipIdx.push(i);
      if (b.badge === "extend_if_deep_dive") extendIdx.push(i);
    });
    if (skipIdx.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `At most one block may carry badge='skip_if_tight' (found on blocks: ${skipIdx.join(", ")})`,
        path: ["blocks"],
      });
    }
    if (extendIdx.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `At most one block may carry badge='extend_if_deep_dive' (found on blocks: ${extendIdx.join(", ")})`,
        path: ["blocks"],
      });
    }
  } else if (val.type === "landmark_coverage") {
    val.landmarks.forEach((lm, i) => {
      if (lm.coverage.length !== val.routes.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `landmarks[${i}].coverage must have one entry per route (${val.routes.length})`,
          path: ["landmarks", i, "coverage"],
        });
      }
    });
    if (val.routes.filter((r) => r.recommended).length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At most one route may be recommended",
        path: ["routes"],
      });
    }
  } else if (val.type === "itinerary_flow") {
    if (val.stops[0]?.kind !== "start") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "stops[0].kind must be 'start'",
        path: ["stops", 0, "kind"],
      });
    }
    if (val.stops[val.stops.length - 1]?.kind !== "end") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "last stop must have kind='end'",
        path: ["stops", val.stops.length - 1, "kind"],
      });
    }
    if (val.transits.length !== val.stops.length - 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `transits.length (${val.transits.length}) must equal stops.length - 1 (${val.stops.length - 1})`,
        path: ["transits"],
      });
    }
  } else if (val.type === "best_for_matrix") {
    val.audiences.forEach((a, i) => {
      if (a.scores.length !== val.facets.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `audiences[${i}].scores must have one entry per facet (${val.facets.length})`,
          path: ["audiences", i, "scores"],
        });
      }
    });
    val.facets.forEach((f, i) => {
      if (
        f.top_audience_index != null &&
        f.top_audience_index >= val.audiences.length
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `facets[${i}].top_audience_index out of range`,
          path: ["facets", i, "top_audience_index"],
        });
      }
    });
  } else if (val.type === "floor_plan_flow") {
    if (val.stops[0]?.kind !== "start") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "stops[0].kind must be 'start'",
        path: ["stops", 0, "kind"],
      });
    }
    if (val.stops[val.stops.length - 1]?.kind !== "end") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "last stop must have kind='end'",
        path: ["stops", val.stops.length - 1, "kind"],
      });
    }
  } else if (val.type === "transit_options") {
    val.options.forEach((o, i) => {
      if (o.minutes_min > o.minutes_max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `options[${i}].minutes_min must be ≤ minutes_max`,
          path: ["options", i, "minutes_min"],
        });
      }
    });
    if (val.options.filter((o) => o.recommended).length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At most one transit option may be recommended",
        path: ["options"],
      });
    }
  } else if (val.type === "time_value_matrix") {
    const ids = val.scenarios.map((s) => s.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "scenarios[].id must be unique",
        path: ["scenarios"],
      });
    }
    if (!ids.includes(val.summary.best_value_scenario)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "summary.best_value_scenario must match one of scenarios[].id",
        path: ["summary", "best_value_scenario"],
      });
    }
    val.dimensions.forEach((d, i) => {
      if (d.scores.length !== val.scenarios.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `dimensions[${i}].scores must have one entry per scenario (${val.scenarios.length})`,
          path: ["dimensions", i, "scores"],
        });
      }
    });
  } else if (val.type === "season_weather_fit") {
    if (new Set(val.months.map((m) => m.month)).size !== 12) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "season_weather_fit.months must contain jan..dec exactly once",
        path: ["months"],
      });
    }
    val.months.forEach((m, i) => {
      if (m.cells.length !== val.dimensions.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `months[${i}].cells must have one entry per dimension (${val.dimensions.length})`,
          path: ["months", i, "cells"],
        });
      }
    });
  }
});

export type ChartSpec = z.infer<typeof chartSpecSchema>;

export const aiChartSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "slug must be kebab-case"),
  question: z.string().min(4).max(160),
  title: z.string().min(2).max(80),
  subtitle: z.string().max(140).default(""),
  insight: z.string().max(200).default(""),
  spec: chartSpecSchema,
});

export type AiChart = z.infer<typeof aiChartSchema>;

export const aiCePayloadSchema = z
  .object({
    summary: z.string().max(400).default(""),
    emoji: z.string().max(8).default("📍"),
    charts: z.array(aiChartSchema).min(4).max(7),
  })
  .superRefine((val, ctx) => {
    const types = val.charts.map((c) => c.spec.type);
    if (new Set(types).size !== types.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "charts must have unique chart types (no duplicates per CE)",
        path: ["charts"],
      });
    }
    const slugs = val.charts.map((c) => c.slug);
    if (new Set(slugs).size !== slugs.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "charts must have unique slugs",
        path: ["charts"],
      });
    }
  });

export type AiCePayload = z.infer<typeof aiCePayloadSchema>;

export const CHART_TYPES = [
  "weekly_pattern",
  "hourly_heatmap",
  "month_calendar",
  "booking_window",
  "stat_grid",
  "compare_zones",
  "donut_breakdown",
  "seasonal_curve",
  "ticket_ladder",
  "zone_crowd_heatmap",
  "zone_wait_heatmap",
  "golden_hour_match",
  "savings_breakdown",
  "return_buffer_rank",
  "seat_value_map",
  "optimal_departure",
  "stop_frequency",
  "route_profile",
  "queue_compare",
  "duration_stat",
  "ride_wait_curve",
  "activity_window",
  "opening_hour_rank",
  "daily_programme",
  "time_split",
  "history_timeline",
  "slot_compare",
  "ticket_access_matrix",
  "duration_budget",
  "landmark_coverage",
  "itinerary_flow",
  "best_for_matrix",
  "season_weather_fit",
  "entrance_map",
  "floor_plan_flow",
  "rules_checklist",
  "transit_options",
  "time_value_matrix",
  "accessibility_guide",
] as const;
