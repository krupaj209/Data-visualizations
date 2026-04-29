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

const baseChartSpecSchema = z.discriminatedUnion("type", [
  weeklyPatternSpec,
  hourlyHeatmapSpec,
  monthCalendarSpec,
  bookingWindowSpec,
  statGridSpec,
  compareZonesSpec,
  donutBreakdownSpec,
  seasonalCurveSpec,
  ticketLadderSpec,
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
  } else if (val.type === "ticket_ladder") {
    const recCount = val.tiers.filter((t) => t.recommended).length;
    if (recCount > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At most one ticket tier may be recommended",
        path: ["tiers"],
      });
    }
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
] as const;
