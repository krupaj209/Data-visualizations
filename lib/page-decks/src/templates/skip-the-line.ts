/**
 * Skip the Line — Page Deck Template
 *
 * Conversion-focused. Proves value, shows time savings, explains mechanics.
 */

import { PageDeckTemplate } from "../types";

export const skipTheLineTemplate: PageDeckTemplate = {
  id: "skip-the-line",
  name: "Skip the Line",
  description: "Why skip-the-line tickets are worth it, with proof",

  narrativeContext: {
    visitorState: "comparing options, price-sensitive but time-constrained",
    goal: "justify premium price with concrete time savings",
    tone: "confident, evidence-backed, urgency-tinged",
    priority: "time savings > price comparison > how it works > reviews",
  },

  sections: [
    {
      id: "value-time-saved",
      archetype: "value",
      name: "How Much Time You'll Save",
      description: "Queue time comparison: standard vs skip-the-line",
      questionPool: ["queue_compare", "weekly_pattern", "hourly_heatmap"],
      maxQuestions: 1,
      // Task #163: `entrance_lanes` is the canonical line/lane chart now.
      // `queue_compare` is retained as a fallback so any already-published
      // queue_compare chart can still satisfy this section.
      preferredChartTypes: ["entrance_lanes", "queue_compare"],
      layout: "hero",
      supportsPersonalization: true,
    },
    {
      id: "value-worth-it",
      archetype: "value",
      name: "Is It Worth the Extra Cost?",
      description: "Price vs time ROI analysis",
      questionPool: ["time_value_matrix", "ticket_ladder", "savings_breakdown"],
      maxQuestions: 1,
      preferredChartTypes: ["time_value_matrix"],
      layout: "half",
    },
    {
      id: "practical-how-it-works",
      archetype: "practical",
      name: "How Skip-the-Line Actually Works",
      description: "Entrance process, meeting point, what to expect",
      questionPool: ["entrance_map", "rules_checklist"],
      maxQuestions: 1,
      preferredChartTypes: ["entrance_map"],
      layout: "half",
    },
    {
      id: "timing-best-slots",
      archetype: "timing",
      name: "Best Time Slots for Skip-the-Line",
      description: "When the skip-the-line advantage is greatest",
      questionPool: ["hourly_heatmap", "weekly_pattern"],
      maxQuestions: 1,
      preferredChartTypes: ["hourly_heatmap"],
      layout: "half",
    },
    {
      id: "social-proof",
      archetype: "social",
      name: "What Visitors Say",
      description: "Review sentiment on skip-the-line experience",
      questionPool: ["review_sentiment", "testimonial_highlight"],
      maxQuestions: 1,
      layout: "third",
    },
  ],

  maxTotalSections: 5,
  maxTotalCharts: 5,
  minTotalSections: 3,
  requiredArchetypes: ["value"],
};
