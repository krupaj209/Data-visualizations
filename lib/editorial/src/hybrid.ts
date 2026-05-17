/**
 * Hybrid overlay assembler — used by Task #109 to wrap CE detail chart cards
 * with an editorial narrative header.
 *
 * Prefers Gemini-generated chartSpec.title / subtitle / insight (and the
 * optional `headline` carried by a few archetypes) verbatim. Falls back to
 * the template engine only for fields the spec doesn't supply. Confidence
 * comes from provenance signals via deriveConfidenceFromProvenance.
 *
 * The trimmed UI in viz-studio ignores CTA / social proof / warning /
 * personalization, so we zero those out here so they can't accidentally
 * leak through.
 */

import {
  EditorialOverlay as EditorialOverlaySchema,
  type EditorialOverlay,
} from "./types";
import { generateEditorialOverlay } from "./engine";

// ─────────────────────────────────────────────────────────────
// Confidence derivation from research-pipeline provenance
// ─────────────────────────────────────────────────────────────

export type ConfidenceLevel = "live" | "high" | "medium" | "low";

/** Loose shape — matches `ChartProvenanceLite` in viz-studio + the api-server
 *  provenance jsonb. Kept structural so the editorial lib doesn't depend on
 *  chart-spec internals. */
export interface ProvenanceLike {
  status?: string;
  drd_snippets?: unknown[];
  web_sources?: unknown[];
  estimates?: unknown[];
  verifier_notes?: string;
  intelligence_refs?: unknown[];
}

interface ConfidenceResult {
  level: ConfidenceLevel;
  explanation: string;
  dataPoints?: number;
}

/**
 * Map the chart's provenance into a four-tier confidence band:
 *
 *   web_sources ≥ 5 AND status hints at live grounding  → live
 *   web_sources ≥ 3 OR drd_snippets ≥ 2                 → high
 *   web_sources ≥ 1 OR drd_snippets ≥ 1                 → medium
 *   estimates-only / nothing                            → low
 *
 * A verifier note caps confidence at medium (the verifier flagged
 * something worth a second look). Status strings containing "live"
 * or "web_grounded" promote a high-tier result to live when there
 * are also enough sources to back it.
 */
export function deriveConfidenceFromProvenance(
  provenance: ProvenanceLike | null | undefined,
): ConfidenceResult {
  if (!provenance) {
    return {
      level: "low",
      explanation: "No grounding sources recorded for this chart.",
    };
  }

  const sourcesCount = Array.isArray(provenance.web_sources)
    ? provenance.web_sources.length
    : 0;
  const snippetsCount = Array.isArray(provenance.drd_snippets)
    ? provenance.drd_snippets.length
    : 0;
  const estimatesCount = Array.isArray(provenance.estimates)
    ? provenance.estimates.length
    : 0;
  const hasVerifierNotes =
    typeof provenance.verifier_notes === "string" &&
    provenance.verifier_notes.trim().length > 0;
  const status =
    typeof provenance.status === "string" ? provenance.status : "";
  const statusSignalsLive = /live|web_grounded/i.test(status);

  let level: ConfidenceLevel;
  if (sourcesCount >= 5 && statusSignalsLive && !hasVerifierNotes) {
    level = "live";
  } else if (sourcesCount >= 3 || snippetsCount >= 2) {
    level = "high";
  } else if (sourcesCount >= 1 || snippetsCount >= 1) {
    level = "medium";
  } else {
    level = "low";
  }

  if (hasVerifierNotes && (level === "high" || level === "live")) {
    level = "medium";
  }

  // Estimate density downgrade — when the chart leans on many bare
  // estimates relative to grounded evidence, soften the badge by one
  // tier. Anything with twice as many estimates as sources+snippets
  // counts as estimate-heavy.
  const groundedCount = sourcesCount + snippetsCount;
  const estimateHeavy =
    estimatesCount > 0 && estimatesCount >= Math.max(groundedCount * 2, 3);
  if (estimateHeavy) {
    if (level === "live") level = "high";
    else if (level === "high") level = "medium";
    else if (level === "medium") level = "low";
  }

  const parts: string[] = [];
  if (sourcesCount > 0) parts.push(`${sourcesCount} web source${sourcesCount === 1 ? "" : "s"}`);
  if (snippetsCount > 0) parts.push(`${snippetsCount} research snippet${snippetsCount === 1 ? "" : "s"}`);
  if (estimatesCount > 0) parts.push(`${estimatesCount} field estimate${estimatesCount === 1 ? "" : "s"}`);
  if (hasVerifierNotes) parts.push("verifier flagged a note");
  const explanation =
    parts.length > 0
      ? `Grounded by ${parts.join(" + ")}.`
      : "Mostly estimated — no external grounding recorded.";

  return {
    level,
    explanation,
    dataPoints: sourcesCount + snippetsCount,
  };
}

// ─────────────────────────────────────────────────────────────
// Hybrid assembler
// ─────────────────────────────────────────────────────────────

interface ChartSpecLike {
  type: string;
  title?: string;
  subtitle?: string;
  insight?: string;
  headline?: string;
  [k: string]: unknown;
}

interface AssembleOptions {
  pageType?: string;
  archetype?: string;
}

/**
 * Build an EditorialOverlay for the Studio CE detail chart card.
 *
 * Hybrid rules:
 *  - Headline: prefer spec.headline > spec.title > template fallback
 *  - Subhead:  prefer spec.subtitle > template fallback
 *  - KeyInsight (.tip): prefer spec.insight > template fallback
 *  - Confidence: always derived from provenance, never from spec
 *  - CTA / socialProof / warning / personalizationNote: zeroed out
 */
export function assembleHybridOverlay(
  chartSpec: ChartSpecLike,
  provenance: ProvenanceLike | null | undefined,
  ceName: string,
  options: AssembleOptions = {},
): EditorialOverlay {
  const pageType = options.pageType ?? "plan-your-visit";
  const archetype = options.archetype ?? "context";

  const templated = generateEditorialOverlay({
    pageType,
    chartType: chartSpec.type,
    archetype,
    chartData: {},
    ceData: { name: ceName },
  });

  const headline =
    (typeof chartSpec.headline === "string" && chartSpec.headline.trim()) ||
    (typeof chartSpec.title === "string" && chartSpec.title.trim()) ||
    templated.headline;

  const subheadline =
    (typeof chartSpec.subtitle === "string" && chartSpec.subtitle.trim()) ||
    templated.subheadline;

  // Field-by-field fallback: prefer spec.insight verbatim; otherwise fall
  // back to whatever key-insight tip the template engine generated so the
  // overlay never silently drops the callout for charts that don't carry
  // their own `insight` string.
  const insightCopy =
    typeof chartSpec.insight === "string" && chartSpec.insight.trim()
      ? chartSpec.insight.trim()
      : undefined;
  const tip = insightCopy
    ? { icon: "💡", text: insightCopy, highlight: true as const }
    : templated.tip ?? undefined;

  const confidenceResult = deriveConfidenceFromProvenance(provenance);

  return EditorialOverlaySchema.parse({
    headline,
    subheadline,
    cta: undefined,
    tip,
    warning: undefined,
    personalizationNote: undefined,
    socialProof: undefined,
    confidence: {
      level: confidenceResult.level,
      explanation: confidenceResult.explanation,
      dataPoints: confidenceResult.dataPoints,
    },
    freshness: {
      lastUpdated: new Date().toISOString(),
      updateFrequency: "monthly",
    },
    generatedAt: new Date().toISOString(),
    generatedBy: "hybrid",
  });
}
