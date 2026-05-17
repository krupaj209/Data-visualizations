// Pipeline-level smoke coverage for Task #113 — wiring question-bank
// overrides into the chart-generation pipeline.
//
// Exercises the two extracted helpers in `research-pipeline.ts`:
//
//   - `resolvePipelineOverrides` — DB-backed override loader hook the
//     orchestrator calls before `selectQuestions`. We avoid touching the
//     real DB by pre-populating the override arrays on the input, which
//     short-circuits the loader. Asserts the pre-population path is
//     respected (i.e. the wiring exists and forwards values through).
//
//   - `buildChartProvenance` — the merge step that decides what
//     override_source / override_id end up on each chart's stored
//     provenance. This is the contract writers rely on to see which
//     charts their override edits shaped.
//
// Run with: pnpm --filter @workspace/scripts run test-pipeline-overrides

import test from "node:test";
import assert from "node:assert/strict";

import {
  resolvePipelineOverrides,
  buildChartProvenance,
  type ChartProvenance,
  type ResearchPipelineInput,
} from "../../artifacts/api-server/src/lib/research-pipeline.ts";
import {
  assembleDeck,
  extractSignals,
  type AssembledQuestion,
  type OverrideAction,
} from "../../lib/question-bank/src/index.ts";

const TINY_DRD = `
# Colosseum, Rome

Crowds peak in summer; security screening at the gate. Skip-the-line is
popular and queues are long mid-morning.
`;

/* ---------------- resolvePipelineOverrides ---------------- */

test("resolvePipelineOverrides: pre-populated overrides are preserved (no DB call)", async () => {
  const categoryOverrides: OverrideAction[] = [
    {
      id: 1,
      action: "edit",
      bundleId: "timing",
      archetype: "hourly_heatmap",
      questionTemplate: "category override for {{ceName}}",
    },
  ];
  const ceOverrides: OverrideAction[] = [];
  const input: ResearchPipelineInput = {
    ce: { name: "Colosseum", city: "Rome", country: "Italy", slug: "colosseum" },
    subcategoryId: "1002",
    drdMarkdown: TINY_DRD,
    categoryOverrides,
    ceOverrides,
  };
  await resolvePipelineOverrides(input);
  // Loader must short-circuit when caller pre-supplied either array.
  assert.equal(input.categoryOverrides, categoryOverrides);
  assert.equal(input.ceOverrides, ceOverrides);
});

test("resolvePipelineOverrides: missing arrays trigger the DB loader and soft-fail to []", async () => {
  // Run with a slug that has no override rows seeded. The loader will
  // succeed and return empty arrays, or soft-fail (no DB) and also return
  // []. Either way the pipeline must end up with concrete arrays so the
  // assembler never sees `undefined`.
  const input: ResearchPipelineInput = {
    ce: {
      name: "Smoke CE",
      city: "Nowhere",
      country: "XX",
      slug: "__pipeline_overrides_smoke_ce__",
    },
    subcategoryId: "__pipeline_overrides_smoke_subcat__",
    drdMarkdown: TINY_DRD,
  };
  await resolvePipelineOverrides(input);
  assert.ok(Array.isArray(input.categoryOverrides), "categoryOverrides must be an array after resolve");
  assert.ok(Array.isArray(input.ceOverrides), "ceOverrides must be an array after resolve");
});

/* ---------------- buildChartProvenance ---------------- */

function blankVerifiedProvenance(): ChartProvenance {
  return {
    status: "drd_grounded",
    drd_snippets: [],
    web_sources: [],
    estimates: [],
    verifier_notes: "",
  };
}

test("buildChartProvenance: forwards override_source + override_id from an assembled question", () => {
  const signals = extractSignals(TINY_DRD);
  const ceOverrides: OverrideAction[] = [
    {
      id: 77,
      action: "edit",
      bundleId: "timing",
      archetype: "hourly_heatmap",
      questionTemplate: "OVERRIDE for {{ceName}}",
    },
  ];
  const deck = assembleDeck({
    ceName: "Colosseum",
    signals,
    pageType: "plan-your-visit",
    ceOverrides,
  });
  const sel: AssembledQuestion | undefined = deck.selected.find(
    (s) => s.archetype === "hourly_heatmap",
  );
  assert.ok(sel, "timing bundle should still pick hourly_heatmap");
  assert.equal(sel!.override_source, "ce");
  assert.equal(sel!.override_id, 77);

  const provenance = buildChartProvenance(
    sel!,
    blankVerifiedProvenance(),
    "plan-your-visit",
  );
  assert.equal(provenance.override_source, "ce");
  assert.equal(provenance.override_id, 77);
  assert.equal(provenance.bundle_id, "timing");
  assert.equal(provenance.page_type, "plan-your-visit");
});

test("buildChartProvenance: untouched candidates keep override_source='code' and omit override_id", () => {
  const signals = extractSignals(TINY_DRD);
  const deck = assembleDeck({
    ceName: "Colosseum",
    signals,
    pageType: "plan-your-visit",
  });
  assert.ok(deck.selected.length > 0, "deck should not be empty");
  for (const sel of deck.selected) {
    const provenance = buildChartProvenance(
      sel,
      blankVerifiedProvenance(),
      "plan-your-visit",
    );
    assert.equal(provenance.override_source, "code");
    assert.equal(provenance.override_id, undefined);
  }
});
