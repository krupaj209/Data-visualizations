import type { Chart } from "@workspace/api-client-react";

export interface DeckHealth {
  verified: number;
  estimated: number;
  needsAttention: number;
  total: number;
  /** Chart IDs keyed by category — first matching ID for scroll-to. */
  firstChartId: {
    verified: number | null;
    estimated: number | null;
    needsAttention: number | null;
  };
}

/**
 * Classifies each chart into one of three health buckets based on its
 * `provenance.status` and `provenance.verifier_notes` fields, which are
 * already present on every Chart object returned by `GET /api/ces/:slug`.
 *
 * Classification logic (same regex patterns used by chart-fact-table.ts):
 *   needsAttention — verifier_notes contains "issue(s)" or "failed"
 *   verified       — no issues AND status is "drd_grounded" or "web_grounded"
 *   estimated      — everything else (no provenance, status="estimated", etc.)
 */
export function computeDeckHealth(charts: Chart[]): DeckHealth {
  let verified = 0;
  let estimated = 0;
  let needsAttention = 0;
  let firstVerified: number | null = null;
  let firstEstimated: number | null = null;
  let firstNeedsAttention: number | null = null;

  for (const chart of charts) {
    const prov = chart.provenance as
      | { status?: string; verifier_notes?: string }
      | null
      | undefined;
    const hasIssues = /issue\(s\)|failed/i.test(prov?.verifier_notes ?? "");
    const status = prov?.status;

    if (hasIssues) {
      needsAttention++;
      if (firstNeedsAttention === null) firstNeedsAttention = chart.id;
    } else if (status === "drd_grounded" || status === "web_grounded") {
      verified++;
      if (firstVerified === null) firstVerified = chart.id;
    } else {
      estimated++;
      if (firstEstimated === null) firstEstimated = chart.id;
    }
  }

  return {
    verified,
    estimated,
    needsAttention,
    total: charts.length,
    firstChartId: {
      verified: firstVerified,
      estimated: firstEstimated,
      needsAttention: firstNeedsAttention,
    },
  };
}

/**
 * Plain-language verdict summarising the deck state for writers.
 * `isGenerating` is passed separately (it is a mutation state, not
 * derivable from chart data alone).
 */
export function deckVerdict(
  health: DeckHealth,
  isGenerating: boolean,
  isLocked: boolean,
): string {
  if (isGenerating) return "Generating…";
  if (health.total === 0) return "";
  if (!isLocked && health.needsAttention > 0) {
    return health.needsAttention === 1
      ? "1 chart needs attention"
      : `${health.needsAttention} charts need attention`;
  }
  if (health.verified === health.total) return "Ready to publish";
  if (health.estimated === health.total) return "All estimated";
  if (health.verified > 0 && health.estimated > 0 && health.needsAttention === 0) {
    return `${health.verified} verified`;
  }
  return `${health.verified} of ${health.total} verified`;
}
