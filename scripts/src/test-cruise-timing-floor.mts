// Unit tests for the deterministic category-CE timing floor (Task #80).
//
// The floor lives in `artifacts/api-server/src/lib/research-pipeline.ts`
// and is exposed as the pure helper `pickCategoryCeTimingFloor` so this
// suite can pin its behaviour without spinning up the full Gemini
// pipeline. Run with tsx:
//
//   pnpm --filter @workspace/scripts run test-cruise-timing-floor

import test from "node:test";
import assert from "node:assert/strict";

import {
  applyCategoryCeTimingFloor,
  drdImpliesUnlimitedCapacity,
  pickCategoryCeTimingFloor,
  TIMING_ARCHETYPES,
  type PlannerSelection,
} from "../../artifacts/api-server/src/lib/research-pipeline.ts";
import {
  STANDARD_QUESTIONS,
  getSubcategoryBankFlexible,
} from "../../lib/question-bank/src/index.ts";

const cruiseBank = getSubcategoryBankFlexible("sightseeing_cruises");

test("sightseeing_cruises bank exposes a daily_pattern timing question", () => {
  const dp = cruiseBank.questions.find(
    (q) => q.recommended_archetype === "daily_pattern",
  );
  assert.ok(dp, "expected a daily_pattern question");
  assert.equal(dp!.skip_if?.type, "no_data_signal");
});

test("sightseeing_cruises bank exposes a cruise-framed booking_window signature", () => {
  const bw = cruiseBank.questions.find(
    (q) => q.recommended_archetype === "booking_window",
  );
  assert.ok(bw, "expected a booking_window signature");
  assert.match(bw!.question.toLowerCase(), /summer|sell.?out|ahead/);
});

test("sightseeing_cruises optimal_departure notes cover sunset-by-month", () => {
  const od = cruiseBank.questions.find(
    (q) => q.recommended_archetype === "optimal_departure",
  );
  assert.ok(od, "expected an optimal_departure question");
  assert.match(od!.notes ?? "", /sunset/i);
  assert.match(od!.notes ?? "", /month|season|golden hour/i);
});

test("category-CE with no timing chart restores a daily_pattern from the bank", () => {
  const pick = pickCategoryCeTimingFloor({
    isCategoryCe: true,
    selectedArchetypes: ["slot_compare", "compare_zones", "landmark_coverage"],
    bankQuestions: cruiseBank.questions,
    standardQuestions: STANDARD_QUESTIONS,
    dropped: [],
  });
  assert.ok(pick, "expected a floor pick");
  assert.ok(
    TIMING_ARCHETYPES.has(pick!.pick.archetype),
    `expected a timing archetype, got ${pick!.pick.archetype}`,
  );
  // Bank candidates come before standards — first cruise timing entry is
  // the booking_window signature ("How far ahead do summer slots..."),
  // followed by daily_pattern, followed by optimal_departure. Whichever
  // surfaces, it must be a bank entry (kind:"signature") not the standard.
  assert.equal(pick!.pick.source, "bank");
});

test("non-category CE never triggers the timing floor", () => {
  const pick = pickCategoryCeTimingFloor({
    isCategoryCe: false,
    selectedArchetypes: ["slot_compare"],
    bankQuestions: cruiseBank.questions,
    standardQuestions: STANDARD_QUESTIONS,
    dropped: [],
  });
  assert.equal(pick, null);
});

test("returns null when a timing chart is already in the deck", () => {
  const pick = pickCategoryCeTimingFloor({
    isCategoryCe: true,
    selectedArchetypes: ["slot_compare", "weekly_pattern"],
    bankQuestions: cruiseBank.questions,
    standardQuestions: STANDARD_QUESTIONS,
    dropped: [],
  });
  assert.equal(pick, null);
});

test("hard-signal drops are respected: every timing candidate skipped → null", () => {
  // Pre-drop every cruise+standard timing candidate with a hard data
  // signal reason. The floor should refuse to restore any of them and
  // return null so the caller logs a warning.
  const allTimingQs = [
    ...cruiseBank.questions,
    ...STANDARD_QUESTIONS,
  ].filter((q) => TIMING_ARCHETYPES.has(q.recommended_archetype));
  const dropped = allTimingQs.map((q) => ({
    question: q.question,
    reason: "no_data_signal: DRD has no hour/lead-time/sunset evidence",
  }));
  const pick = pickCategoryCeTimingFloor({
    isCategoryCe: true,
    selectedArchetypes: ["slot_compare", "compare_zones"],
    bankQuestions: cruiseBank.questions,
    standardQuestions: STANDARD_QUESTIONS,
    dropped,
  });
  assert.equal(pick, null);
});

test("non-hard-signal drop reasons (e.g. budget) do NOT block restoration", () => {
  // A timing candidate the LLM dropped only for budget should still be
  // available to the floor.
  const allTimingQs = [...cruiseBank.questions, ...STANDARD_QUESTIONS].filter(
    (q) => TIMING_ARCHETYPES.has(q.recommended_archetype),
  );
  const dropped = allTimingQs.map((q) => ({
    question: q.question,
    reason: "signature_budget: capped at 5 per CE",
  }));
  const pick = pickCategoryCeTimingFloor({
    isCategoryCe: true,
    selectedArchetypes: ["slot_compare"],
    bankQuestions: cruiseBank.questions,
    standardQuestions: STANDARD_QUESTIONS,
    dropped,
  });
  assert.ok(pick, "expected restoration despite soft drop reason");
  assert.equal(pick!.removeFromDropped, pick!.pick.question);
});

test("falls through to the booking_window standard when bank lacks a timing entry", () => {
  // Synthetic bank with NO timing archetypes — should pick S2 booking_window.
  const syntheticBank = cruiseBank.questions.filter(
    (q) => !TIMING_ARCHETYPES.has(q.recommended_archetype),
  );
  const pick = pickCategoryCeTimingFloor({
    isCategoryCe: true,
    selectedArchetypes: ["slot_compare"],
    bankQuestions: syntheticBank,
    standardQuestions: STANDARD_QUESTIONS,
    dropped: [],
  });
  assert.ok(pick, "expected a fallback to standards");
  assert.equal(pick!.pick.source, "standard");
  // First TIMING-set standard is S1 weekly_pattern — bank-first, then
  // standards in declared order. booking_window (S2) only wins if S1 is
  // absent or hard-skipped.
  assert.ok(
    TIMING_ARCHETYPES.has(pick!.pick.archetype),
    `expected a TIMING archetype, got ${pick!.pick.archetype}`,
  );
});

test("drdImpliesUnlimitedCapacity catches operator-explicit phrasing", () => {
  assert.equal(
    drdImpliesUnlimitedCapacity(
      "Capacity\n- Operator runs unlimited capacity walk-up boats.",
    ),
    true,
  );
  assert.equal(
    drdImpliesUnlimitedCapacity(
      "Booking window\n- Greenwich cruises typically sell out 7-14 days ahead in summer.",
    ),
    false,
  );
  assert.equal(drdImpliesUnlimitedCapacity(""), false);
  assert.equal(
    drdImpliesUnlimitedCapacity("Walk-ups are available alongside booked seats."),
    false,
  );
  assert.equal(
    drdImpliesUnlimitedCapacity("This product never sells out — turn-up-and-go."),
    true,
  );
});

// Integration-style coverage of the full step (4c) post-processing
// behaviour (Task #80, code-review fix #3). Exercises cap interactions
// against a hand-rolled deck so we don't have to spin up Gemini.
function sel(
  question: string,
  archetype: PlannerSelection["archetype"],
  kind: PlannerSelection["kind"] = "signature",
): PlannerSelection {
  return { question, archetype, rationale: "test", kind };
}

test("applyCategoryCeTimingFloor: at TOTAL_MAX with no timing chart, displaces a signature and seats the floor pick", () => {
  // 7 selections (TOTAL_MAX): 2 standards + 5 non-timing signatures, no
  // TIMING archetype. The floor MUST seat one timing chart by displacing
  // the lowest-ranked signature, not by appending and getting trimmed.
  const initial: PlannerSelection[] = [
    sel("S1", "weekly_pattern", "standard"), // wait — standard timing! drop this for the test
    sel("S2", "ticket_ladder", "standard"),
    sel("Q1", "slot_compare"),
    sel("Q2", "compare_zones"),
    sel("Q3", "landmark_coverage"),
    sel("Q4", "itinerary_flow"),
    sel("Q5", "time_split"),
  ];
  // Replace the accidental timing standard with a non-timing one.
  initial[0] = sel("S0", "stat_grid", "standard");
  const result = applyCategoryCeTimingFloor({
    selected: initial,
    dropped: [],
    bankQuestions: cruiseBank.questions,
    standardQuestions: STANDARD_QUESTIONS,
    signatureMax: 5,
    totalMax: 7,
  });
  assert.equal(result.selected.length, 7, "deck must stay at TOTAL_MAX");
  const timingCount = result.selected.filter((s) =>
    TIMING_ARCHETYPES.has(s.archetype),
  ).length;
  assert.equal(timingCount, 1, "exactly one timing chart must be present");
  // The displaced entry must be a signature (Q5 — last signature in
  // selection order), not a standard.
  const droppedReasons = result.dropped.map((d) => d.reason);
  assert.ok(
    droppedReasons.some((r) =>
      r.includes("displaced by category-CE timing floor"),
    ),
    "must record a displacement reason",
  );
  assert.ok(
    !result.selected.some((s) => s.question === "Q5"),
    "lowest-ranked signature (Q5) must have been displaced",
  );
  // Standards must survive untouched.
  assert.ok(result.selected.some((s) => s.question === "S0"));
  assert.ok(result.selected.some((s) => s.question === "S2"));
});

test("applyCategoryCeTimingFloor: deck already has a timing chart → no-op", () => {
  const initial: PlannerSelection[] = [
    sel("S0", "stat_grid", "standard"),
    sel("Q1", "slot_compare"),
    sel("Q2", "weekly_pattern"), // already a timing chart
  ];
  const result = applyCategoryCeTimingFloor({
    selected: initial,
    dropped: [],
    bankQuestions: cruiseBank.questions,
    standardQuestions: STANDARD_QUESTIONS,
    signatureMax: 5,
    totalMax: 7,
  });
  assert.equal(result.selected.length, 3);
  assert.equal(result.dropped.length, 0);
  assert.equal(result.warning, undefined);
});

test("applyCategoryCeTimingFloor: at TOTAL_MAX with only standards and no signatures → refuse and warn", () => {
  // Pathological: 7 standards (no signatures available to displace).
  // The floor must refuse to seat the pick rather than evict a standard.
  const initial: PlannerSelection[] = Array.from({ length: 7 }, (_, i) =>
    sel(`STD${i}`, "stat_grid", "standard"),
  );
  const result = applyCategoryCeTimingFloor({
    selected: initial,
    dropped: [],
    bankQuestions: cruiseBank.questions,
    standardQuestions: STANDARD_QUESTIONS,
    signatureMax: 5,
    totalMax: 7,
  });
  assert.equal(result.selected.length, 7);
  assert.equal(result.warning, "all_candidates_skipped");
});

test("applyCategoryCeTimingFloor: every timing candidate hard-skipped → warns 'all_candidates_skipped'", () => {
  const allTimingQs = [
    ...cruiseBank.questions,
    ...STANDARD_QUESTIONS,
  ].filter((q) => TIMING_ARCHETYPES.has(q.recommended_archetype));
  const initial: PlannerSelection[] = [
    sel("S0", "stat_grid", "standard"),
    sel("Q1", "slot_compare"),
  ];
  const result = applyCategoryCeTimingFloor({
    selected: initial,
    dropped: allTimingQs.map((q) => ({
      question: q.question,
      reason: "no_data_signal: not grounded for this CE",
    })),
    bankQuestions: cruiseBank.questions,
    standardQuestions: STANDARD_QUESTIONS,
    signatureMax: 5,
    totalMax: 7,
  });
  assert.equal(result.warning, "all_candidates_skipped");
  assert.equal(result.selected.length, 2);
});

test("when earlier timing standards are hard-skipped, booking_window wins", () => {
  const syntheticBank = cruiseBank.questions.filter(
    (q) => !TIMING_ARCHETYPES.has(q.recommended_archetype),
  );
  // Hard-skip every TIMING-set standard *before* booking_window in
  // declared order, so the deterministic walk lands on booking_window.
  const dropped: { question: string; reason: string }[] = [];
  for (const std of STANDARD_QUESTIONS) {
    if (std.recommended_archetype === "booking_window") break;
    if (TIMING_ARCHETYPES.has(std.recommended_archetype)) {
      dropped.push({
        question: std.question,
        reason: "no_data_signal: not grounded for this CE",
      });
    }
  }
  const pick = pickCategoryCeTimingFloor({
    isCategoryCe: true,
    selectedArchetypes: ["slot_compare"],
    bankQuestions: syntheticBank,
    standardQuestions: STANDARD_QUESTIONS,
    dropped,
  });
  assert.ok(pick, "expected a fallback to booking_window");
  assert.equal(pick!.pick.source, "standard");
  assert.equal(pick!.pick.archetype, "booking_window");
});
