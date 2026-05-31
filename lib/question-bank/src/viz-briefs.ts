/**
 * DRD Visualization Intelligence — extract explicit chart recommendations
 * written by DRD authors in "Part 1H" / "Visualization Intelligence" sections.
 *
 * Pure function — no LLM, no side-effects. Returns an array of archetype hints
 * the assembler can use to boost the matching candidate in each bundle slot.
 */

import { CHART_ARCHETYPES } from "./archetypes";
import type { ChartArchetypeId } from "./types";

export interface VizBrief {
  /** The archetype the DRD author explicitly recommended. */
  archetype_hint: ChartArchetypeId;
  /** 0-100 confidence derived from the DRD's own language ("high"=90, etc.) */
  confidence: number;
  /** Optional verbatim question or heading the author provided. */
  question_hint?: string;
}

/**
 * All known archetype ids — derived from the canonical registry so this set
 * stays in sync automatically whenever archetypes are added or removed.
 * CHART_ARCHETYPES is a Record<ChartArchetypeId, ChartArchetype> keyed by id.
 */
const KNOWN_ARCHETYPES: ReadonlySet<ChartArchetypeId> = new Set(
  Object.keys(CHART_ARCHETYPES) as ChartArchetypeId[],
);

function isKnownArchetype(id: string): id is ChartArchetypeId {
  return (KNOWN_ARCHETYPES as ReadonlySet<string>).has(id);
}

function parseConfidence(text: string): number {
  const lower = text.toLowerCase();
  if (/\bhigh\b/.test(lower)) return 90;
  if (/\bmedium\b|\bmoderate\b/.test(lower)) return 70;
  if (/\blow\b/.test(lower)) return 50;
  // Numeric: "Confidence: 85"
  const num = lower.match(/confidence[:\s]+(\d{1,3})/i);
  if (num?.[1]) return Math.min(100, parseInt(num[1], 10));
  return 75; // default when mentioned but not qualified
}

/**
 * Detect whether the current line/position is inside a recognized
 * viz-intelligence section of the DRD.
 */
const VIZ_SECTION_PATTERNS = [
  /^#{1,4}\s+(1[Hh][\s.:]|visualization intelligence|viz(?:ualization)?\s+brief|chart\s+recommend)/i,
  /^#{1,4}\s+recommended\s+(charts?|visualiz)/i,
  /^#{1,4}\s+chart\s+(recommendation|brief|plan|selection)/i,
];

/**
 * Detect an explicit archetype mention anywhere in a line.
 * Accepts both snake_case identifiers and kebab-case.
 */
function extractArchetypeFromLine(line: string): ChartArchetypeId | null {
  // Explicit "Chart type: hourly_heatmap" or "Archetype: hourly_heatmap"
  const explicit = line.match(
    /(?:chart[\s-]type|archetype|chart\s+id|recommended\s+chart|visualization\s+type)[\s:]+([a-z_]+)/i,
  );
  if (explicit?.[1]) {
    const id = explicit[1].toLowerCase().replace(/-/g, "_");
    if (isKnownArchetype(id)) return id;
  }
  // Bullet or bold token: "- **hourly_heatmap**", "• weekly_pattern"
  const token = line.match(/(?:^|\s)[*•-]\s*\*{0,2}([a-z_]{5,30})\*{0,2}/);
  if (token?.[1]) {
    const id = token[1].toLowerCase();
    if (isKnownArchetype(id)) return id;
  }
  // Bare identifier if the line is short and matches exactly
  const bare = line.trim().toLowerCase().replace(/-/g, "_");
  if (isKnownArchetype(bare)) return bare;
  return null;
}

/**
 * Extract the optional visitor question from a viz-brief block.
 * Looks for "Question:" or "q:" prefixes on the same or next non-empty line.
 */
function extractQuestion(lines: string[], startIdx: number): string | undefined {
  for (let i = startIdx; i < Math.min(startIdx + 3, lines.length); i++) {
    const line = lines[i]?.trim() ?? "";
    const m = line.match(/^(?:question|q|visitor\s+question)[\s:]+(.+)/i);
    if (m?.[1]) return m[1].trim();
  }
  return undefined;
}

/**
 * Extract explicit visualization briefs from a DRD markdown string.
 *
 * Looks for known section headers (1H, Visualization Intelligence, etc.) and
 * parses archetype-id + optional confidence + optional question from the
 * contents of those sections. Returns an empty array when no viz section is
 * found.
 *
 * Pure — no LLM, no I/O. Safe to call during signal extraction.
 */
export function extractVizBriefs(drdMarkdown: string | null | undefined): VizBrief[] {
  if (!drdMarkdown || drdMarkdown.trim().length === 0) return [];

  const lines = drdMarkdown.split("\n");
  const briefs: VizBrief[] = [];
  const seen = new Set<string>();

  let inVizSection = false;
  let sectionDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    // Check whether we are entering a viz-intelligence section header.
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)/);
    if (headingMatch) {
      const depth = headingMatch[1]!.length;
      const title = headingMatch[2] ?? "";
      const entersVizSection = VIZ_SECTION_PATTERNS.some((p) => p.test(`${"#".repeat(depth)} ${title}`));

      if (entersVizSection) {
        inVizSection = true;
        sectionDepth = depth;
        continue;
      }
      // A same-or-higher level heading exits the section.
      if (inVizSection && depth <= sectionDepth) {
        inVizSection = false;
      }
    }

    if (!inVizSection) {
      // Still scan the whole document for explicit "Chart type:" lines,
      // even outside a dedicated section — many DRDs embed briefs inline.
      const explicit = line.match(
        /(?:chart[\s-]type|recommended\s+archetype|visualization\s+type)[\s:]+([a-z_]+)/i,
      );
      if (explicit?.[1]) {
        const id = explicit[1].toLowerCase().replace(/-/g, "_");
        if (isKnownArchetype(id) && !seen.has(id)) {
          seen.add(id);
          briefs.push({
            archetype_hint: id,
            confidence: parseConfidence(line),
            question_hint: extractQuestion(lines, i + 1),
          });
        }
      }
      continue;
    }

    // Inside a viz-intelligence section — extract archetype from each line.
    const archetype = extractArchetypeFromLine(trimmed);
    if (archetype && !seen.has(archetype)) {
      seen.add(archetype);
      briefs.push({
        archetype_hint: archetype,
        confidence: parseConfidence(trimmed),
        question_hint: extractQuestion(lines, i + 1),
      });
    }
  }

  return briefs;
}
