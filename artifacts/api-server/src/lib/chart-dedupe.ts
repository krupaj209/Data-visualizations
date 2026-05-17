/**
 * Pure duplicate-chart detection used by the single-chart suggestion
 * paths (`POST /ces/:slug/charts` + `POST /ces/:slug/ideation/feasibility`).
 *
 * Match priority (returns the FIRST tier that crosses the threshold):
 *   (a) same archetype AND same provenance.intent_id/bundle_id when both
 *       sides carry them — high-confidence "deck assembler already chose
 *       this slot".
 *   (b) same archetype AND high token-overlap (Jaccard) on the question
 *       text. Default threshold 0.6.
 *   (c) no archetype hint — pure question Jaccard ≥ 0.8.
 *
 * Returns `null` when nothing crosses the threshold. Kept dependency-free
 * (no DB, no LLM, no logger) so it can be unit-tested in
 * `scripts/src/test-chart-dedupe.mts`.
 */

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "the",
  "is",
  "are",
  "was",
  "were",
  "be",
  "of",
  "for",
  "to",
  "in",
  "on",
  "at",
  "by",
  "from",
  "with",
  "vs",
  "or",
  "do",
  "does",
  "did",
  "i",
  "my",
  "you",
  "your",
  "we",
  "us",
  "this",
  "that",
  "it",
  "its",
  "have",
  "has",
  "had",
  "s",
  "any",
  "some",
  "as",
  "than",
  "then",
  "if",
  "so",
]);

/**
 * Lowercase, strip punctuation, drop common stop words. Mirrors the
 * normalisation in the deck assembler so equivalent questions collapse
 * regardless of casing or filler words.
 */
export function tokenizeQuestion(q: string): Set<string> {
  return new Set(
    q
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t)),
  );
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Candidate the writer just submitted (raw topic form OR ideation feasibility). */
export interface DedupeCandidate {
  question: string;
  archetype?: string | null;
  intentId?: string | null;
  bundleId?: string | null;
}

/** Snapshot of an existing chart on the same CE. */
export interface DedupeExistingChart {
  id: number;
  slug: string;
  question: string;
  title: string;
  chartType: string;
  intentId?: string | null;
  bundleId?: string | null;
}

export type DuplicateMatchType =
  | "archetype_intent"
  | "archetype_fuzzy"
  | "question_only";

export interface DedupeMatch {
  chart: DedupeExistingChart;
  matchType: DuplicateMatchType;
  similarity: number;
  reason: string;
}

const ARCHETYPE_FUZZY_THRESHOLD = 0.6;
const QUESTION_ONLY_THRESHOLD = 0.8;

export function findDuplicateChart(
  candidate: DedupeCandidate,
  existing: DedupeExistingChart[],
): DedupeMatch | null {
  if (existing.length === 0) return null;
  const candTokens = tokenizeQuestion(candidate.question);

  // (a) Same archetype + same intent_id OR bundle_id.
  if (
    candidate.archetype &&
    (candidate.intentId || candidate.bundleId)
  ) {
    for (const c of existing) {
      if (c.chartType !== candidate.archetype) continue;
      const intentSame =
        candidate.intentId && c.intentId && c.intentId === candidate.intentId;
      const bundleSame =
        candidate.bundleId && c.bundleId && c.bundleId === candidate.bundleId;
      if (intentSame || bundleSame) {
        return {
          chart: c,
          matchType: "archetype_intent",
          similarity: 1,
          reason: `Same chart archetype (${c.chartType}) and visitor intent as "${c.title}".`,
        };
      }
    }
  }

  // (b) Same archetype + fuzzy question wording.
  let best: DedupeMatch | null = null;
  if (candidate.archetype) {
    for (const c of existing) {
      if (c.chartType !== candidate.archetype) continue;
      const sim = jaccardSimilarity(candTokens, tokenizeQuestion(c.question));
      if (sim >= ARCHETYPE_FUZZY_THRESHOLD && (!best || sim > best.similarity)) {
        best = {
          chart: c,
          matchType: "archetype_fuzzy",
          similarity: sim,
          reason: `Same archetype (${c.chartType}) and near-identical question wording as "${c.title}" (${Math.round(sim * 100)}% token overlap).`,
        };
      }
    }
    if (best) return best;
    // Candidate carried an archetype but nothing crossed the archetype-
    // fuzzy threshold. Don't fall through to pure question matching —
    // that tier is reserved for archetype-less candidates so we don't
    // mis-merge a "ticket ladder" topic into a "duration profile" with
    // similarly-worded text.
    return null;
  }

  // (c) No archetype hint — high question similarity alone.
  for (const c of existing) {
    const sim = jaccardSimilarity(candTokens, tokenizeQuestion(c.question));
    if (sim >= QUESTION_ONLY_THRESHOLD && (!best || sim > best.similarity)) {
      best = {
        chart: c,
        matchType: "question_only",
        similarity: sim,
        reason: `Near-identical question wording to "${c.title}" (${Math.round(sim * 100)}% token overlap).`,
      };
    }
  }
  return best;
}
