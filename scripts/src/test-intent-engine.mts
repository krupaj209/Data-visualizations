// Unit tests for the Task #99 intent-driven assembler:
//   - deterministic signal extraction
//   - assembleDeck honours page templates, retireArchetypes, and signals
//   - different pageType inputs yield different decks
//
// Imports the *real* helpers from the question-bank lib so a regression
// there will fail this suite. Run with tsx:
//
//   pnpm --filter @workspace/scripts run test-intent-engine

import test from "node:test";
import assert from "node:assert/strict";

import {
  assembleDeck,
  extractSignals,
  getPageTemplate,
  PAGE_TEMPLATES,
  QUESTION_BUNDLES,
  VISITOR_INTENTS,
  type ChartArchetypeId,
  type OverrideAction,
} from "../../lib/question-bank/src/index.ts";

const COLOSSEUM_DRD = `
# Colosseum, Rome

## Overview
The Colosseum draws ~7 million visitors a year. Peak season runs April through
October, with the highest pressure in July and August. Off-peak is November to
February. Visitors typically spend about 2 hours on site.

## Tickets & access
Timed-entry tickets are mandatory. Skip-the-line and combo tickets with the
Roman Forum/Palatine Hill are widely sold. Long queues form at the main
entrance, especially between 10:00 and 14:00. Security screening is required.

## Visit
An audio guide is provided and a guided tour can be booked. Several entrances
serve different ticket tiers.

## History
Construction began under Vespasian in 70 AD and was inaugurated by Titus in 80
AD with 100 days of games. The amphitheatre held gladiatorial combat, hunts,
and naval re-enactments. Restoration projects continue into the modern era.

## Confidence
Sources are largely authoritative across every section above.
`;

const VATICAN_DRD = `
# Vatican Museums

## Overview
Massive collection. Visit takes 2 to 4 hours. Crowds peak Tuesday and Saturday
mornings; afternoon slots are calmer. Seasonal variation is sharp — December
and January are noticeably quieter.

## Tickets
Skip-the-line entry is heavily marketed. Multiple entrance options exist for
group, individual, and early-access tiers. Dress code is enforced (covered
shoulders and knees). Security screening at entry.

## Tours & guides
Official guided tours and audio guides offered. Confidence: high for ticket
data, Low confidence for restaurant/snack options inside.
`;

const STUB_DRD = "Tiny CE. No structured data available.";

const THAMES_CRUISES_DRD = `
# Thames River Cruises (London)

Category page covering several distinct cruise products. Visitors typically pick
the wrong one and regret it, so the page must compare.

## Uber Boat by Thameslink — Commuter river bus
Fast, frequent, no commentary. Best for transport, not sightseeing.

## City Cruises — Hop-on hop-off sightseeing
Standard sightseeing loop with multiple entrances at Westminster, Tower, and
Greenwich piers. Live guide commentary. Dynamic pricing — fares vary by date.

## Greenwich Return Cruise — Round-trip to Greenwich
Two-hour return cruise. Operates seasonally with sharp seasonal variation;
sunset slots are heavily booked in summer.

## Thames Dinner Cruise — Evening dining
Dinner and dancing, after-hours / evening visit option.

## Hop-On Hop-Off River Pass
Combo with the London bus pass. Audio guide on board.

## Confidence
Pricing and timetable data come from operators. Reviews data is anecdotal.
`;

const SIMPLE_LANDMARK_DRD = `
# Tiny Village Chapel

A small chapel in a quiet village. Open daily from 9 to 5. Entry is free for
everyone. The space is intimate. Visit takes about 30 minutes total.
`;

/* ---------------- Bundle / intent registry sanity ---------------- */

test("registry: every bundle maps to a known visitor intent", () => {
  for (const bundle of Object.values(QUESTION_BUNDLES)) {
    assert.ok(
      VISITOR_INTENTS[bundle.intent],
      `bundle ${bundle.id} references unknown intent ${bundle.intent}`,
    );
    assert.ok(bundle.candidates.length > 0, `bundle ${bundle.id} has no candidates`);
  }
});

test("registry: every page-template slot references a valid bundle (unless forcedArchetype)", () => {
  for (const tpl of Object.values(PAGE_TEMPLATES)) {
    for (const slot of tpl.slots) {
      if (slot.forcedArchetype) continue;
      assert.ok(slot.bundleId, `template ${tpl.id} has slot with no bundle/forced archetype`);
      assert.ok(
        QUESTION_BUNDLES[slot.bundleId!],
        `template ${tpl.id} references unknown bundle ${slot.bundleId}`,
      );
    }
  }
});

/* ---------------- Signal extraction ---------------- */

test("extractSignals: Colosseum DRD lights up timing + STL + screening + history", () => {
  const s = extractSignals(COLOSSEUM_DRD);
  assert.equal(s.has_seasonal_variation, true);
  assert.equal(s.has_skip_the_line, true);
  assert.equal(s.has_long_queues, true);
  assert.equal(s.has_timed_entry, true);
  assert.equal(s.has_security_screening, true);
  assert.equal(s.has_multiple_entrances, true);
  assert.equal(s.has_guided_tours, true);
  assert.equal(s.has_audio_guide, true);
  assert.equal(s.has_historical_significance, true);
  assert.equal(s.drd_has_low_confidence_sections, false);
  assert.ok(s.typical_visit_minutes, "should parse '2 hours' visit duration");
});

test("extractSignals: Vatican DRD flags low_confidence + dress code", () => {
  const s = extractSignals(VATICAN_DRD);
  assert.equal(s.has_dress_code, true);
  assert.equal(s.drd_has_low_confidence_sections, true);
  assert.equal(s.has_skip_the_line, true);
  assert.equal(s.has_multiple_entrances, true);
});

test("extractSignals: empty/stub DRD returns the all-false baseline", () => {
  const s = extractSignals(STUB_DRD);
  assert.equal(s.has_seasonal_variation, false);
  assert.equal(s.has_skip_the_line, false);
  assert.equal(s.has_long_queues, false);
  assert.equal(s.has_historical_significance, false);
  assert.equal(s.typical_visit_minutes, null);
  assert.equal(s.sub_products.length, 0);
});

/* ---------------- assembleDeck ---------------- */

test("assembleDeck: plan-your-visit deck honours min/max chart bounds", () => {
  const signals = extractSignals(COLOSSEUM_DRD);
  const deck = assembleDeck({
    ceName: "Colosseum",
    signals,
    pageType: "plan-your-visit",
  });
  const tpl = getPageTemplate("plan-your-visit");
  assert.ok(deck.selected.length >= tpl.minCharts, `expected ≥${tpl.minCharts} charts`);
  assert.ok(deck.selected.length <= tpl.maxCharts, `expected ≤${tpl.maxCharts} charts`);
  for (const q of deck.selected) {
    assert.ok(q.question.includes("Colosseum"), `ceName must be substituted: ${q.question}`);
    assert.ok(q.bundle_id, "every selected question must carry a bundle_id");
    assert.ok(q.intent_id, "every selected question must carry an intent_id");
  }
});

test("assembleDeck: history pageType always emits a history_timeline (forced slot)", () => {
  const signals = extractSignals(COLOSSEUM_DRD);
  const deck = assembleDeck({
    ceName: "Colosseum",
    signals,
    pageType: "history",
  });
  const hasTimeline = deck.selected.some((q) => q.archetype === "history_timeline");
  assert.ok(hasTimeline, "history template must always include the canonical history_timeline");
  const timeline = deck.selected.find((q) => q.archetype === "history_timeline")!;
  assert.equal(timeline.bundle_id, "narrative");
  assert.equal(timeline.intent_id, "narrative");
});

test("assembleDeck: different pageType yields different decks for same CE", () => {
  const signals = extractSignals(COLOSSEUM_DRD);
  const planDeck = assembleDeck({
    ceName: "Colosseum",
    signals,
    pageType: "plan-your-visit",
  });
  const combosDeck = assembleDeck({
    ceName: "Colosseum",
    signals,
    pageType: "combo-deals",
  });
  const planArchetypes = planDeck.selected.map((q) => q.archetype).sort().join(",");
  const combosArchetypes = combosDeck.selected.map((q) => q.archetype).sort().join(",");
  assert.notEqual(
    planArchetypes,
    combosArchetypes,
    "plan-your-visit and combo-deals should not produce identical archetype sets",
  );
  assert.equal(planDeck.pageType, "plan-your-visit");
  assert.equal(combosDeck.pageType, "combo-deals");
});

test("assembleDeck: retireArchetypes is honoured (banned archetype never emitted)", () => {
  const signals = extractSignals(COLOSSEUM_DRD);
  const retire: ChartArchetypeId[] = ["hourly_heatmap", "weekly_pattern"];
  const deck = assembleDeck({
    ceName: "Colosseum",
    signals,
    pageType: "plan-your-visit",
    retireArchetypes: retire,
  });
  for (const q of deck.selected) {
    assert.ok(
      !retire.includes(q.archetype),
      `retired archetype ${q.archetype} leaked into deck`,
    );
  }
});

test("assembleDeck: empty-DRD CE still produces a usable deck via low-requirement bundles", () => {
  const signals = extractSignals(STUB_DRD);
  const deck = assembleDeck({
    ceName: "Stub Attraction",
    signals,
    pageType: "plan-your-visit",
  });
  // Some bundles have no required signals, so the deck should not be empty.
  assert.ok(deck.selected.length > 0, "even a signal-poor CE should get *some* charts");
  // Bundle audit must record an entry per slot for diagnostics.
  assert.ok(deck.bundle_audit.length > 0, "bundle_audit must be populated");
});

test("assembleDeck: Thames-cruises category CE detects multiple sub-products + seasonal/evening signals", () => {
  const signals = extractSignals(THAMES_CRUISES_DRD);
  assert.equal(signals.has_multiple_sub_products, true,
    "Thames page lists 5 named sub-products — has_multiple_sub_products must fire");
  assert.ok(signals.sub_products.length >= 3,
    `expected ≥3 sub_products, got ${signals.sub_products.length}: ${signals.sub_products.join(", ")}`);
  assert.equal(signals.has_seasonal_variation, true);
  assert.equal(signals.has_evening_program, true);
  assert.equal(signals.has_dynamic_pricing, true);
  assert.equal(signals.has_multiple_entrances, true);

  const deck = assembleDeck({
    ceName: "Thames River Cruises",
    signals,
    pageType: "combo-deals",
  });
  const tpl = getPageTemplate("combo-deals");
  assert.ok(deck.selected.length >= tpl.minCharts,
    `Thames combo-deals deck should hit min ${tpl.minCharts}, got ${deck.selected.length}`);
  // combo-deals template requires `choice` + `value` bundles, so a category-CE
  // with multiple sub-products MUST be able to fire the choice bundle.
  const choiceFired = deck.bundle_audit.some((b) => b.bundle_id === "choice" && b.fired);
  assert.ok(choiceFired, "choice bundle must fire for a category CE with multiple sub-products");
});

test("assembleDeck: simple-landmark CE drops gated bundles via required_signals", () => {
  const signals = extractSignals(SIMPLE_LANDMARK_DRD);
  // The simple chapel has none of the signals that gate complex bundles.
  assert.equal(signals.has_skip_the_line, false);
  assert.equal(signals.has_long_queues, false);
  assert.equal(signals.has_guided_tours, false);
  assert.equal(signals.has_audio_guide, false);

  const richDeck = assembleDeck({
    ceName: "Colosseum",
    signals: extractSignals(COLOSSEUM_DRD),
    pageType: "plan-your-visit",
  });
  const sparseDeck = assembleDeck({
    ceName: "Tiny Village Chapel",
    signals,
    pageType: "plan-your-visit",
  });
  // Rich CE should pull more bundle_score total than the sparse one — i.e. the
  // assembler's behaviour is signal-sensitive, not just template-deterministic.
  const richScore = richDeck.bundle_audit
    .filter((b) => b.fired)
    .reduce((sum, b) => sum + b.score, 0);
  const sparseScore = sparseDeck.bundle_audit
    .filter((b) => b.fired)
    .reduce((sum, b) => sum + b.score, 0);
  assert.ok(richScore > sparseScore,
    `expected rich CE bundle scores (${richScore}) to exceed sparse CE (${sparseScore})`);
});

test("assembleDeck: bundle_audit reports score + triggering_signals for fired bundles", () => {
  const signals = extractSignals(COLOSSEUM_DRD);
  const deck = assembleDeck({
    ceName: "Colosseum",
    signals,
    pageType: "plan-your-visit",
  });
  const fired = deck.bundle_audit.filter((b) => b.fired);
  assert.ok(fired.length > 0, "at least one bundle must fire for a rich DRD");
  for (const entry of fired) {
    assert.ok(entry.score >= 0, "fired bundle must have a numeric score");
    assert.ok(Array.isArray(entry.triggering_signals));
  }
});

/* ---------------- Overrides (Task #113) ---------------- */

test("assembleDeck: category 'edit' override rewrites the question template + tags override_source/override_id", () => {
  const signals = extractSignals(COLOSSEUM_DRD);
  const categoryOverrides: OverrideAction[] = [
    {
      id: 42,
      action: "edit",
      bundleId: "timing",
      archetype: "hourly_heatmap",
      questionTemplate: "CATEGORY EDIT: when is {{ceName}} truly quiet?",
    },
  ];
  const deck = assembleDeck({
    ceName: "Colosseum",
    signals,
    pageType: "plan-your-visit",
    categoryOverrides,
  });
  const hit = deck.selected.find((s) => s.archetype === "hourly_heatmap");
  assert.ok(hit, "timing bundle should still pick hourly_heatmap");
  assert.equal(hit!.question, "CATEGORY EDIT: when is Colosseum truly quiet?");
  assert.equal(hit!.override_source, "category");
  assert.equal(hit!.override_id, 42);
});

test("assembleDeck: CE-scope override wins over category-scope override (last-layer wins)", () => {
  const signals = extractSignals(COLOSSEUM_DRD);
  const categoryOverrides: OverrideAction[] = [
    {
      id: 1,
      action: "edit",
      bundleId: "timing",
      archetype: "hourly_heatmap",
      questionTemplate: "CATEGORY VERSION for {{ceName}}",
    },
  ];
  const ceOverrides: OverrideAction[] = [
    {
      id: 99,
      action: "edit",
      bundleId: "timing",
      archetype: "hourly_heatmap",
      questionTemplate: "CE VERSION for {{ceName}}",
    },
  ];
  const deck = assembleDeck({
    ceName: "Colosseum",
    signals,
    pageType: "plan-your-visit",
    categoryOverrides,
    ceOverrides,
  });
  const hit = deck.selected.find((s) => s.archetype === "hourly_heatmap")!;
  assert.equal(hit.question, "CE VERSION for Colosseum");
  assert.equal(hit.override_source, "ce");
  assert.equal(hit.override_id, 99);
});

test("assembleDeck: 'mute' override forces fallback to the next viable candidate in the bundle", () => {
  const signals = extractSignals(COLOSSEUM_DRD);
  const baseDeck = assembleDeck({
    ceName: "Colosseum",
    signals,
    pageType: "plan-your-visit",
  });
  const basePick = baseDeck.selected.find((s) => s.bundle_id === "timing");
  assert.ok(basePick, "timing bundle should pick something by default");

  const ceOverrides: OverrideAction[] = [
    {
      id: 7,
      action: "mute",
      bundleId: "timing",
      archetype: basePick!.archetype,
    },
  ];
  const mutedDeck = assembleDeck({
    ceName: "Colosseum",
    signals,
    pageType: "plan-your-visit",
    ceOverrides,
  });
  const mutedPick = mutedDeck.selected.find((s) => s.bundle_id === "timing");
  assert.ok(mutedPick, "timing bundle should still fire — just with a different archetype");
  assert.notEqual(
    mutedPick!.archetype,
    basePick!.archetype,
    "muted archetype must not be selected",
  );
});

test("Task #163: assembler never emits queue_compare for any page template", () => {
  // Walk every page template against several representative DRDs. Whichever
  // signals are present, `queue_compare` must never be selected because
  // it's flagged implemented:false in the archetype registry. If a line/
  // lane question is asked, `entrance_lanes` should win the slot.
  const drds = [COLOSSEUM_DRD, VATICAN_DRD];
  for (const pageType of Object.keys(PAGE_TEMPLATES) as Array<
    keyof typeof PAGE_TEMPLATES
  >) {
    for (const drd of drds) {
      const signals = extractSignals(drd);
      const deck = assembleDeck({
        ceName: "Test CE",
        signals,
        pageType,
      });
      for (const sel of deck.selected) {
        assert.notEqual(
          sel.archetype as ChartArchetypeId,
          "queue_compare",
          `pageType=${pageType}: assembler returned retired queue_compare archetype`,
        );
      }
    }
  }
});

test("assembleDeck: candidates left untouched by overrides keep override_source='code'", () => {
  const signals = extractSignals(COLOSSEUM_DRD);
  const categoryOverrides: OverrideAction[] = [
    {
      id: 3,
      action: "edit",
      bundleId: "timing",
      archetype: "weekly_pattern",
      questionTemplate: "UNUSED EDIT for {{ceName}}",
    },
  ];
  const deck = assembleDeck({
    ceName: "Colosseum",
    signals,
    pageType: "plan-your-visit",
    categoryOverrides,
  });
  // Any chart from a non-timing bundle should still report override_source "code".
  const nonTiming = deck.selected.filter((s) => s.bundle_id !== "timing");
  assert.ok(nonTiming.length > 0, "expected at least one non-timing chart");
  for (const q of nonTiming) {
    assert.equal(
      q.override_source,
      "code",
      `bundle ${q.bundle_id} should be untouched by a timing-only override`,
    );
    assert.equal(q.override_id, undefined);
  }
});
