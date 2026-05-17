/**
 * Context Signals — deterministic extraction from a Deep Research Doc (DRD).
 *
 * NO LLM call here. We use keyword/regex heuristics so the assembler stays
 * deterministic, fast, and unit-testable. The signal extractor is the
 * canonical input to bundle scoring and page-template assembly.
 */

export interface ContextSignals {
  has_seasonal_variation: boolean;
  has_skip_the_line: boolean;
  has_multiple_entrances: boolean;
  has_long_queues: boolean;
  has_timed_entry: boolean;
  has_security_screening: boolean;
  has_dress_code: boolean;
  has_food_options: boolean;
  has_guided_tours: boolean;
  has_audio_guide: boolean;
  has_accessibility_concerns: boolean;
  has_rides: boolean;
  has_wildlife_sighting: boolean;
  has_weather_sensitivity: boolean;
  has_evening_program: boolean;
  has_historical_significance: boolean;
  has_dynamic_pricing: boolean;
  has_multiple_sub_products: boolean;
  /** Names of distinct sub-products mentioned in the DRD (best-effort, deduped). */
  sub_products: string[];
  /** Typical visit duration in minutes (best-effort range). */
  typical_visit_minutes: { min: number; max: number } | null;
  /** Whether the DRD self-rates major sections as Low confidence / honest gaps. */
  drd_has_low_confidence_sections: boolean;
}

const EMPTY_SIGNALS: ContextSignals = {
  has_seasonal_variation: false,
  has_skip_the_line: false,
  has_multiple_entrances: false,
  has_long_queues: false,
  has_timed_entry: false,
  has_security_screening: false,
  has_dress_code: false,
  has_food_options: false,
  has_guided_tours: false,
  has_audio_guide: false,
  has_accessibility_concerns: false,
  has_rides: false,
  has_wildlife_sighting: false,
  has_weather_sensitivity: false,
  has_evening_program: false,
  has_historical_significance: false,
  has_dynamic_pricing: false,
  has_multiple_sub_products: false,
  sub_products: [],
  typical_visit_minutes: null,
  drd_has_low_confidence_sections: false,
};

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function uniqueClean(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const cleaned = raw
      .replace(/\s+/g, " ")
      .replace(/[\u201c\u201d"']/g, "")
      .trim();
    const key = cleaned.toLowerCase();
    if (!cleaned || cleaned.length < 3 || cleaned.length > 60) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= 8) break;
  }
  return out;
}

function extractSubProducts(text: string): string[] {
  const names: string[] = [];
  // Common DRD patterns: bulleted "- Name — description" or "## Name".
  for (const m of text.matchAll(/^\s*[-*]\s+([A-Z][^—\-:\n]{2,60})\s*[—\-:]/gm)) {
    if (m[1]) names.push(m[1]);
  }
  for (const m of text.matchAll(/^#{2,4}\s+([A-Z][^\n]{2,60})$/gm)) {
    const heading = m[1]?.trim() ?? "";
    // Skip generic section headings.
    if (!/^(overview|history|why|when|how|what|tickets?|hours?|access|safety|faq|gaps?|sources?|confidence)/i.test(heading)) {
      names.push(heading);
    }
  }
  return uniqueClean(names);
}

function extractDurationMinutes(text: string): { min: number; max: number } | null {
  // Patterns: "1-2 hours", "2 to 3 hours", "90-120 minutes", "about 2 hours".
  const rangeHr = text.match(/(\d{1,2})\s*(?:-|to|–)\s*(\d{1,2})\s*hours?/i);
  if (rangeHr?.[1] && rangeHr[2]) {
    return { min: Number(rangeHr[1]) * 60, max: Number(rangeHr[2]) * 60 };
  }
  const rangeMin = text.match(/(\d{2,3})\s*(?:-|to|–)\s*(\d{2,3})\s*minutes?/i);
  if (rangeMin?.[1] && rangeMin[2]) {
    return { min: Number(rangeMin[1]), max: Number(rangeMin[2]) };
  }
  const singleHr = text.match(/about\s+(\d{1,2})\s*hours?/i);
  if (singleHr?.[1]) {
    const n = Number(singleHr[1]);
    return { min: n * 60, max: (n + 1) * 60 };
  }
  return null;
}

/**
 * Pure-function signal extractor. Pass it the DRD markdown; it returns the
 * full ContextSignals record. Stable across re-runs (no LLM, no clock).
 */
export function extractSignals(drdMarkdown: string | null | undefined): ContextSignals {
  if (!drdMarkdown || drdMarkdown.trim().length === 0) {
    return { ...EMPTY_SIGNALS };
  }
  const text = drdMarkdown;
  const lower = text.toLowerCase();

  const subProducts = extractSubProducts(text);

  return {
    has_seasonal_variation: hasAny(lower, [
      /\b(season(al(ity)?)?|peak season|off[- ]season|shoulder season|summer crowd|winter closure|monthly visitation)\b/,
      /\b(busiest months?|quietest months?|best months? to visit)\b/,
    ]),
    has_skip_the_line: hasAny(lower, [
      /\bskip[- ]the[- ]line\b/,
      /\bfast[- ]track\b/,
      /\bpriority (entry|access|entrance)\b/,
      /\breserved entry\b/,
    ]),
    has_multiple_entrances: hasAny(lower, [
      /\b(multiple|several|different|two|three|four) (entrances?|gates?|entry points?)\b/,
      /\bmain entrance\b.*\b(side|secondary|north|south|east|west) (entrance|gate)\b/s,
    ]),
    has_long_queues: hasAny(lower, [
      /\b(long|huge|massive|notorious) (queue|line|wait)s?\b/,
      /\bwait(ing)? times? of (\d{2,3}|hours?)\b/,
      /\b(\d{2,3})[ -]?minute (queue|wait)\b/,
    ]),
    has_timed_entry: hasAny(lower, [
      /\btimed[- ]entry\b/,
      /\btimed (ticket|slot|admission)s?\b/,
      /\b(half[- ]hour|15[- ]minute|hourly) entry slots?\b/,
    ]),
    has_security_screening: hasAny(lower, [
      /\bsecurity (check|screening|scanner)\b/,
      /\bbag (check|screening|scan)\b/,
      /\bmetal detector\b/,
      /\bairport[- ]style\b/,
    ]),
    has_dress_code: hasAny(lower, [
      /\bdress code\b/,
      /\b(cover (shoulders|knees)|no shorts|modest dress|appropriate (attire|clothing))\b/,
    ]),
    has_food_options: hasAny(lower, [
      /\b(restaurant|cafe|café|food court|dining|on[- ]site (food|dining|meal))\b/,
    ]),
    has_guided_tours: hasAny(lower, [
      /\b(guided tour|tour guide|docent|expert[- ]led|with a guide)\b/,
    ]),
    has_audio_guide: hasAny(lower, [
      /\baudio[- ]guide\b/,
      /\bself[- ]guided audio\b/,
      /\baudio (app|tour|narration)\b/,
    ]),
    has_accessibility_concerns: hasAny(lower, [
      /\b(wheelchair|accessibility|step[- ]free|mobility|elevator access|stair(case|s)? only)\b/,
    ]),
    has_rides: hasAny(lower, [
      /\b(ride|roller ?coaster|attraction|thrill ride)s?\b/,
      /\b(theme park|amusement park)\b/,
    ]),
    has_wildlife_sighting: hasAny(lower, [
      /\b(wildlife|whale|dolphin|safari|spotting|sighting probability|game drive)\b/,
    ]),
    has_weather_sensitivity: hasAny(lower, [
      /\b(weather[- ]dependent|cancel(led|lation)? (due to|in) (rain|wind|weather)|rough seas|outdoor activity|sea state)\b/,
    ]),
    has_evening_program: hasAny(lower, [
      /\b(night tour|evening (visit|program)|after[- ]hours|sunset (cruise|tour|slot)|illuminat(ed|ion))\b/,
    ]),
    has_historical_significance: hasAny(lower, [
      /\b(history|historic(al)?|founded in|built in|century|ancient|medieval|renaissance|restoration)\b/,
    ]),
    has_dynamic_pricing: hasAny(lower, [
      /\b(dynamic pricing|surge pricing|price varies|fare varies|date[- ]based pricing|operator-specific (price|fare))\b/,
    ]),
    has_multiple_sub_products: subProducts.length >= 3,
    sub_products: subProducts,
    typical_visit_minutes: extractDurationMinutes(text),
    drd_has_low_confidence_sections: hasAny(lower, [
      /\b(low confidence|honest gap|anecdotal|insufficient evidence|no data|unknown)\b/,
    ]),
  };
}

/**
 * Count how many of `required` and `prefers` signals are present in the
 * extracted signal record. Used by the assembler when scoring bundles.
 */
export function countSignalMatches(
  signals: ContextSignals,
  required: (keyof ContextSignals)[],
  prefers: (keyof ContextSignals)[],
): { requiredHits: number; preferredHits: number; allRequired: boolean } {
  const requiredHits = required.filter((k) => Boolean(signals[k])).length;
  const preferredHits = prefers.filter((k) => Boolean(signals[k])).length;
  return {
    requiredHits,
    preferredHits,
    allRequired: requiredHits === required.length,
  };
}
