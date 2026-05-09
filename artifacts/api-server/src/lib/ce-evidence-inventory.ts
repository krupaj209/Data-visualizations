import type { CeIntelligenceView, IntelFact } from "./ce-intelligence";

export const EVIDENCE_CATEGORY_IDS = [
  "tickets",
  "opening_hours",
  "historical_events",
  "routes_stops",
  "durations",
  "crowd_claims",
  "wait_times",
  "accessibility",
  "seasonality",
  "prices",
  "restrictions",
  "nearby_pairings",
] as const;

export type EvidenceCategoryId = (typeof EVIDENCE_CATEGORY_IDS)[number];

export type EvidenceStrength = "strong" | "partial" | "weak" | "missing";

export interface EvidenceItem {
  id: string;
  category: EvidenceCategoryId;
  claim: string;
  source_type: "drd" | "ce_intel";
  source_ref: string;
  confidence: number;
}

export interface EvidenceCategory {
  id: EvidenceCategoryId;
  label: string;
  strength: EvidenceStrength;
  items: EvidenceItem[];
  gaps: string[];
}

export interface EvidenceInventory {
  categories: EvidenceCategory[];
  top_items: EvidenceItem[];
  gaps: { category: EvidenceCategoryId; reason: string }[];
}

const CATEGORY_LABELS: Record<EvidenceCategoryId, string> = {
  tickets: "Tickets & inclusions",
  opening_hours: "Opening hours",
  historical_events: "Historical dates",
  routes_stops: "Routes, stops & landmarks",
  durations: "Visit duration",
  crowd_claims: "Crowd patterns",
  wait_times: "Wait times",
  accessibility: "Accessibility",
  seasonality: "Seasonality",
  prices: "Prices",
  restrictions: "Restrictions",
  nearby_pairings: "Nearby pairings",
};

const CATEGORY_PATTERNS: Record<EvidenceCategoryId, RegExp[]> = {
  tickets: [
    /\b(ticket|tickets|entry|admission|skip[- ]the[- ]line|guided tour|includes|access)\b/i,
  ],
  opening_hours: [
    /\b(open|opens|opening|close|closes|closing|last admission|hours|programme|schedule)\b/i,
    /\b\d{1,2}(:\d{2})?\s?(am|pm)\b/i,
  ],
  historical_events: [
    /\b(history|built|opened|founded|construction|restoration|earthquake|unesco|century|ancient|medieval)\b/i,
    /\b(AD|CE|BCE)?\s?\d{2,4}\b/i,
  ],
  routes_stops: [
    /\b(route|routes|stop|stops|pier|departure|itinerary|landmark|coverage|passes|cruise|station)\b/i,
  ],
  durations: [
    /\b(duration|spend|budget|allow|takes|minutes|hours|half[- ]day|full[- ]day)\b/i,
    /\b\d+\s?(min|mins|minutes|hr|hrs|hour|hours)\b/i,
  ],
  crowd_claims: [
    /\b(crowd|crowds|busy|busiest|quiet|quietest|peak|packed|popular times|avoid)\b/i,
  ],
  wait_times: [
    /\b(wait|queue|line|lane|security|entry time|fast track)\b/i,
    /\b\d+\s?(min|mins|minutes)\s?(wait|queue|line)?\b/i,
  ],
  accessibility: [
    /\b(accessible|accessibility|wheelchair|step[- ]free|lift|stairs|mobility|ramp)\b/i,
  ],
  seasonality: [
    /\b(season|seasonal|month|summer|winter|spring|autumn|fall|weather|rain|sunset|holiday)\b/i,
  ],
  prices: [/\b(price|prices|cost|€|\$|£|from\s+\d+|adult|child)\b/i],
  restrictions: [
    /\b(restriction|restricted|not allowed|prohibited|closed|closure|bag|dress code|age|height)\b/i,
  ],
  nearby_pairings: [
    /\b(nearby|pair|combine|co[- ]book|next to|walking distance|museum|gallery|gardens|palace)\b/i,
  ],
};

const INTEL_BUCKET_TO_CATEGORY: Partial<Record<string, EvidenceCategoryId[]>> = {
  hours_programme: ["opening_hours", "restrictions"],
  tickets: ["tickets", "prices"],
  crowd_patterns: ["crowd_claims", "seasonality"],
  wait_times: ["wait_times", "crowd_claims"],
  zones: ["routes_stops", "nearby_pairings"],
  co_bookings: ["nearby_pairings"],
  sentiment: ["crowd_claims"],
  ops_notes: ["restrictions", "opening_hours"],
};

function splitIntoEvidenceSentences(markdown: string): string[] {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`[\]]/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 24 && line.length <= 320);
}

function scoreSentence(sentence: string): number {
  let score = 45;
  if (/\b\d{2,4}\b/.test(sentence)) score += 15;
  if (/\b\d+\s?(min|mins|minutes|hour|hours|am|pm)\b/i.test(sentence)) {
    score += 15;
  }
  if (/[€$£]\s?\d+|\bfrom\s+\d+/i.test(sentence)) score += 12;
  if (/\b(official|recorded|reported|includes|opens|closes)\b/i.test(sentence)) {
    score += 8;
  }
  return Math.min(score, 92);
}

function categoryForSentence(sentence: string): EvidenceCategoryId[] {
  return EVIDENCE_CATEGORY_IDS.filter((category) =>
    CATEGORY_PATTERNS[category].some((pattern) => pattern.test(sentence)),
  );
}

function strengthFor(items: EvidenceItem[]): EvidenceStrength {
  if (items.length >= 5 && items.some((item) => item.confidence >= 85)) {
    return "strong";
  }
  if (items.length >= 2) return "partial";
  if (items.length === 1) return "weak";
  return "missing";
}

function gapFor(category: EvidenceCategoryId): string {
  const gaps: Record<EvidenceCategoryId, string> = {
    tickets: "No clear ticket tiers, inclusions, or access differences found.",
    opening_hours: "No concrete opening hours or last-entry facts found.",
    historical_events: "Not enough dated historical events found for a timeline.",
    routes_stops: "No route, stop, pier, or landmark coverage data found.",
    durations: "No clear visit-duration or itinerary-time guidance found.",
    crowd_claims: "No grounded crowd-pattern claims found.",
    wait_times: "No queue, lane, or wait-time evidence found.",
    accessibility: "No accessibility or mobility evidence found.",
    seasonality: "No month/season/weather pattern evidence found.",
    prices: "No current price or price-tier evidence found.",
    restrictions: "No operational restriction or closure evidence found.",
    nearby_pairings: "No nearby pairing or co-booking evidence found.",
  };
  return gaps[category];
}

function addItem(
  buckets: Map<EvidenceCategoryId, EvidenceItem[]>,
  item: EvidenceItem,
) {
  const existing = buckets.get(item.category) ?? [];
  if (existing.some((candidate) => candidate.claim === item.claim)) return;
  existing.push(item);
  buckets.set(item.category, existing);
}

export function buildStructuredEvidenceInventory(args: {
  drdMarkdown: string;
  intel?: CeIntelligenceView | null;
}): EvidenceInventory {
  const buckets = new Map<EvidenceCategoryId, EvidenceItem[]>();
  const sentences = splitIntoEvidenceSentences(args.drdMarkdown);

  sentences.forEach((sentence, idx) => {
    const categories = categoryForSentence(sentence);
    for (const category of categories) {
      addItem(buckets, {
        id: `drd-${category}-${idx}`,
        category,
        claim: sentence.slice(0, 260),
        source_type: "drd",
        source_ref: `DRD sentence ${idx + 1}`,
        confidence: scoreSentence(sentence),
      });
    }
  });

  for (const fact of args.intel?.facts ?? []) {
    const categories = INTEL_BUCKET_TO_CATEGORY[fact.bucket] ?? [];
    for (const category of categories) {
      addItem(buckets, {
        id: `intel-${fact.id}`,
        category,
        claim: fact.value.slice(0, 260),
        source_type: "ce_intel",
        source_ref: fact.source_url ? `${fact.id} · ${fact.source_url}` : fact.id,
        confidence: fact.confidence,
      });
    }
  }

  const categories: EvidenceCategory[] = EVIDENCE_CATEGORY_IDS.map((id) => {
    const items = (buckets.get(id) ?? [])
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);
    const strength = strengthFor(items);
    return {
      id,
      label: CATEGORY_LABELS[id],
      strength,
      items,
      gaps: strength === "missing" ? [gapFor(id)] : [],
    };
  });

  const top_items = categories
    .flatMap((category) => category.items.slice(0, 2))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 20);
  const gaps = categories
    .filter((category) => category.strength === "missing")
    .map((category) => ({ category: category.id, reason: category.gaps[0]! }));

  return { categories, top_items, gaps };
}

export function formatEvidenceInventoryForPrompt(
  inventory: EvidenceInventory,
): string {
  return inventory.categories
    .map((category) => {
      const itemLines = category.items
        .slice(0, 5)
        .map(
          (item) =>
            `  - [${item.id}] conf ${item.confidence}: ${item.claim} (${item.source_type})`,
        )
        .join("\n");
      const gapLines = category.gaps.map((gap) => `  - gap: ${gap}`).join("\n");
      return `- ${category.id} (${category.strength}, ${category.items.length} item${
        category.items.length === 1 ? "" : "s"
      })\n${itemLines || gapLines || "  - no evidence"}`;
    })
    .join("\n");
}
