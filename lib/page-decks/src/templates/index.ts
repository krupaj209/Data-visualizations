export { planYourVisitTemplate } from "./plan-your-visit";
export { skipTheLineTemplate } from "./skip-the-line";
export { entrancesTemplate } from "./entrances";
export { historyTemplate } from "./history";

import { planYourVisitTemplate } from "./plan-your-visit";
import { skipTheLineTemplate } from "./skip-the-line";
import { entrancesTemplate } from "./entrances";
import { historyTemplate } from "./history";

import type { PageDeckTemplate, PageType } from "../types";

export const deckTemplates: Record<PageType, PageDeckTemplate> = {
  "plan-your-visit": planYourVisitTemplate,
  "skip-the-line": skipTheLineTemplate,
  "entrances": entrancesTemplate,
  "history": historyTemplate,
  "map-floor-plan": planYourVisitTemplate, // Fallback for now
  "tickets-pricing": skipTheLineTemplate,  // Fallback for now
  "reviews-experiences": planYourVisitTemplate,
  "combo-deals": skipTheLineTemplate,
};

export function getDeckTemplate(pageType: PageType): PageDeckTemplate {
  const template = deckTemplates[pageType];
  if (!template) {
    throw new Error(`No deck template found for page type: ${pageType}`);
  }
  return template;
}
