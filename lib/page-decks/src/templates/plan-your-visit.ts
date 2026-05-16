/**
 * Plan Your Visit — Page Deck Template
 *
 * The hero template. Covers: when to go, how long, what to bring,
 * getting there, and what happens inside.
 */

import { PageDeckTemplate } from "../types";

export const planYourVisitTemplate: PageDeckTemplate = {
  id: "plan-your-visit",
  name: "Plan Your Visit",
  description: "Complete visitor guide: timing, duration, logistics, and insider tips",

  narrativeContext: {
    visitorState: "researching or just booked, needs practical logistics",
    goal: "reduce pre-visit anxiety and set clear expectations",
    tone: "reassuring, practical, insider-smart",
    priority: "queue times > duration > rules > transport > inside flow",
  },

  sections: [
    {
      id: "timing-when-to-go",
      archetype: "timing",
      name: "When to Go",
      description: "Optimal day and time based on crowd patterns",
      questionPool: ["weekly_pattern", "hourly_heatmap", "month_calendar", "seasonal_curve"],
      maxQuestions: 2,
      minQuestions: 1,
      preferredChartTypes: ["weekly_pattern", "hourly_heatmap"],
      layout: "hero",
      supportsPersonalization: true,
    },
    {
      id: "duration-how-long",
      archetype: "duration",
      name: "How Long You'll Need",
      description: "Visit duration by interest level and crowd conditions",
      questionPool: ["duration_stat", "booking_window"],
      maxQuestions: 1,
      preferredChartTypes: ["duration_stat"],
      layout: "half",
    },
    {
      id: "logistics-what-to-bring",
      archetype: "logistics",
      name: "What to Know Before You Arrive",
      description: "Security rules, prohibited items, dress code",
      questionPool: ["rules_checklist", "entrance_requirements"],
      maxQuestions: 1,
      preferredChartTypes: ["rules_checklist"],
      layout: "half",
    },
    {
      id: "logistics-getting-there",
      archetype: "logistics",
      name: "Getting There",
      description: "Transport options, nearest stops, walking times",
      questionPool: ["transit_options", "entrance_map"],
      maxQuestions: 1,
      preferredChartTypes: ["transit_options"],
      layout: "half",
    },
    {
      id: "experience-inside-flow",
      archetype: "experience",
      name: "Inside the Venue",
      description: "Room-by-room flow, must-see highlights, crowd hotspots",
      questionPool: ["floor_plan_flow", "zone_crowd_heatmap", "highlight_route"],
      maxQuestions: 1,
      preferredChartTypes: ["floor_plan_flow"],
      layout: "full",
    },
    {
      id: "practical-ticket-types",
      archetype: "practical",
      name: "Which Ticket Fits You",
      description: "Ticket comparison by visitor type and priorities",
      questionPool: ["ticket_ladder", "compare_zones"],
      maxQuestions: 1,
      preferredChartTypes: ["ticket_ladder"],
      layout: "half",
    },
  ],

  maxTotalSections: 6,
  maxTotalCharts: 6,
  minTotalSections: 4,
  requiredArchetypes: ["timing", "duration"],
  forbiddenArchetypes: ["context"], // History goes on the History page
};
