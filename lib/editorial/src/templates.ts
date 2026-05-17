/**
 * Editorial Templates
 *
 * Pre-defined templates for every chart type × page type combination.
 * These guide the AI and provide fallbacks.
 */

import type { EditorialTemplate } from "./types";

export const editorialTemplates: EditorialTemplate[] = [
  // ─────────────────────────────────────────────────────────
  // TIMING CHARTS
  // ─────────────────────────────────────────────────────────

  {
    id: "timing-hero",
    forPageTypes: ["plan-your-visit"],
    forChartTypes: ["weekly_pattern", "hourly_heatmap"],
    forArchetypes: ["timing"],

    headlineTemplates: [
      {
        template: "Best {timeUnit} to Visit {ceName}",
        priority: 1,
        tone: "reassuring",
      },
      {
        template: "When {ceName} Is Quietest",
        priority: 2,
        tone: "insider",
      },
      {
        template: "Skip the Crowds at {ceName}",
        priority: 3,
        tone: "urgent",
        condition: "visitorContext.timePriority === 'rushed'",
      },
    ],

    subheadlineTemplates: [
      {
        template: "Based on {dataPoints} data points from {dateRange}",
        priority: 1,
        tone: "authoritative",
      },
      {
        template: "Real crowd patterns from the last {months} months",
        priority: 2,
        tone: "authoritative",
      },
    ],

    ctaTemplates: [
      {
        template: "Book for {bestDay} at {bestTime} →",
        priority: 1,
        variant: "primary",
      },
      {
        template: "See all available slots →",
        priority: 2,
        variant: "secondary",
      },
    ],

    tipTemplates: [
      {
        template: "💡 {bestDay} mornings are 40% quieter than afternoons",
        condition: "chartData.weekdayVsWeekendRatio > 1.5",
      },
    ],

    warningTemplates: [
      {
        template: "⚠️ {ceName} closes early on {closingDays}",
        severity: "info",
        condition: "ceData.hasEarlyClosing",
      },
    ],

    variables: {
      timeUnit: { source: "computed", fallback: "time" },
      ceName: { source: "ceData", fallback: "this attraction" },
      dataPoints: { source: "chartData", fallback: "thousands of" },
      dateRange: { source: "chartData", fallback: "recent months" },
      months: { source: "computed", fallback: "6" },
      bestDay: { source: "chartData", fallback: "Tuesday" },
      bestTime: { source: "chartData", fallback: "9 AM" },
      closingDays: { source: "ceData", fallback: "certain days" },
      weekdayVsWeekendRatio: { source: "chartData", fallback: "1.2" },
    },
  },

  {
    id: "timing-skip-line",
    forPageTypes: ["skip-the-line"],
    forChartTypes: ["weekly_pattern", "hourly_heatmap", "queue_compare"],
    forArchetypes: ["timing", "value"],

    headlineTemplates: [
      {
        template: "When Skip-the-Line Saves the Most Time",
        priority: 1,
        tone: "urgent",
      },
      {
        template: "The Worst Times to Queue at {ceName}",
        priority: 2,
        tone: "insider",
      },
    ],

    subheadlineTemplates: [
      {
        template: "Standard queue vs. your fast-track access, hour by hour",
        priority: 1,
        tone: "authoritative",
      },
    ],

    ctaTemplates: [
      {
        template: "Skip the line from €{price} →",
        priority: 1,
        variant: "primary",
      },
      {
        template: "See time savings for your visit date →",
        priority: 2,
        variant: "secondary",
        condition: "visitorContext.visitMonth",
      },
    ],

    tipTemplates: [
      {
        template:
          "💡 Saturday afternoons: standard queue hits {maxWait}m. Skip-the-line walks right in.",
        condition: "chartData.maxWaitMinutes > 120",
      },
    ],

    variables: {
      ceName: { source: "ceData", fallback: "this attraction" },
      price: { source: "ceData", fallback: "25" },
      maxWait: {
        source: "chartData",
        key: "maxWaitMinutes",
        fallback: "120",
      },
    },
  },

  // ─────────────────────────────────────────────────────────
  // DURATION CHARTS
  // ─────────────────────────────────────────────────────────

  {
    id: "duration-standard",
    forPageTypes: ["plan-your-visit"],
    forChartTypes: ["duration_stat"],
    forArchetypes: ["duration"],

    headlineTemplates: [
      {
        template: "How Long You'll Need at {ceName}",
        priority: 1,
        tone: "reassuring",
      },
      {
        template: "{ceName} in {quickDuration} Minutes — Is It Enough?",
        priority: 2,
        tone: "insider",
        condition: "visitorContext.timePriority === 'rushed'",
      },
    ],

    subheadlineTemplates: [
      {
        template: "From express visit to deep dive, by interest level",
        priority: 1,
        tone: "reassuring",
      },
    ],

    ctaTemplates: [
      {
        template: "Plan your {city} day →",
        priority: 1,
        variant: "secondary",
      },
    ],

    tipTemplates: [
      {
        template: "💡 Art enthusiasts spend 2.5× longer than casual visitors",
      },
    ],

    variables: {
      ceName: { source: "ceData", fallback: "this attraction" },
      quickDuration: { source: "chartData", fallback: "45" },
      city: { source: "ceData", fallback: "Florence" },
    },
  },

  // ─────────────────────────────────────────────────────────
  // RULES CHARTS
  // ─────────────────────────────────────────────────────────

  {
    id: "rules-standard",
    forPageTypes: ["plan-your-visit", "entrances"],
    forChartTypes: ["rules_checklist"],
    forArchetypes: ["logistics"],

    headlineTemplates: [
      {
        template: "What to Know Before You Arrive",
        priority: 1,
        tone: "reassuring",
      },
      {
        template: "Don't Get Turned Away at {ceName}",
        priority: 2,
        tone: "urgent",
      },
    ],

    subheadlineTemplates: [
      {
        template:
          "Security, dress code, and prohibited items that catch visitors off guard",
        priority: 1,
        tone: "empathetic",
      },
    ],

    ctaTemplates: [
      {
        template: "Download checklist →",
        priority: 1,
        variant: "secondary",
      },
    ],

    warningTemplates: [
      {
        template: "🚫 {item} is strictly prohibited — no exceptions",
        severity: "alert",
        condition: "chartData.hasStrictProhibitions",
      },
      {
        template: "⚠️ Security rules changed {lastChange}",
        severity: "warning",
        condition: "ceData.rulesChangedRecently",
      },
    ],

    variables: {
      ceName: { source: "ceData", fallback: "this attraction" },
      item: { source: "chartData", fallback: "Large backpacks" },
      lastChange: { source: "ceData", fallback: "recently" },
    },
  },

  // ─────────────────────────────────────────────────────────
  // ENTRANCE MAP
  // ─────────────────────────────────────────────────────────

  {
    id: "entrance-map-standard",
    forPageTypes: ["entrances", "plan-your-visit"],
    forChartTypes: ["entrance_map"],
    forArchetypes: ["navigation"],

    headlineTemplates: [
      {
        template: "{ceName} Entrances",
        priority: 1,
        tone: "authoritative",
      },
      {
        template: "Which Door to Use at {ceName}",
        priority: 2,
        tone: "insider",
      },
    ],

    subheadlineTemplates: [
      {
        template: "Wait times, accessibility, and how to get there",
        priority: 1,
        tone: "reassuring",
      },
    ],

    ctaTemplates: [
      {
        template: "Get directions to {recommendedEntrance} →",
        priority: 1,
        variant: "primary",
      },
    ],

    tipTemplates: [
      {
        template:
          "💡 {recommendedEntrance} is {waitDiff}m faster than {worstEntrance} right now",
        condition: "chartData.waitDiffMinutes > 15",
      },
    ],

    variables: {
      ceName: { source: "ceData", fallback: "this attraction" },
      recommendedEntrance: {
        source: "chartData",
        fallback: "the main entrance",
      },
      worstEntrance: { source: "chartData", fallback: "other entrances" },
      waitDiff: {
        source: "chartData",
        key: "waitDiffMinutes",
        fallback: "20",
      },
    },
  },

  // ─────────────────────────────────────────────────────────
  // VALUE / ROI CHARTS
  // ─────────────────────────────────────────────────────────

  {
    id: "value-skip-line",
    forPageTypes: ["skip-the-line"],
    forChartTypes: ["time_value_matrix", "queue_compare"],
    forArchetypes: ["value"],

    headlineTemplates: [
      {
        template: "Is Skip-the-Line Worth It for You?",
        priority: 1,
        tone: "confident",
      },
      {
        template: "The Real Cost of Waiting at {ceName}",
        priority: 2,
        tone: "urgent",
      },
    ],

    subheadlineTemplates: [
      {
        template:
          "Time saved vs. extra cost, broken down by who you travel with",
        priority: 1,
        tone: "authoritative",
      },
    ],

    ctaTemplates: [
      {
        template: "Skip the line — save {avgTimeSaved}m →",
        priority: 1,
        variant: "primary",
      },
      {
        template: "See standard ticket options →",
        priority: 2,
        variant: "ghost",
        condition: "visitorContext.budgetPriority === 'low'",
      },
    ],

    tipTemplates: [
      {
        template:
          "💡 Families save the most — {familyTimeSaved}m less queueing with kids",
        condition: "chartData.familyTimeSaved > 30",
      },
    ],

    variables: {
      ceName: { source: "ceData", fallback: "this attraction" },
      avgTimeSaved: { source: "chartData", fallback: "45" },
      familyTimeSaved: { source: "chartData", fallback: "60" },
      recentBuyers: { source: "computed", fallback: "2,000+" },
    },
  },

  // ─────────────────────────────────────────────────────────
  // FLOOR PLAN
  // ─────────────────────────────────────────────────────────

  {
    id: "floor-plan-standard",
    forPageTypes: ["plan-your-visit", "map-floor-plan"],
    forChartTypes: ["floor_plan_flow"],
    forArchetypes: ["experience"],

    headlineTemplates: [
      {
        template: "Inside {ceName}: Room by Room",
        priority: 1,
        tone: "insider",
      },
      {
        template: "The Smart Route Through {ceName}",
        priority: 2,
        tone: "insider",
      },
    ],

    subheadlineTemplates: [
      {
        template: "What to see, what to skip, and where the crowds gather",
        priority: 1,
        tone: "reassuring",
      },
    ],

    ctaTemplates: [
      {
        template: "See full floor plan →",
        priority: 1,
        variant: "secondary",
      },
    ],

    tipTemplates: [
      {
        template:
          "💡 Room {skipRoom} is skippable — spend that time in {mustSeeRoom} instead",
        condition: "chartData.hasSkippableRooms",
      },
    ],

    variables: {
      ceName: { source: "ceData", fallback: "this attraction" },
      skipRoom: { source: "chartData", fallback: "3" },
      mustSeeRoom: { source: "chartData", fallback: "the main hall" },
    },
  },

  // ─────────────────────────────────────────────────────────
  // HISTORY / STORY
  // ─────────────────────────────────────────────────────────

  {
    id: "history-standard",
    forPageTypes: ["history"],
    forChartTypes: ["story_timeline", "history_timeline"],
    forArchetypes: ["context"],

    headlineTemplates: [
      {
        template: "The Story of {ceName}",
        priority: 1,
        tone: "authoritative",
      },
      {
        template: "Why {ceName} Changed Art Forever",
        priority: 2,
        tone: "authoritative",
        condition: "ceData.isArtLandmark",
      },
    ],

    subheadlineTemplates: [
      {
        template: "From {foundingYear} to today, the moments that matter",
        priority: 1,
        tone: "authoritative",
      },
    ],

    ctaTemplates: [
      {
        template: "Explore the full history →",
        priority: 1,
        variant: "secondary",
      },
    ],

    tipTemplates: [
      {
        template: "💡 {hiddenFact} — most visitors miss this",
      },
    ],

    variables: {
      ceName: { source: "ceData", fallback: "this attraction" },
      foundingYear: { source: "ceData", fallback: "its founding" },
      isArtLandmark: { source: "ceData", fallback: "false" },
      hiddenFact: {
        source: "chartData",
        fallback: "The ceiling has a secret symbol",
      },
    },
  },

  // ─────────────────────────────────────────────────────────
  // ACCESSIBILITY
  // ─────────────────────────────────────────────────────────

  {
    id: "accessibility-standard",
    forPageTypes: ["entrances", "plan-your-visit"],
    forChartTypes: ["accessibility_guide"],
    forArchetypes: ["navigation", "practical"],

    headlineTemplates: [
      {
        template: "Accessibility at {ceName}",
        priority: 1,
        tone: "empathetic",
      },
      {
        template: "Step-Free Access to {ceName}",
        priority: 2,
        tone: "reassuring",
      },
    ],

    subheadlineTemplates: [
      {
        template:
          "Entrance-by-entrance: ramps, elevators, and accessible routes",
        priority: 1,
        tone: "empathetic",
      },
    ],

    ctaTemplates: [
      {
        template: "Call ahead to arrange assistance →",
        priority: 1,
        variant: "primary",
        condition: "ceData.requiresAdvanceNotice",
      },
      {
        template: "See accessible ticket options →",
        priority: 2,
        variant: "secondary",
      },
    ],

    warningTemplates: [
      {
        template:
          "⚠️ {entranceName} has {stepCount} steps — use {alternativeEntrance} instead",
        severity: "warning",
        condition: "chartData.hasInaccessibleEntrance",
      },
    ],

    variables: {
      ceName: { source: "ceData", fallback: "this attraction" },
      entranceName: { source: "chartData", fallback: "One entrance" },
      stepCount: { source: "chartData", fallback: "many" },
      alternativeEntrance: {
        source: "chartData",
        fallback: "the main entrance",
      },
      requiresAdvanceNotice: { source: "ceData", fallback: "false" },
    },
  },
];

// ─────────────────────────────────────────────────────────
// Template Lookup
// ─────────────────────────────────────────────────────────

export function findTemplate(
  pageType: string,
  chartType: string,
  archetype: string,
): EditorialTemplate | undefined {
  return editorialTemplates.find(
    (t) =>
      t.forPageTypes.includes(pageType) &&
      t.forChartTypes.includes(chartType) &&
      t.forArchetypes.includes(archetype),
  );
}
