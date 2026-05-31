export const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  authoritative_fact: "Authoritative fact",
  visitor_tip: "Visitor tip",
  wait_anecdote: "Wait anecdote",
  sentiment_theme: "Sentiment theme",
  trip_report: "Trip report",
  product_offering: "Product offering",
  price_point: "Price point",
  bundle_pattern: "Bundle pattern",
  operational_change: "Operational change",
  other: "Other",
};

export const EVIDENCE_TYPE_DESCRIPTIONS: Record<string, string> = {
  authoritative_fact: "Ground-truth data from official sources (opening hours, ticket prices, official counts).",
  visitor_tip: "Practical advice from real visitor reviews — what to bring, where to stand, what to skip.",
  wait_anecdote: "First-hand wait-time reports from visitor reviews or trip reports.",
  sentiment_theme: "Recurring emotional tone or overall impression across many reviews.",
  trip_report: "Narrative account of a complete visit, usually from Reddit or travel blogs.",
  product_offering: "Specific ticket type, tour product, or add-on listed on booking platforms.",
  price_point: "Concrete price data from booking platforms (GetYourGuide, Viator) or official sites.",
  bundle_pattern: "Cross-product bundling behaviour — which attractions are co-booked together.",
  operational_change: "Recent changes to hours, entry policy, renovation closures, or pricing.",
  other: "Miscellaneous evidence that doesn't fit another category.",
};
