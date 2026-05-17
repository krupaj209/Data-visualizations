/**
 * Page Deck Engine — Core Types
 *
 * A "deck" is a complete visual narrative for a specific page type.
 * Each deck has sections. Each section has 1 chart + editorial overlay.
 *
 * This replaces the flat Question[] model with a structured page experience.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Page Types
// ─────────────────────────────────────────────────────────────

export const PageType = z.enum([
  "plan-your-visit",
  "skip-the-line",
  "entrances",
  "history",
  "map-floor-plan",
  "tickets-pricing",
  "reviews-experiences",
  "combo-deals",
]);

export type PageType = z.infer<typeof PageType>;

// ─────────────────────────────────────────────────────────────
// Section Archetypes (narrative roles, not data types)
// ─────────────────────────────────────────────────────────────

export const SectionArchetype = z.enum([
  "timing",           // When to go
  "duration",         // How long it takes
  "logistics",        // Getting there, rules, what to bring
  "value",            // Is it worth it, comparisons, savings
  "experience",       // What happens inside, flow, highlights
  "context",          // History, significance, why it matters
  "practical",        // Tickets, booking, cancellations
  "social",           // Reviews, crowd sentiment, tips
  "navigation",       // Map, entrances, routes, accessibility
]);

export type SectionArchetype = z.infer<typeof SectionArchetype>;

// ─────────────────────────────────────────────────────────────
// Question Graph Node (enhanced from flat question bank)
// ─────────────────────────────────────────────────────────────

export const QuestionGraphNode = z.object({
  questionId: z.string(),
  chartTypes: z.array(z.string()), // Which chart types can answer this
  archetype: SectionArchetype,

  // Narrative positioning
  headlineTemplate: z.string(),      // "Best time to visit {ceName}"
  subheadlineTemplate: z.string(),   // "Based on {months} of crowd data"

  // Dependencies & conflicts
  requires: z.array(z.string()).optional(),
  conflictsWith: z.array(z.string()).optional(),
  enhances: z.array(z.string()).optional(),

  // CE signals (when is this question relevant?)
  ceSignals: z.object({
    minVisitorVolume: z.number().optional(),      // Only for high-traffic CEs
    hasSeasonalVariation: z.boolean().optional(),
    hasMultipleEntrances: z.boolean().optional(),
    hasSkipTheLine: z.boolean().optional(),
    hasAudioGuide: z.boolean().optional(),
    hasGuidedTours: z.boolean().optional(),
    hasRestrictedItems: z.boolean().optional(),
    hasAccessibilityNeeds: z.boolean().optional(),
    typicalVisitDuration: z.object({
      min: z.number(),
      max: z.number(),
    }).optional(),
  }).optional(),

  // Page-type variants (contextualized for each page type)
  pageVariants: z.record(
    PageType,
    z.object({
      headline: z.string(),
      subheadline: z.string(),
      priority: z.number().min(1).max(10), // 1 = must-have, 10 = nice-to-have
      maxCharts: z.number().optional(),
    })
  ).optional(),

  // Editorial defaults
  editorialDefaults: z.object({
    ctaTemplate: z.string().optional(),
    confidenceBadge: z.enum(["high", "medium", "low"]).optional(),
    fallbackMessage: z.string().optional(),
  }).optional(),
});

export type QuestionGraphNode = z.infer<typeof QuestionGraphNode>;

// ─────────────────────────────────────────────────────────────
// Section Definition (within a deck template)
// ─────────────────────────────────────────────────────────────

export const SectionDefinition = z.object({
  id: z.string(),                    // "timing-when-to-go"
  archetype: SectionArchetype,
  name: z.string(),                  // "When to Go"
  description: z.string(),           // "Optimal visit timing based on crowd patterns"

  // Question selection
  questionPool: z.array(z.string()), // Question IDs eligible for this section
  maxQuestions: z.number().optional(),
  minQuestions: z.number().optional(),

  // Visual constraints
  preferredChartTypes: z.array(z.string()).optional(),
  forbiddenChartTypes: z.array(z.string()).optional(),

  // Layout
  layout: z.enum(["full", "half", "third", "hero"]).optional(),
  supportsPersonalization: z.boolean().optional(),
});

export type SectionDefinition = z.infer<typeof SectionDefinition>;

// ─────────────────────────────────────────────────────────────
// Page Deck Template
// ─────────────────────────────────────────────────────────────

export const PageDeckTemplate = z.object({
  id: PageType,
  name: z.string(),
  description: z.string(),

  // Narrative context passed to AI
  narrativeContext: z.object({
    visitorState: z.string(),        // "just booked, needs logistics"
    goal: z.string(),                // "reduce anxiety, set expectations"
    tone: z.string(),                // "reassuring, practical"
    priority: z.string(),            // "queue times > history > art details"
  }),

  // Sections in narrative order
  sections: z.array(SectionDefinition),

  // Deck constraints
  maxTotalSections: z.number().optional(),
  maxTotalCharts: z.number().optional(),
  minTotalSections: z.number().optional(),

  // Global rules
  requiredArchetypes: z.array(SectionArchetype).optional(),
  forbiddenArchetypes: z.array(SectionArchetype).optional(),
});

export type PageDeckTemplate = z.infer<typeof PageDeckTemplate>;

// ─────────────────────────────────────────────────────────────
// Resolved Section (output of the deck builder)
// ─────────────────────────────────────────────────────────────

export const ResolvedSection = z.object({
  id: z.string(),
  archetype: SectionArchetype,
  name: z.string(),

  // Selected question & chart
  question: QuestionGraphNode,
  chartType: z.string(),
  chartSpec: z.any(), // ChartSpec — imported from api-spec

  // Editorial overlay
  editorial: z.object({
    headline: z.string(),
    subheadline: z.string(),
    cta: z.string().optional(),
    confidenceBadge: z.enum(["high", "medium", "low"]),
    lastUpdated: z.date().or(z.string()),
    personalizationNote: z.string().optional(),
  }),

  // Layout
  layout: z.enum(["full", "half", "third", "hero"]),

  // Metadata
  generationMetadata: z.object({
    drdConfidence: z.number(),
    aiRationale: z.string(),
    dataFreshness: z.enum(["live", "daily", "weekly", "monthly", "stale"]),
  }),
});

export type ResolvedSection = z.infer<typeof ResolvedSection>;

// ─────────────────────────────────────────────────────────────
// Complete Deck Output
// ─────────────────────────────────────────────────────────────

export const ResolvedDeck = z.object({
  ceSlug: z.string(),
  pageType: PageType,
  sections: z.array(ResolvedSection),

  // Deck-level metadata
  metadata: z.object({
    totalSections: z.number(),
    totalCharts: z.number(),
    estimatedReadTime: z.number(), // seconds
    personalizationApplied: z.boolean(),
    lastGenerated: z.date().or(z.string()),
    drdVersion: z.string(),
  }),

  // Fallbacks for missing sections
  missingSections: z.array(z.object({
    archetype: SectionArchetype,
    reason: z.string(),
    fallbackMessage: z.string(),
  })).optional(),
});

export type ResolvedDeck = z.infer<typeof ResolvedDeck>;
