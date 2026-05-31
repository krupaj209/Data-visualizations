/**
 * Page-type templates — one per Headout listing-page surface. Each template
 * declares an ORDERED list of bundle slots. The assembler walks slots, picks
 * the highest-scoring bundle that hasn't fired yet, and emits one chart.
 *
 * `forcedArchetype` pins a slot to a specific archetype, bypassing bundle
 * scoring. Use only for narrative pages (history) where one chart is the
 * canonical answer.
 */

import { z } from "zod";
import type { BundleId } from "./bundles";
import type { ChartArchetypeId } from "./types";

export const PageType = z.enum([
  "plan-your-visit",
  "skip-the-line",
  "entrances",
  "history",
  "map-floor-plan",
  "reviews-experiences",
  "combo-deals",
]);

export type PageType = z.infer<typeof PageType>;

export const PAGE_TYPE_IDS = PageType.options;

export const DEFAULT_PAGE_TYPE: PageType = "plan-your-visit";

export interface PageSlot {
  /** Bundle to draw from (assembler picks an archetype within it). */
  bundleId?: BundleId;
  /**
   * Force a specific archetype regardless of bundle scoring. The chart is
   * still tagged with a bundle id (`narrative`) for grouping.
   */
  forcedArchetype?: ChartArchetypeId;
  forcedQuestionTemplate?: string;
  /** True if this slot MUST emit a chart (assembler logs a gap if it can't). */
  required?: boolean;
}

export interface PageTemplate {
  id: PageType;
  label: string;
  /** What state the visitor is in when reading this page. */
  narrative: string;
  slots: PageSlot[];
  /** Hard cap on number of charts. Assembler trims after slot loop. */
  maxCharts: number;
  /** Soft floor — assembler logs a warning if the deck is smaller than this. */
  minCharts: number;
}

export const PAGE_TEMPLATES: Record<PageType, PageTemplate> = {
  "plan-your-visit": {
    id: "plan-your-visit",
    label: "Plan your visit",
    narrative: "Reduce pre-visit anxiety and set clear expectations.",
    slots: [
      { bundleId: "timing", required: true },
      { bundleId: "duration", required: true },
      { bundleId: "choice" },
      { bundleId: "logistics" },
      { bundleId: "risk" },
      { bundleId: "prep" },
      { bundleId: "value" },
    ],
    maxCharts: 6,
    minCharts: 4,
  },
  "skip-the-line": {
    id: "skip-the-line",
    label: "Skip the line",
    narrative: "Justify the upsell — show where queues hurt and STL helps.",
    slots: [
      { bundleId: "timing", required: true },
      { bundleId: "risk", required: true },
      { bundleId: "value" },
      { bundleId: "choice" },
      { bundleId: "logistics" },
    ],
    maxCharts: 5,
    minCharts: 3,
  },
  entrances: {
    id: "entrances",
    label: "Entrances",
    narrative: "Pick the right entrance and avoid the wrong queue.",
    slots: [
      { bundleId: "logistics", required: true },
      { bundleId: "choice" },
      { bundleId: "timing" },
      { bundleId: "prep" },
    ],
    maxCharts: 4,
    minCharts: 2,
  },
  history: {
    id: "history",
    label: "History",
    narrative: "Tell the chronology in one canonical infographic.",
    slots: [
      {
        forcedArchetype: "history_timeline",
        forcedQuestionTemplate:
          "How did {{ceName}} evolve from its founding to today?",
        required: true,
      },
      { bundleId: "duration" },
      { bundleId: "prep" },
      { bundleId: "timing" },
    ],
    maxCharts: 4,
    minCharts: 2,
  },
  "map-floor-plan": {
    id: "map-floor-plan",
    label: "Map & floor plan",
    narrative: "Spatial orientation — where things are and how to flow through.",
    slots: [
      { bundleId: "logistics", required: true },
      { bundleId: "duration" },
      { bundleId: "timing" },
      { bundleId: "choice" },
    ],
    maxCharts: 4,
    minCharts: 2,
  },
  "reviews-experiences": {
    id: "reviews-experiences",
    label: "Reviews & experiences",
    narrative: "What real visitors loved, hated, and were surprised by.",
    slots: [
      { bundleId: "prep", required: true },
      { bundleId: "duration" },
      { bundleId: "choice" },
      { bundleId: "timing" },
    ],
    maxCharts: 4,
    minCharts: 2,
  },
  "combo-deals": {
    id: "combo-deals",
    label: "Combo deals",
    narrative: "Compare combos and show the savings vs single tickets.",
    slots: [
      { bundleId: "choice", required: true },
      { bundleId: "value", required: true },
      { bundleId: "duration" },
      { bundleId: "timing" },
    ],
    maxCharts: 4,
    minCharts: 3,
  },
};

export function getPageTemplate(pageType: PageType): PageTemplate {
  return PAGE_TEMPLATES[pageType];
}
