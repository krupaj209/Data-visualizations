import type {
  BankQuestion,
  SubcategoryBank,
  SubcategoryId,
  SubcategoryMeta,
} from "./types";

/**
 * Cross-cutting questions inherited by every subcategory unless explicitly
 * suppressed by an `applies_when` gate that the LLM decides against. These
 * cover the universal pre-visit decisions — when to go, how far in advance to
 * book, and which season is right.
 */
export const CROSS_CUTTING_QUESTIONS: BankQuestion[] = [
  {
    question: "Which day of the week is least crowded?",
    recommended_archetype: "weekly_pattern",
    applies_when: "the experience operates on multiple days of the week",
    notes: "Drop for daily-only experiences with no weekly variation.",
  },
  {
    question: "How far in advance do most visitors book?",
    recommended_archetype: "booking_window",
    applies_when:
      "the DRD or sources mention booking lead times, sell-out risk, or refund/cancellation patterns",
    notes:
      "Skip for walk-in-only experiences. The sweet-spot label should reference the CE name.",
  },
  {
    question: "Which months are best for a calm visit?",
    recommended_archetype: "seasonal_curve",
    applies_when:
      "the CE has meaningful seasonality (most do — drop only for indoor experiences with constant demand)",
  },
];

const SUBCATEGORIES: Record<SubcategoryId, SubcategoryMeta> = {
  landmarks: {
    id: "landmarks",
    label: "Landmarks",
    description:
      "Iconic outdoor or architectural attractions with timed entry, observation decks, or queue management (e.g. Eiffel Tower, Colosseum, Burj Khalifa).",
  },
  museums: {
    id: "museums",
    label: "Museums",
    description:
      "Indoor cultural collections with timed slots, named galleries, and queue/skip-the-line ticket dynamics (e.g. Vatican Museums, Uffizi).",
  },
  sightseeing_cruises: {
    id: "sightseeing_cruises",
    label: "Sightseeing cruises",
    description:
      "Short scheduled boat tours through a city (Seine, Bosphorus, Hudson). Daily departure cadence and weather are the main visitor concerns.",
  },
  day_trips: {
    id: "day_trips",
    label: "Day trips",
    description:
      "Full-day group excursions to one or more sites near a base city (Pompeii from Rome, Cliffs of Moher from Dublin). Heavy lead-time + seasonality.",
  },
  guided_tours: {
    id: "guided_tours",
    label: "Guided tours",
    description:
      "Smaller-group expert-led tours, often inside a venue. Tier choice (group size, language, included tickets) is a key decision.",
  },
  theme_parks: {
    id: "theme_parks",
    label: "Theme parks",
    description:
      "Multi-zone parks with varied attractions, named lands, line-skipping passes, and strong weekday/season dynamics.",
  },
  walking_tours: {
    id: "walking_tours",
    label: "Walking tours",
    description:
      "Outdoor on-foot guided tours of a neighbourhood or theme. Weather and time-of-day matter most.",
  },
  hop_on_hop_off: {
    id: "hop_on_hop_off",
    label: "Hop-on hop-off",
    description:
      "Bus or boat networks with multiple stops. Route loop time, frequency, and pass duration are the big visitor questions.",
  },
  plays: {
    id: "plays",
    label: "Plays & shows",
    description:
      "Theatrical performances at a fixed venue with multiple seating tiers, scheduled show times, and sell-out dynamics.",
  },
  helicopter_tours: {
    id: "helicopter_tours",
    label: "Helicopter tours",
    description:
      "Short scenic flights over a city or landscape. Tour duration, weather sensitivity, and tier (shared vs private) drive choice.",
  },
  cooking_classes: {
    id: "cooking_classes",
    label: "Cooking classes",
    description:
      "Hands-on small-group classes, typically 2-4 hours. Class size, dish count, and dietary inclusivity matter.",
  },
  wineries: {
    id: "wineries",
    label: "Wineries",
    description:
      "Tastings, tours, and meal experiences at a vineyard. Heavy seasonality (harvest), reservation lead time, and tier (basic vs reserve) are key.",
  },
  spa: {
    id: "spa",
    label: "Spa & wellness",
    description:
      "Day spa visits, thermal baths, hammam experiences. Weekly cadence (couples nights, ladies-only days) and treatment menu drive decisions.",
  },
  outdoor_activities: {
    id: "outdoor_activities",
    label: "Outdoor activities",
    description:
      "Adventure experiences (hiking, kayaking, skiing). Weather, season, and difficulty tier are the main concerns.",
  },
  combos: {
    id: "combos",
    label: "Combo tickets",
    description:
      "Bundled passes across multiple attractions. Per-attraction value, validity window, and skip-the-line inclusions matter most.",
  },
};

const RAW_BANK: Partial<Record<SubcategoryId, BankQuestion[]>> = {
  landmarks: [
    {
      question: "Which hour of the day has the lightest crowds?",
      recommended_archetype: "hourly_heatmap",
    },
    {
      question: "How long is the typical wait at peak hours?",
      recommended_archetype: "stat_grid",
      notes:
        "Use stat_grid only if at least 3 strong headline numbers exist (peak wait, off-peak wait, deck height, photo radius, etc).",
    },
    {
      question: "How do the named viewing levels compare on wait time?",
      recommended_archetype: "compare_zones",
      applies_when:
        "the landmark has 2-5 distinct named decks/levels with materially different waits",
    },
    {
      question: "Which ticket tier saves the most queue time?",
      recommended_archetype: "ticket_ladder",
      applies_when: "the landmark sells multiple ticket tiers",
    },
    {
      question: "Which dates in the next 3 months are calmest?",
      recommended_archetype: "month_calendar",
      applies_when:
        "the CE has strong day-to-day variability (holidays, school breaks, special events) — skip if only month-level seasonality matters",
    },
  ],
  museums: [
    {
      question: "Which hour of the day has the shortest entry queue?",
      recommended_archetype: "hourly_heatmap",
    },
    {
      question: "How are visitors splitting time across the named galleries?",
      recommended_archetype: "compare_zones",
      applies_when:
        "the museum has 2-5 famous named rooms/wings with distinct dwell times or queues",
    },
    {
      question: "Which ticket tier gives the best access for the price?",
      recommended_archetype: "ticket_ladder",
      applies_when: "skip-the-line or guided tiers exist alongside standard entry",
    },
    {
      question: "What share of visitors buy skip-the-line?",
      recommended_archetype: "donut_breakdown",
      applies_when:
        "the DRD or sources cite a specific skip-the-line vs standard split — do not invent",
    },
    {
      question: "How long does a typical visit take?",
      recommended_archetype: "stat_grid",
      notes:
        "Pair with average wait, ticket count, and one venue-distinctive number (e.g. 'masterpieces on display').",
    },
  ],
  sightseeing_cruises: [
    {
      question: "Which months are best for clear-weather cruising?",
      recommended_archetype: "seasonal_curve",
      notes: "Populate weather_score where the DRD has reliable monthly data.",
    },
    {
      question: "Which day of the week has the easiest boarding?",
      recommended_archetype: "weekly_pattern",
    },
    {
      question: "Which departure time is most popular vs least crowded?",
      recommended_archetype: "hourly_heatmap",
      applies_when: "the cruise runs multiple departures per day",
    },
    {
      question: "How do the cruise tiers compare on duration and inclusions?",
      recommended_archetype: "ticket_ladder",
      applies_when: "the operator sells more than one cruise tier",
    },
  ],
  day_trips: [
    {
      question: "How far in advance do most travellers book this day trip?",
      recommended_archetype: "booking_window",
    },
    {
      question: "Which months are best to take this day trip?",
      recommended_archetype: "seasonal_curve",
    },
    {
      question: "How do the tour tiers compare on inclusions and group size?",
      recommended_archetype: "ticket_ladder",
    },
    {
      question: "How is total time split across the stops?",
      recommended_archetype: "compare_zones",
      applies_when: "the tour has 2-4 named stops with distinct dwell times",
      notes:
        "Use 'metric_label': 'Time on the ground' and put dwell minutes into wait_min/wait_max.",
    },
  ],
  guided_tours: [
    {
      question: "Which day of the week is the tour least crowded?",
      recommended_archetype: "weekly_pattern",
    },
    {
      question: "How far in advance do most guests book?",
      recommended_archetype: "booking_window",
    },
    {
      question: "How do the group sizes and price tiers compare?",
      recommended_archetype: "ticket_ladder",
    },
    {
      question: "What share of guests pick the private tier vs shared?",
      recommended_archetype: "donut_breakdown",
      applies_when:
        "private and shared tiers both exist and the DRD references their split",
    },
  ],
  theme_parks: [
    {
      question: "Which weekday is least crowded at the park?",
      recommended_archetype: "weekly_pattern",
    },
    {
      question: "Which hour of the week is calmest across all days?",
      recommended_archetype: "hourly_heatmap",
    },
    {
      question: "How do the named lands or zones compare on wait time?",
      recommended_archetype: "compare_zones",
    },
    {
      question: "How much wait time does each pass tier save?",
      recommended_archetype: "ticket_ladder",
    },
    {
      question: "Which months are quietest at the park?",
      recommended_archetype: "seasonal_curve",
    },
    {
      question: "Which dates in the next 3 months are calmest?",
      recommended_archetype: "month_calendar",
    },
  ],
  walking_tours: [
    {
      question: "Which day of the week is the route quietest?",
      recommended_archetype: "weekly_pattern",
    },
    {
      question: "Which months balance good weather with lighter foot traffic?",
      recommended_archetype: "seasonal_curve",
      notes: "Weather is the dominant axis here — populate weather_score.",
    },
    {
      question: "How do the tour themes compare on length and price?",
      recommended_archetype: "ticket_ladder",
      applies_when: "multiple themed walking tours operate from the same hub",
    },
  ],
  hop_on_hop_off: [
    {
      question: "How long does a full loop take on each named route?",
      recommended_archetype: "compare_zones",
      notes:
        "Use 'metric_label': 'Loop time' and put route minutes into wait_min/wait_max.",
    },
    {
      question: "Which months are best to ride open-top?",
      recommended_archetype: "seasonal_curve",
    },
    {
      question: "How do the pass-duration tiers compare on price?",
      recommended_archetype: "ticket_ladder",
    },
    {
      question: "Which day of the week has the most reliable bus frequency?",
      recommended_archetype: "weekly_pattern",
    },
  ],
  plays: [
    {
      question: "How far in advance do most theatregoers book?",
      recommended_archetype: "booking_window",
    },
    {
      question: "How do the seating tiers compare on price and view?",
      recommended_archetype: "ticket_ladder",
    },
    {
      question: "Which performance day has the easiest seat availability?",
      recommended_archetype: "weekly_pattern",
    },
    {
      question: "What share of the house is sold by tier?",
      recommended_archetype: "donut_breakdown",
      applies_when: "the DRD reports occupancy or sales mix by seating tier",
    },
  ],
  helicopter_tours: [
    {
      question: "How do the flight tiers compare on duration and price?",
      recommended_archetype: "ticket_ladder",
    },
    {
      question: "Which months have the most flyable weather?",
      recommended_archetype: "seasonal_curve",
      notes:
        "Heavy weather sensitivity — populate weather_score; treat winter months as 'closed' or 'very_quiet' if cancellations are routine.",
    },
    {
      question: "Which time of day gives the clearest visibility?",
      recommended_archetype: "hourly_heatmap",
      applies_when:
        "the operator runs flights across most of the day (golden-hour effect)",
    },
    {
      question: "How far in advance do most guests book?",
      recommended_archetype: "booking_window",
    },
  ],
  cooking_classes: [
    {
      question: "Which day of the week has the most class availability?",
      recommended_archetype: "weekly_pattern",
    },
    {
      question: "How far in advance do guests typically book?",
      recommended_archetype: "booking_window",
    },
    {
      question: "How do the class tiers compare on dish count and price?",
      recommended_archetype: "ticket_ladder",
    },
    {
      question: "What share of guests pick veggie or dietary-flexible classes?",
      recommended_archetype: "donut_breakdown",
      applies_when:
        "the DRD references the dietary mix — otherwise skip rather than invent",
    },
  ],
  wineries: [
    {
      question: "Which months align with harvest and best-weather visits?",
      recommended_archetype: "seasonal_curve",
    },
    {
      question: "Which day of the week is quietest at the cellar door?",
      recommended_archetype: "weekly_pattern",
    },
    {
      question: "How do the tasting tiers compare on price and pours?",
      recommended_archetype: "ticket_ladder",
    },
    {
      question: "How far in advance should you reserve a slot?",
      recommended_archetype: "booking_window",
      applies_when: "the winery requires reservations (most premium ones do)",
    },
  ],
  spa: [
    {
      question: "Which day of the week is least crowded at the spa?",
      recommended_archetype: "weekly_pattern",
      notes:
        "Use day_notes for weekly cadence quirks (couples nights, ladies-only days).",
    },
    {
      question: "Which hour of the day is calmest in the wet areas?",
      recommended_archetype: "hourly_heatmap",
    },
    {
      question: "How do the package tiers compare on inclusions and time?",
      recommended_archetype: "ticket_ladder",
    },
  ],
  outdoor_activities: [
    {
      question: "Which months are in the right weather window?",
      recommended_archetype: "seasonal_curve",
    },
    {
      question: "How far in advance do most guests book?",
      recommended_archetype: "booking_window",
    },
    {
      question: "How do the difficulty/duration tiers compare?",
      recommended_archetype: "ticket_ladder",
    },
  ],
  combos: [
    {
      question: "How do the bundled attractions compare on standalone price?",
      recommended_archetype: "compare_zones",
      notes:
        "Use 'metric_label': 'Standalone ticket price' and put price ranges into wait_min/wait_max as currency units.",
    },
    {
      question: "How do the combo tiers compare on inclusions and value?",
      recommended_archetype: "ticket_ladder",
    },
    {
      question: "What share of buyers pick each combo tier?",
      recommended_archetype: "donut_breakdown",
      applies_when:
        "the DRD reports tier-level sales mix — otherwise drop rather than estimate",
    },
  ],
};

export const SUBCATEGORY_IDS = Object.keys(SUBCATEGORIES) as SubcategoryId[];

export function getSubcategoryMeta(id: SubcategoryId): SubcategoryMeta {
  return SUBCATEGORIES[id];
}

export function getSubcategoryBank(id: SubcategoryId): SubcategoryBank {
  const subcategory = SUBCATEGORIES[id];
  const questions = RAW_BANK[id];
  if (questions && questions.length > 0) {
    return { subcategory, questions, unratified: false };
  }
  // Long-tail subcategory or no curated bank yet — return a stub. The
  // orchestrator is expected to bootstrap a draft set from the DRD and
  // store the result as `unratified` so a human can promote it later.
  return { subcategory, questions: [], unratified: true };
}

export function listSubcategories(): SubcategoryMeta[] {
  return SUBCATEGORY_IDS.map((id) => SUBCATEGORIES[id]);
}

export function isKnownSubcategory(id: string): id is SubcategoryId {
  return Object.prototype.hasOwnProperty.call(SUBCATEGORIES, id);
}

/**
 * Long-tail / not-yet-curated subcategory bootstrap.
 *
 * The pipeline accepts ANY subcategoryId — if we don't have a curated bank
 * for it, we synthesize a placeholder `SubcategoryMeta` so the LLM has
 * something to anchor on, and return an `unratified: true` bank with no
 * curated questions. The orchestrator falls back to cross-cutting
 * questions plus DRD-driven hero proposals.
 *
 * `optionalLabel` and `optionalDescription` let the caller pass through a
 * human label sourced from the platform's subcategory record.
 */
export function getSubcategoryBankFlexible(
  id: string,
  optionalLabel?: string,
  optionalDescription?: string,
): SubcategoryBank {
  if (isKnownSubcategory(id)) {
    return getSubcategoryBank(id);
  }
  const meta: SubcategoryMeta = {
    // Cast: the wider-string id is fine at runtime — it only fails type-narrowing.
    id: id as SubcategoryId,
    label: optionalLabel ?? humaniseId(id),
    description:
      optionalDescription ??
      `Long-tail subcategory "${id}" — no curated question bank yet. Bootstrap an unratified set from the DRD.`,
  };
  return { subcategory: meta, questions: [], unratified: true };
}

function humaniseId(id: string): string {
  return id
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
