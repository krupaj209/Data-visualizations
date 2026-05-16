/**
 * History — Page Deck Template
 *
 * Narrative-driven. Storytelling, not dataviz. Scrollytelling feel.
 */

import { PageDeckTemplate } from "../types";

export const historyTemplate: PageDeckTemplate = {
  id: "history",
  name: "History & Significance",
  description: "The story behind the attraction, told visually",

  narrativeContext: {
    visitorState: "curious, wants deeper connection to the place",
    goal: "create emotional resonance and appreciation",
    tone: "narrative, reverent, surprising",
    priority: "story > timeline > artifacts > significance",
  },

  sections: [
    {
      id: "context-story-timeline",
      archetype: "context",
      name: "The Story",
      description: "Key historical moments in narrative sequence",
      questionPool: ["story_timeline", "history_timeline"],
      maxQuestions: 1,
      preferredChartTypes: ["story_timeline"],
      layout: "hero",
    },
    {
      id: "context-significance",
      archetype: "context",
      name: "Why It Matters",
      description: "Cultural and historical significance",
      questionPool: ["significance_map", "influence_network"],
      maxQuestions: 1,
      layout: "full",
    },
    {
      id: "experience-artifacts",
      archetype: "experience",
      name: "Must-See Highlights",
      description: "Key artworks, rooms, or features with context",
      questionPool: ["artifact_map", "highlight_route"],
      maxQuestions: 1,
      preferredChartTypes: ["artifact_map"],
      layout: "half",
    },
    {
      id: "social-visitor-tips",
      archetype: "social",
      name: "Insider Tips",
      description: "What longtime visitors recommend",
      questionPool: ["visitor_tips", "review_sentiment"],
      maxQuestions: 1,
      layout: "third",
    },
  ],

  maxTotalSections: 4,
  maxTotalCharts: 4,
  minTotalSections: 2,
  requiredArchetypes: ["context"],
};
