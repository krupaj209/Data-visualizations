/**
 * Editorial Overlay System — Core Types
 *
 * The editorial layer transforms raw chart data into
 * narrative, actionable content that drives conversion.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Editorial Tone (brand voice variants)
// ─────────────────────────────────────────────────────────────

export const EditorialTone = z.enum([
  "reassuring",
  "urgent",
  "authoritative",
  "insider",
  "empathetic",
  "confident",
]);

export type EditorialTone = z.infer<typeof EditorialTone>;

// ─────────────────────────────────────────────────────────────
// Visitor Context (for personalization)
// ─────────────────────────────────────────────────────────────

export const VisitorContext = z.object({
  visitMonth: z.number().min(1).max(12).optional(),
  visitDayOfWeek: z.number().min(0).max(6).optional(),
  visitTimeOfDay: z.enum(["morning", "afternoon", "evening"]).optional(),
  daysUntilVisit: z.number().optional(),

  groupSize: z.number().min(1).optional(),
  hasChildren: z.boolean().optional(),
  hasSeniors: z.boolean().optional(),
  hasMobilityNeeds: z.boolean().optional(),

  budgetPriority: z.enum(["low", "medium", "high"]).optional(),
  timePriority: z.enum(["relaxed", "balanced", "rushed"]).optional(),
  interestLevel: z.enum(["casual", "enthusiast", "expert"]).optional(),

  hasBooked: z.boolean().optional(),
  isResearching: z.boolean().optional(),
  isLastMinute: z.boolean().optional(),

  referrerPage: z.string().optional(),
  device: z.enum(["mobile", "tablet", "desktop"]).optional(),
});

export type VisitorContext = z.infer<typeof VisitorContext>;

// ─────────────────────────────────────────────────────────────
// Editorial Element (single piece of copy)
// ─────────────────────────────────────────────────────────────

export const EditorialElement = z.object({
  id: z.string(),
  type: z.enum([
    "headline",
    "subheadline",
    "body",
    "cta",
    "tip",
    "warning",
    "fallback",
    "personalization_note",
    "social_proof",
    "timestamp",
  ]),

  content: z.string(),

  variables: z.record(z.string()).default({}),

  priority: z.number().min(1).max(10).default(5),
  tone: EditorialTone.default("reassuring"),

  showIf: z
    .object({
      hasData: z.boolean().optional(),
      confidenceAbove: z.number().optional(),
      visitorContextMatch: z.record(z.any()).optional(),
    })
    .optional(),
});

export type EditorialElement = z.infer<typeof EditorialElement>;

// ─────────────────────────────────────────────────────────────
// Complete Editorial Overlay
// ─────────────────────────────────────────────────────────────

export const EditorialOverlay = z.object({
  headline: z.string(),
  subheadline: z.string(),

  cta: z
    .object({
      text: z.string(),
      url: z.string().optional(),
      icon: z.string().optional(),
      variant: z.enum(["primary", "secondary", "ghost"]).default("primary"),
    })
    .optional(),

  tip: z
    .object({
      icon: z.string().default("💡"),
      text: z.string(),
      highlight: z.boolean().default(false),
    })
    .optional(),

  warning: z
    .object({
      icon: z.string().default("⚠️"),
      text: z.string(),
      severity: z.enum(["info", "warning", "alert"]).default("info"),
    })
    .optional(),

  personalizationNote: z.string().optional(),

  confidence: z.object({
    level: z.enum(["high", "medium", "low"]),
    explanation: z.string().optional(),
    dataPoints: z.number().optional(),
    dateRange: z.string().optional(),
  }),

  fallback: z
    .object({
      message: z.string(),
      alternative: z.string().optional(),
      action: z.string().optional(),
    })
    .optional(),

  socialProof: z
    .object({
      stat: z.string(),
      source: z.string().optional(),
    })
    .optional(),

  freshness: z.object({
    lastUpdated: z.date().or(z.string()),
    updateFrequency: z.enum(["live", "hourly", "daily", "weekly", "monthly"]),
    nextUpdate: z.date().or(z.string()).optional(),
  }),

  generatedAt: z.date().or(z.string()),
  generatedBy: z.enum(["ai", "curated", "hybrid"]).default("ai"),
  templateId: z.string().optional(),
});

export type EditorialOverlay = z.infer<typeof EditorialOverlay>;

// ─────────────────────────────────────────────────────────────
// Template Definition (for AI generation)
// ─────────────────────────────────────────────────────────────

export const EditorialTemplate = z.object({
  id: z.string(),

  forPageTypes: z.array(z.string()),
  forChartTypes: z.array(z.string()),
  forArchetypes: z.array(z.string()),

  headlineTemplates: z.array(
    z.object({
      template: z.string(),
      priority: z.number(),
      tone: EditorialTone,
      condition: z.string().optional(),
    }),
  ),

  subheadlineTemplates: z.array(
    z.object({
      template: z.string(),
      priority: z.number(),
      tone: EditorialTone,
    }),
  ),

  ctaTemplates: z.array(
    z.object({
      template: z.string(),
      urlTemplate: z.string().optional(),
      priority: z.number(),
      variant: z.enum(["primary", "secondary", "ghost"]),
      condition: z.string().optional(),
    }),
  ),

  tipTemplates: z
    .array(
      z.object({
        template: z.string(),
        condition: z.string().optional(),
      }),
    )
    .optional(),

  warningTemplates: z
    .array(
      z.object({
        template: z.string(),
        severity: z.enum(["info", "warning", "alert"]),
        condition: z.string().optional(),
      }),
    )
    .optional(),

  variables: z.record(
    z.object({
      source: z.enum(["chartData", "ceData", "visitorContext", "computed"]),
      /** Optional source-field name; defaults to the variable key. Use when the template name aliases a differently-named source field. */
      key: z.string().optional(),
      fallback: z.string(),
    }),
  ),
});

export type EditorialTemplate = z.infer<typeof EditorialTemplate>;
