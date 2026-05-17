/**
 * Unit tests for `findDuplicateChart` (Task #144).
 *
 * Run via:
 *   pnpm --filter @workspace/scripts run test-chart-dedupe
 *
 * Covers:
 *   - exact archetype + intent match short-circuits (highest priority)
 *   - fuzzy question Jaccard match on same archetype (≥0.6)
 *   - no match when archetype differs and questions are unrelated
 *   - curated-CE merge guard (callers pass mergeAllowed flag — the
 *     helper itself only finds matches; the merge button is gated by
 *     the route handler. We assert isLockedCe returns true for the
 *     locked Florence slugs so the route's gate stays trustworthy.)
 */

import {
  findDuplicateChart,
  jaccardSimilarity,
  tokenizeQuestion,
  type DedupeExistingChart,
} from "../../artifacts/api-server/src/lib/chart-dedupe.ts";
import { isLockedCe } from "../../artifacts/api-server/src/lib/locked-ces.ts";

let passed = 0;
let failed = 0;

function assert(cond: unknown, label: string): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

function chart(
  partial: Partial<DedupeExistingChart> & Pick<DedupeExistingChart, "id" | "question" | "chartType">,
): DedupeExistingChart {
  return {
    slug: `chart-${partial.id}`,
    title: partial.question.slice(0, 40),
    intentId: null,
    bundleId: null,
    ...partial,
  };
}

console.log("\nchart-dedupe — tokenizer + jaccard");
{
  const a = tokenizeQuestion("When is the best time to visit the Colosseum?");
  const b = tokenizeQuestion("What's the best time to visit Colosseum");
  const sim = jaccardSimilarity(a, b);
  assert(sim > 0.5, `similar wording produces high Jaccard (got ${sim.toFixed(2)})`);
  assert(
    jaccardSimilarity(
      tokenizeQuestion("hourly crowd patterns"),
      tokenizeQuestion("ticket prices and tiers"),
    ) < 0.2,
    "unrelated questions produce low Jaccard",
  );
}

console.log("\nchart-dedupe — archetype + intent short-circuit");
{
  const existing = [
    chart({
      id: 10,
      question: "Hourly crowd levels across the week",
      chartType: "hourly_heatmap",
      intentId: "decide_when_to_visit",
      bundleId: "timing",
    }),
  ];
  const match = findDuplicateChart(
    {
      question: "When is it busiest hour-by-hour?",
      archetype: "hourly_heatmap",
      intentId: "decide_when_to_visit",
    },
    existing,
  );
  assert(match?.chart.id === 10, "matched on archetype + intent");
  assert(match?.matchType === "archetype_intent", "matchType is archetype_intent");
}

console.log("\nchart-dedupe — fuzzy question on same archetype");
{
  const existing = [
    chart({
      id: 22,
      question: "How long should I plan to spend at the Uffizi?",
      chartType: "duration_profiles",
      intentId: "plan_visit_duration",
    }),
    chart({
      id: 23,
      question: "Ticket tiers and prices",
      chartType: "ticket_ladder",
    }),
  ];
  const match = findDuplicateChart(
    {
      question: "How long should visitors plan at the Uffizi gallery",
      archetype: "duration_profiles",
    },
    existing,
  );
  assert(match?.chart.id === 22, "fuzzy match landed on the right archetype");
  assert(match?.matchType === "archetype_fuzzy", "matchType is archetype_fuzzy");
  assert(
    (match?.similarity ?? 0) >= 0.6,
    `similarity above 0.6 threshold (got ${match?.similarity?.toFixed(2)})`,
  );
}

console.log("\nchart-dedupe — no match");
{
  const existing = [
    chart({
      id: 30,
      question: "Hourly crowd levels across the week",
      chartType: "hourly_heatmap",
    }),
  ];
  // Different archetype + unrelated question — neither rule fires.
  const match = findDuplicateChart(
    {
      question: "Ticket tier comparison for skip-the-line products",
      archetype: "ticket_ladder",
    },
    existing,
  );
  assert(match === null, "no match across archetypes with unrelated wording");

  // Same archetype but wording diverges — below 0.6 threshold.
  const match2 = findDuplicateChart(
    {
      question: "Average wait at the front entrance",
      archetype: "hourly_heatmap",
    },
    existing,
  );
  assert(match2 === null, "same archetype but low similarity returns null");
}

console.log("\nchart-dedupe — empty bank");
{
  const match = findDuplicateChart(
    { question: "Any topic", archetype: "weekly_pattern" },
    [],
  );
  assert(match === null, "empty existing list returns null");
}

console.log("\nchart-dedupe — curated CE merge guard");
{
  // The helper itself doesn't know about locked CEs — the route handler
  // gates the `mergeAllowed` flag using isLockedCe. Verify that gate
  // still recognises the locked Florence cluster (+ Colosseum reference
  // deck) so the UI keeps disabling the merge button there.
  assert(isLockedCe("galleria-dellaccademia"), "accademia is locked");
  assert(isLockedCe("galleria-degli-uffizi"), "uffizi is locked");
  assert(isLockedCe("duomo-di-firenze"), "duomo is locked");
  assert(isLockedCe("colosseum"), "colosseum is locked");
  assert(!isLockedCe("eiffel-tower"), "non-curated CE is not locked");

  // And the helper itself still surfaces a match even on a locked CE —
  // the route just declines the merge action.
  const existing = [
    chart({
      id: 99,
      question: "Hour-by-hour crowds at the Colosseum",
      chartType: "hourly_heatmap",
      intentId: "decide_when_to_visit",
    }),
  ];
  const match = findDuplicateChart(
    {
      question: "Hour by hour crowds at the colosseum",
      archetype: "hourly_heatmap",
      intentId: "decide_when_to_visit",
    },
    existing,
  );
  assert(
    match?.chart.id === 99,
    "match still produced on locked CE (gate is in the route, not the helper)",
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
