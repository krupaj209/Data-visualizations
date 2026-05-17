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
  const ticketsDeck = assembleDeck({
    ceName: "Colosseum",
    signals,
    pageType: "tickets-pricing",
  });
  const planArchetypes = planDeck.selected.map((q) => q.archetype).sort().join(",");
  const ticketsArchetypes = ticketsDeck.selected.map((q) => q.archetype).sort().join(",");
  assert.notEqual(
    planArchetypes,
    ticketsArchetypes,
    "plan-your-visit and tickets-pricing should not produce identical archetype sets",
  );
  assert.equal(planDeck.pageType, "plan-your-visit");
  assert.equal(ticketsDeck.pageType, "tickets-pricing");
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
    pageType: "tickets-pricing",
  });
  const tpl = getPageTemplate("tickets-pricing");
  assert.ok(deck.selected.length >= tpl.minCharts,
    `Thames tickets deck should hit min ${tpl.minCharts}, got ${deck.selected.length}`);
  // tickets-pricing template requires `value` + `choice` bundles, so a category-CE
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
