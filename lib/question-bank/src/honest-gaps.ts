/**
 * DRD Honest Gaps — extract declared data unknowns from "Part 1J" or
 * "Honest Gaps" sections of a Deep Research Doc.
 *
 * Pure function — no LLM, no side-effects. Returns an array of gap strings
 * that the chart-generation pipeline attaches to chart provenance when the
 * chart's archetype overlaps with the declared unknown.
 */

export interface HonestGap {
  /** Verbatim text of the declared gap (trimmed bullet or sentence). */
  text: string;
  /**
   * Keywords extracted from the gap text, normalised to lowercase.
   * Used to match gaps against chart archetypes via keyword overlap.
   */
  keywords: string[];
}

const GAP_SECTION_PATTERNS = [
  /^#{1,4}\s+(?:1[Jj][\s.:]|honest\s+gaps?|data\s+(?:gaps?|we\s+could\s+not)|gaps?\s+(?:and\s+)?caveats?|known\s+unknowns?|limitations?\s+and\s+gaps?)/i,
  /^#{1,4}\s+(?:what\s+we\s+(?:could\s+not|don.t)\s+(?:verify|confirm|find|know))/i,
  /^#{1,4}\s+(?:data\s+(?:quality|confidence)\s+(?:gaps?|issues?))/i,
];

/** Bullet or numbered list line (may start with -, *, •, or 1. etc.) */
const BULLET_RE = /^(?:[-*•]|\d+\.)\s+(.+)/;

/**
 * Lines that look like section subheadings rather than gap declarations
 * — skip them so we don't include headings as gap text.
 */
const SKIP_RE = /^#{1,4}\s+/;

function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4);
  return [...new Set(words)];
}

/**
 * Extract declared data gaps from a DRD markdown string.
 *
 * Looks for known section headers (1J, Honest Gaps, etc.) and collects
 * bullet-point lines from those sections as gap declarations.
 *
 * Also picks up inline "no reliable data" / "could not verify" sentences
 * anywhere in the document, since many DRDs embed gap statements inline.
 *
 * Returns at most 12 gaps to keep memory bounded.
 *
 * Pure — no LLM, no I/O.
 */
export function extractHonestGaps(drdMarkdown: string | null | undefined): HonestGap[] {
  if (!drdMarkdown || drdMarkdown.trim().length === 0) return [];

  const lines = drdMarkdown.split("\n");
  const gaps: HonestGap[] = [];
  const seen = new Set<string>();

  let inGapSection = false;
  let sectionDepth = 0;

  function addGap(text: string) {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 10) return;
    const key = trimmed.toLowerCase().slice(0, 80);
    if (seen.has(key)) return;
    seen.add(key);
    gaps.push({ text: trimmed, keywords: extractKeywords(trimmed) });
  }

  for (const raw of lines) {
    const line = raw ?? "";
    const trimmed = line.trim();

    if (SKIP_RE.test(trimmed)) {
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)/);
      if (headingMatch) {
        const depth = headingMatch[1]!.length;
        const title = headingMatch[2] ?? "";
        const entersGapSection = GAP_SECTION_PATTERNS.some((p) =>
          p.test(`${"#".repeat(depth)} ${title}`),
        );
        if (entersGapSection) {
          inGapSection = true;
          sectionDepth = depth;
          continue;
        }
        if (inGapSection && depth <= sectionDepth) {
          inGapSection = false;
        }
      }
      continue;
    }

    if (inGapSection) {
      // Collect bullet items as gap declarations.
      const bullet = trimmed.match(BULLET_RE);
      if (bullet?.[1]) {
        addGap(bullet[1]);
        continue;
      }
      // Non-empty, non-bullet lines inside the gap section are also captured
      // when they look substantive (not just separators or blank lines).
      if (trimmed.length > 20 && !trimmed.startsWith("|") && !trimmed.startsWith("---")) {
        addGap(trimmed);
      }
    } else {
      // Outside a dedicated section: pick up inline gap signals.
      const lc = trimmed.toLowerCase();
      if (
        /no reliable (data|source|figure|statistic|information|hourly|crowd|queue|wait)/i.test(lc) ||
        /could not (confidently|reliably)?\s*(verify|confirm|find|source)/i.test(lc) ||
        /\b(unavailable|unverifiable|not publicly available|not disclosed)\b/i.test(lc) ||
        /\b(honest gap|data gap|knowledge gap)\b/i.test(lc)
      ) {
        // Extract the sentence containing the gap statement.
        const sentences = trimmed.split(/(?<=[.?!])\s+/);
        for (const s of sentences) {
          if (
            /no reliable|could not (confidently|reliably)?\s*(verify|confirm|find)|unavailable|unverifiable|not publicly available|not disclosed|honest gap|data gap|knowledge gap/i.test(
              s,
            )
          ) {
            addGap(s);
          }
        }
      }
    }

    if (gaps.length >= 12) break;
  }

  return gaps;
}

/**
 * Score how well a gap declaration matches a given chart archetype.
 * Returns a value > 0 when the gap is relevant to the archetype's domain.
 *
 * Uses keyword overlap between the gap text and the archetype's known
 * data-domain terms. Callers should consider a gap matched when score > 0.
 */
export function scoreGapArchetypeMatch(gap: HonestGap, archetypeId: string): number {
  const archetypeDomain = ARCHETYPE_DOMAIN_KEYWORDS[archetypeId] ?? [];
  let hits = 0;
  for (const keyword of archetypeDomain) {
    if (gap.keywords.some((k) => k.includes(keyword) || keyword.includes(k))) {
      hits++;
    }
  }
  return hits;
}

/**
 * Domain keywords for each archetype — used to match gap declarations
 * to the charts most likely to suffer from that data gap.
 * Keys are archetype ids; values are arrays of lowercase domain terms.
 */
const ARCHETYPE_DOMAIN_KEYWORDS: Record<string, string[]> = {
  hourly_heatmap:    ["hourly", "hour", "crowd", "queue", "wait", "time", "peak", "busy"],
  weekly_pattern:    ["weekday", "weekly", "crowd", "busy", "quiet", "day"],
  seasonal_curve:    ["seasonal", "monthly", "season", "month", "visitor", "winter", "summer"],
  booking_window:    ["booking", "advance", "sellout", "sold out", "lead time"],
  entrance_lanes:    ["entrance", "lane", "queue", "wait", "security", "line", "gate"],
  compare_zones:     ["zone", "area", "wait", "section", "crowd", "queue"],
  ticket_ladder:     ["ticket", "price", "tier", "cost", "premium", "inclusion"],
  ticket_access_matrix: ["ticket", "price", "tier", "cost", "inclusion", "access"],
  duration_budget:   ["duration", "time", "visit", "minutes", "hours"],
  duration_stat:     ["duration", "time", "visit", "minutes", "hours"],
  time_split:        ["duration", "segment", "time", "minutes"],
  daily_pattern:     ["daily", "hourly", "hour", "crowd", "peak"],
  sighting_probability: ["sighting", "wildlife", "probability", "chance"],
  conditions_calendar: ["conditions", "weather", "season", "monthly"],
  departure_reliability: ["departure", "cancellation", "weather", "reliability"],
  slot_compare:      ["slot", "time", "comparison", "crowd", "light"],
  stat_grid:         ["statistic", "fact", "number", "visitor", "annual"],
};
