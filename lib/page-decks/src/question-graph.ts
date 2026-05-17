/**
 * Question Graph
 *
 * Replaces the flat question bank with a graph of questions
 * that have dependencies, conflicts, and page-type variants.
 */

import { QuestionGraphNode } from "./types";

export const questionGraph: Record<string, QuestionGraphNode> = {

  // ─────────────────────────────────────────────────────────
  // TIMING
  // ─────────────────────────────────────────────────────────

  weekly_pattern: {
    questionId: "weekly_pattern",
    chartTypes: ["weekly_pattern", "month_calendar", "seasonal_curve"],
    archetype: "timing",
    headlineTemplate: "Best Day to Visit {ceName}",
    subheadlineTemplate: "Based on {months} of crowd data",

    requires: [],
    conflictsWith: ["month_calendar"], // Pick one primary timing view
    enhances: ["hourly_heatmap"],

    ceSignals: {
      hasSeasonalVariation: true,
    },

    pageVariants: {
      "plan-your-visit": {
        headline: "Best Day to Visit",
        subheadline: "Skip the crowds with this day-by-day breakdown",
        priority: 1,
        maxCharts: 1,
      },
      "skip-the-line": {
        headline: "When Skip-the-Line Saves the Most Time",
        subheadline: "The days where the standard queue is brutal",
        priority: 3,
        maxCharts: 1,
      },
      "entrances": {
        headline: "Busiest Days by Entrance",
        subheadline: "Which entrance to avoid on which day",
        priority: 4,
        maxCharts: 1,
      },
    },

    editorialDefaults: {
      ctaTemplate: "Book for {bestDay} →",
      confidenceBadge: "high",
      fallbackMessage: "We don't have enough crowd data yet — book midweek to be safe",
    },
  },

  hourly_heatmap: {
    questionId: "hourly_heatmap",
    chartTypes: ["hourly_heatmap", "zone_crowd_heatmap"],
    archetype: "timing",
    headlineTemplate: "Best Time of Day",
    subheadlineTemplate: "Hour-by-hour crowd intensity",

    requires: [],
    conflictsWith: [],
    enhances: ["weekly_pattern"],

    ceSignals: {
      hasSeasonalVariation: true,
    },

    pageVariants: {
      "plan-your-visit": {
        headline: "Best Time of Day to Visit",
        subheadline: "Arrive at the right moment, skip the crush",
        priority: 2,
        maxCharts: 1,
      },
      "skip-the-line": {
        headline: "When the Skip-the-Line Advantage Peaks",
        subheadline: "Standard queue times vs. your fast-track access",
        priority: 2,
        maxCharts: 1,
      },
    },

    editorialDefaults: {
      ctaTemplate: "Book the {bestTime} slot →",
      confidenceBadge: "high",
    },
  },

  // ─────────────────────────────────────────────────────────
  // DURATION
  // ─────────────────────────────────────────────────────────

  duration_stat: {
    questionId: "duration_stat",
    chartTypes: ["duration_stat", "duration_profiles"],
    archetype: "duration",
    headlineTemplate: "How Long You'll Need at {ceName}",
    subheadlineTemplate: "From express visit to deep dive",

    requires: [],
    conflictsWith: [],
    enhances: [],

    ceSignals: {
      typicalVisitDuration: { min: 30, max: 300 },
    },

    pageVariants: {
      "plan-your-visit": {
        headline: "How Long You'll Need",
        subheadline: "Plan your Florence day around the right visit length",
        priority: 2,
        maxCharts: 1,
      },
    },

    editorialDefaults: {
      ctaTemplate: "See all ticket durations →",
      confidenceBadge: "high",
    },
  },

  // ─────────────────────────────────────────────────────────
  // LOGISTICS
  // ─────────────────────────────────────────────────────────

  rules_checklist: {
    questionId: "rules_checklist",
    chartTypes: ["rules_checklist", "prohibited_items"],
    archetype: "logistics",
    headlineTemplate: "What You Can & Can't Bring",
    subheadlineTemplate: "Security rules that catch visitors off guard",

    requires: [],
    conflictsWith: [],
    enhances: [],

    ceSignals: {
      hasRestrictedItems: true,
    },

    pageVariants: {
      "plan-your-visit": {
        headline: "What to Know Before You Arrive",
        subheadline: "Security, dress code, and prohibited items",
        priority: 4,
        maxCharts: 1,
      },
      "entrances": {
        headline: "Security Check by Entrance",
        subheadline: "What to expect at each security point",
        priority: 5,
        maxCharts: 1,
      },
    },

    editorialDefaults: {
      ctaTemplate: "Download checklist →",
      confidenceBadge: "high",
      fallbackMessage: "Security rules change — check official website 24h before visit",
    },
  },

  transit_options: {
    questionId: "transit_options",
    chartTypes: ["transit_options", "entrance_map"],
    archetype: "logistics",
    headlineTemplate: "Getting to {ceName}",
    subheadlineTemplate: "Bus, tram, walk, or taxi — ranked by speed and cost",

    requires: [],
    conflictsWith: [],
    enhances: ["entrance_map"],

    ceSignals: {},

    pageVariants: {
      "plan-your-visit": {
        headline: "Getting There",
        subheadline: "The fastest ways from Florence city center",
        priority: 5,
        maxCharts: 1,
      },
      "entrances": {
        headline: "Nearest Transit to Each Entrance",
        subheadline: "Get off at the right stop",
        priority: 3,
        maxCharts: 1,
      },
    },

    editorialDefaults: {
      ctaTemplate: "Get directions →",
      confidenceBadge: "medium",
    },
  },

  // ─────────────────────────────────────────────────────────
  // VALUE
  // ─────────────────────────────────────────────────────────

  queue_compare: {
    questionId: "queue_compare",
    // Task #163: `entrance_lanes` is the canonical line/lane chart now.
    // `queue_compare` stays in the list so any already-published queue_compare
    // chart can still satisfy this node when the deck builder reuses it.
    chartTypes: ["entrance_lanes", "queue_compare", "time_value_matrix"],
    archetype: "value",
    headlineTemplate: "Standard Queue vs Skip-the-Line",
    subheadlineTemplate: "The time you'll save, hour by hour",

    requires: [],
    conflictsWith: [],
    enhances: ["ticket_ladder"],

    ceSignals: {
      hasSkipTheLine: true,
    },

    pageVariants: {
      "skip-the-line": {
        headline: "How Much Time You'll Save",
        subheadline: "Real queue times: standard ticket vs. your fast pass",
        priority: 1,
        maxCharts: 1,
      },
    },

    editorialDefaults: {
      ctaTemplate: "Skip the line from €{price} →",
      confidenceBadge: "high",
    },
  },

  time_value_matrix: {
    questionId: "time_value_matrix",
    chartTypes: ["time_value_matrix", "savings_breakdown"],
    archetype: "value",
    headlineTemplate: "Is Skip-the-Line Worth It for You?",
    subheadlineTemplate: "Time saved vs. extra cost, by visitor type",

    requires: ["queue_compare"],
    conflictsWith: [],
    enhances: [],

    ceSignals: {
      hasSkipTheLine: true,
    },

    pageVariants: {
      "skip-the-line": {
        headline: "Is It Worth the Extra Cost?",
        subheadline: "The ROI breakdown: time, money, and stress saved",
        priority: 2,
        maxCharts: 1,
      },
    },

    editorialDefaults: {
      ctaTemplate: "See pricing →",
      confidenceBadge: "medium",
    },
  },

  // ─────────────────────────────────────────────────────────
  // EXPERIENCE
  // ─────────────────────────────────────────────────────────

  floor_plan_flow: {
    questionId: "floor_plan_flow",
    chartTypes: ["floor_plan_flow", "zone_crowd_heatmap", "highlight_route"],
    archetype: "experience",
    headlineTemplate: "Inside {ceName}: Room by Room",
    subheadlineTemplate: "The optimal route through the highlights",

    requires: [],
    conflictsWith: [],
    enhances: [],

    ceSignals: {},

    pageVariants: {
      "plan-your-visit": {
        headline: "Inside the Venue",
        subheadline: "Room-by-room flow: what to see, what to skip",
        priority: 5,
        maxCharts: 1,
      },
      "map-floor-plan": {
        headline: "Interactive Floor Plan",
        subheadline: "Tap any room for crowd level and must-see rating",
        priority: 1,
        maxCharts: 1,
      },
    },

    editorialDefaults: {
      ctaTemplate: "See full floor plan →",
      confidenceBadge: "medium",
      fallbackMessage: "Floor plan coming soon — ask staff for a map at entry",
    },
  },

  // ─────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────

  entrance_map: {
    questionId: "entrance_map",
    chartTypes: ["entrance_map", "transit_options"],
    archetype: "navigation",
    headlineTemplate: "{ceName} Entrances",
    subheadlineTemplate: "Where to go, what to expect at each door",

    requires: [],
    conflictsWith: [],
    enhances: ["entrance_queue_map"],

    ceSignals: {
      hasMultipleEntrances: true,
    },

    pageVariants: {
      "entrances": {
        headline: "Entrance Locations",
        subheadline: "Interactive map with landmarks and walking directions",
        priority: 1,
        maxCharts: 1,
      },
      "plan-your-visit": {
        headline: "Getting There",
        subheadline: "Main entrance and alternative access points",
        priority: 6,
        maxCharts: 1,
      },
    },

    editorialDefaults: {
      ctaTemplate: "Get directions to main entrance →",
      confidenceBadge: "high",
    },
  },

  entrance_queue_map: {
    questionId: "entrance_queue_map",
    chartTypes: ["entrance_queue_map", "hourly_heatmap"],
    archetype: "navigation",
    headlineTemplate: "Wait Times by Entrance",
    subheadlineTemplate: "Current conditions and typical patterns",

    requires: ["entrance_map"],
    conflictsWith: [],
    enhances: [],

    ceSignals: {
      hasMultipleEntrances: true,
    },

    pageVariants: {
      "entrances": {
        headline: "Wait Times by Entrance",
        subheadline: "Which door is fastest right now",
        priority: 2,
        maxCharts: 1,
      },
    },

    editorialDefaults: {
      ctaTemplate: "Book fastest entrance →",
      confidenceBadge: "medium",
    },
  },

  // ─────────────────────────────────────────────────────────
  // CONTEXT (History)
  // ─────────────────────────────────────────────────────────

  story_timeline: {
    questionId: "story_timeline",
    chartTypes: ["story_timeline", "history_timeline"],
    archetype: "context",
    headlineTemplate: "The Story of {ceName}",
    subheadlineTemplate: "From founding to today, the moments that matter",

    requires: [],
    conflictsWith: [],
    enhances: [],

    ceSignals: {},

    pageVariants: {
      "history": {
        headline: "The Story",
        subheadline: "Key moments in the life of this landmark",
        priority: 1,
        maxCharts: 1,
      },
    },

    editorialDefaults: {
      ctaTemplate: "Explore full history →",
      confidenceBadge: "high",
    },
  },

  artifact_map: {
    questionId: "artifact_map",
    chartTypes: ["artifact_map", "highlight_route"],
    archetype: "experience",
    headlineTemplate: "Must-See Highlights",
    subheadlineTemplate: "The unmissable works and where to find them",

    requires: [],
    conflictsWith: [],
    enhances: ["floor_plan_flow"],

    ceSignals: {},

    pageVariants: {
      "history": {
        headline: "Must-See Highlights",
        subheadline: "The masterpieces and their stories",
        priority: 3,
        maxCharts: 1,
      },
      "plan-your-visit": {
        headline: "Don't Miss These",
        subheadline: "The highlights worth planning around",
        priority: 7,
        maxCharts: 1,
      },
    },

    editorialDefaults: {
      ctaTemplate: "See all highlights →",
      confidenceBadge: "high",
    },
  },

  // ─────────────────────────────────────────────────────────
  // PRACTICAL
  // ─────────────────────────────────────────────────────────

  ticket_ladder: {
    questionId: "ticket_ladder",
    chartTypes: ["ticket_ladder", "compare_zones"],
    archetype: "practical",
    headlineTemplate: "Which Ticket Fits You",
    subheadlineTemplate: "Compare features, prices, and flexibility",

    requires: [],
    conflictsWith: [],
    enhances: [],

    ceSignals: {},

    pageVariants: {
      "plan-your-visit": {
        headline: "Which Ticket Fits You",
        subheadline: "Standard, skip-the-line, guided, or combo — compared",
        priority: 3,
        maxCharts: 1,
      },
      "tickets-pricing": {
        headline: "All Ticket Options",
        subheadline: "Side-by-side comparison of every ticket type",
        priority: 1,
        maxCharts: 1,
      },
    },

    editorialDefaults: {
      ctaTemplate: "Compare & book →",
      confidenceBadge: "high",
    },
  },

  // ─────────────────────────────────────────────────────────
  // SOCIAL
  // ─────────────────────────────────────────────────────────

  review_sentiment: {
    questionId: "review_sentiment",
    chartTypes: ["review_sentiment", "testimonial_highlight"],
    archetype: "social",
    headlineTemplate: "What Visitors Say",
    subheadlineTemplate: "Real reviews, real experiences",

    requires: [],
    conflictsWith: [],
    enhances: [],

    ceSignals: {},

    pageVariants: {
      "skip-the-line": {
        headline: "What Skip-the-Line Buyers Say",
        subheadline: "Verified reviews from people who used this ticket",
        priority: 4,
        maxCharts: 1,
      },
      "reviews-experiences": {
        headline: "Visitor Sentiment",
        subheadline: "What people love, what they warn about",
        priority: 1,
        maxCharts: 1,
      },
    },

    editorialDefaults: {
      ctaTemplate: "Read all reviews →",
      confidenceBadge: "medium",
    },
  },
};

// ─────────────────────────────────────────────────────────
// Graph Queries
// ─────────────────────────────────────────────────────────

export function getQuestionById(id: string): QuestionGraphNode | undefined {
  return questionGraph[id];
}

export function getQuestionsByArchetype(archetype: string): QuestionGraphNode[] {
  return Object.values(questionGraph).filter(q => q.archetype === archetype);
}

export function getQuestionsForPageType(pageType: string): QuestionGraphNode[] {
  return Object.values(questionGraph).filter(q =>
    q.pageVariants && pageType in q.pageVariants
  );
}

export function resolveConflicts(selected: string[]): string[] {
  const selectedNodes = selected.map(id => questionGraph[id]).filter(Boolean);
  const toRemove = new Set<string>();

  for (const node of selectedNodes) {
    for (const conflictId of node.conflictsWith ?? []) {
      if (selected.includes(conflictId) && !toRemove.has(node.questionId)) {
        const other = questionGraph[conflictId];
        if (!other) continue;
        const thisPriority = Math.min(...Object.values(node.pageVariants || {}).map(v => v.priority));
        const otherPriority = Math.min(...Object.values(other.pageVariants || {}).map(v => v.priority));

        if (thisPriority > otherPriority) {
          toRemove.add(node.questionId);
        } else {
          toRemove.add(conflictId);
        }
      }
    }
  }

  return selected.filter(id => !toRemove.has(id));
}
