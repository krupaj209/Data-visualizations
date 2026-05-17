/**
 * Unit coverage for the question-overrides merge layer.
 *
 * Required matrix:
 *   1. Empty layers ⇒ deck identical to code defaults, every override_source = "code".
 *   2. Category-scope edit rewrites a question template (override_source = "category" + id).
 *   3. Category-scope add introduces a new candidate when defaults are muted.
 *   4. Category-scope mute suppresses a candidate.
 *   5. CE-scope mute suppresses a candidate (falls through to next candidate).
 *   6. CE-scope override beats category-scope edit on same candidate.
 *   7. CE-scope mute beats category-scope add on same archetype.
 *   8. CE-scope add introduces a new candidate (when defaults muted).
 *   9. override_id is threaded through to AssembledQuestion.
 *  10. mergeBundleOverrides direct unit — annotated layering order.
 */

import {
  QUESTION_BUNDLES,
  assembleDeck,
  mergeBundleOverrides,
  type OverrideAction,
} from "../../lib/question-bank/src/index.ts";

const ALL_SIGNALS = {
  has_seasonal_variation: true,
  has_skip_the_line: true,
  has_long_queues: true,
  has_timed_entry: true,
  has_multiple_sub_products: true,
  has_multiple_entrances: true,
  has_security_screening: true,
  has_dress_code: true,
  has_evening_program: true,
  has_guided_tours: true,
  has_weather_sensitivity: false,
  has_wildlife_sighting: false,
  has_historical_significance: false,
  has_dynamic_pricing: false,
  has_accessibility_concerns: false,
  drd_has_low_confidence_sections: false,
  sub_products: ["standard", "premium"],
  typical_visit_minutes: 120,
} as const;

let failed = 0;
function assert(cond: unknown, label: string) {
  if (!cond) {
    failed++;
    console.error(`  ✗ ${label}`);
  } else {
    console.log(`  ✓ ${label}`);
  }
}

function muteAllInTiming(): OverrideAction[] {
  return QUESTION_BUNDLES.timing.candidates.map((c, idx) => ({
    action: "mute" as const,
    id: 9000 + idx,
    bundleId: "timing",
    archetype: c.archetype,
  }));
}

console.log("1. Empty overrides ⇒ identical deck to code defaults");
{
  const base = assembleDeck({
    ceName: "Test CE",
    signals: { ...ALL_SIGNALS },
    pageType: "plan-your-visit",
  });
  const overridden = assembleDeck({
    ceName: "Test CE",
    signals: { ...ALL_SIGNALS },
    pageType: "plan-your-visit",
    categoryOverrides: [],
    ceOverrides: [],
  });
  assert(
    JSON.stringify(base.selected.map((s) => s.archetype)) ===
      JSON.stringify(overridden.selected.map((s) => s.archetype)),
    "selected archetypes match",
  );
  assert(
    overridden.selected.every((s) => s.override_source === "code"),
    "every selected chart carries override_source = 'code'",
  );
  assert(
    overridden.selected.every((s) => s.override_id === undefined),
    "code defaults carry no override_id",
  );
}

console.log("\n2. Category-scope edit rewrites the question template");
{
  const customQ = "CATEGORY OVERRIDE: when is {{ceName}} least crowded?";
  const deck = assembleDeck({
    ceName: "Test CE",
    signals: { ...ALL_SIGNALS },
    categoryOverrides: [
      {
        id: 42,
        action: "edit",
        bundleId: "timing",
        archetype: "hourly_heatmap",
        questionTemplate: customQ,
      },
    ],
  });
  const sel = deck.selected.find((s) => s.archetype === "hourly_heatmap");
  assert(
    sel?.question === customQ.replace("{{ceName}}", "Test CE"),
    "edited question template was substituted",
  );
  assert(sel?.override_source === "category", "override_source = 'category'");
  assert(sel?.override_id === 42, "override_id threaded to AssembledQuestion");
}

console.log("\n3. Category-scope add (when defaults muted) introduces a new candidate");
{
  const deck = assembleDeck({
    ceName: "Test CE",
    signals: { ...ALL_SIGNALS },
    categoryOverrides: [
      ...muteAllInTiming(),
      {
        id: 77,
        action: "add",
        bundleId: "timing",
        archetype: "month_calendar",
        questionTemplate: "CAT-ADDED: months for {{ceName}}",
        kind: "signature",
      },
    ],
  });
  const sel = deck.selected.find((s) => s.bundle_id === "timing");
  assert(
    sel?.archetype === "month_calendar",
    `category add was picked (got ${sel?.archetype ?? "none"})`,
  );
  assert(sel?.override_source === "category", "override_source = 'category'");
  assert(sel?.override_id === 77, "category add override_id threaded");
}

console.log("\n4. Category-scope mute suppresses a candidate");
{
  const deck = assembleDeck({
    ceName: "Test CE",
    signals: { ...ALL_SIGNALS },
    categoryOverrides: [
      { id: 9, action: "mute", bundleId: "timing", archetype: "hourly_heatmap" },
    ],
  });
  const sel = deck.selected.find((s) => s.bundle_id === "timing");
  assert(
    sel && sel.archetype !== "hourly_heatmap",
    `category mute suppressed hourly_heatmap (got ${sel?.archetype ?? "none"})`,
  );
}

console.log("\n5. CE-scope mute suppresses a candidate");
{
  const base = assembleDeck({ ceName: "Test CE", signals: { ...ALL_SIGNALS } });
  const baseTiming = base.selected.find((s) => s.bundle_id === "timing");
  assert(
    baseTiming?.archetype === "hourly_heatmap",
    `code default = hourly_heatmap (got ${baseTiming?.archetype})`,
  );
  const muted = assembleDeck({
    ceName: "Test CE",
    signals: { ...ALL_SIGNALS },
    ceOverrides: [
      { id: 1, action: "mute", bundleId: "timing", archetype: "hourly_heatmap" },
    ],
  });
  const mutedTiming = muted.selected.find((s) => s.bundle_id === "timing");
  assert(
    mutedTiming && mutedTiming.archetype !== "hourly_heatmap",
    `timing falls through (got ${mutedTiming?.archetype})`,
  );
}

console.log("\n6. CE-scope override beats category-scope edit on same archetype");
{
  const deck = assembleDeck({
    ceName: "Test CE",
    signals: { ...ALL_SIGNALS },
    categoryOverrides: [
      {
        id: 100,
        action: "edit",
        bundleId: "timing",
        archetype: "hourly_heatmap",
        questionTemplate: "CATEGORY: q for {{ceName}}",
      },
    ],
    ceOverrides: [
      {
        id: 200,
        action: "edit",
        bundleId: "timing",
        archetype: "hourly_heatmap",
        questionTemplate: "CE-LEVEL: q for {{ceName}}",
      },
    ],
  });
  const sel = deck.selected.find((s) => s.archetype === "hourly_heatmap");
  assert(
    sel?.question === "CE-LEVEL: q for Test CE",
    `CE override wins (got "${sel?.question}")`,
  );
  assert(sel?.override_source === "ce", "override_source = 'ce'");
  assert(sel?.override_id === 200, "CE override_id surfaces (not 100)");
}

console.log("\n7. CE-scope mute beats category-scope add on same archetype");
{
  const deck = assembleDeck({
    ceName: "Test CE",
    signals: { ...ALL_SIGNALS },
    categoryOverrides: [
      ...muteAllInTiming(),
      {
        id: 301,
        action: "add",
        bundleId: "timing",
        archetype: "month_calendar",
        questionTemplate: "CAT-ADD: months for {{ceName}}",
      },
    ],
    ceOverrides: [
      {
        id: 302,
        action: "mute",
        bundleId: "timing",
        archetype: "month_calendar",
      },
    ],
  });
  const sel = deck.selected.find((s) => s.bundle_id === "timing");
  assert(
    !sel || sel.archetype !== "month_calendar",
    `CE mute won — timing has no month_calendar (got ${sel?.archetype ?? "no chart"})`,
  );
}

console.log("\n8. CE-scope add introduces a new candidate (when defaults muted)");
{
  const deck = assembleDeck({
    ceName: "Test CE",
    signals: { ...ALL_SIGNALS },
    ceOverrides: [
      ...muteAllInTiming(),
      {
        id: 999,
        action: "add",
        bundleId: "timing",
        archetype: "month_calendar",
        questionTemplate: "CE-ADD: months for {{ceName}}",
        kind: "signature",
      },
    ],
  });
  const sel = deck.selected.find((s) => s.bundle_id === "timing");
  assert(
    sel?.archetype === "month_calendar",
    `added candidate was picked (got ${sel?.archetype})`,
  );
  assert(sel?.override_source === "ce", "added candidate carries override_source = 'ce'");
  assert(sel?.override_id === 999, "added candidate override_id threaded");
}

console.log("\n9. mergeBundleOverrides (direct unit) — annotated layering order");
{
  const merged = mergeBundleOverrides(
    QUESTION_BUNDLES.timing,
    [
      {
        id: 11,
        action: "edit",
        bundleId: "timing",
        archetype: "weekly_pattern",
        questionTemplate: "cat-edit",
      },
    ],
    [
      {
        id: 22,
        action: "mute",
        bundleId: "timing",
        archetype: "weekly_pattern",
      },
    ],
  );
  const weekly = merged.candidates.find((c) => c.archetype === "weekly_pattern") as
    | (typeof merged.candidates)[number] & {
        __muted?: boolean;
        __source?: string;
        __overrideId?: number;
      }
    | undefined;
  assert(weekly?.__muted === true, "CE mute wins over category edit");
  assert(weekly?.__source === "ce", "annotated source = 'ce'");
  assert(weekly?.__overrideId === 22, "annotated overrideId = CE mute id (22, not 11)");
}

console.log("\n10. Actions targeting a different bundle are ignored");
{
  const deck = assembleDeck({
    ceName: "Test CE",
    signals: { ...ALL_SIGNALS },
    ceOverrides: [
      {
        id: 1,
        action: "mute",
        bundleId: "prep",
        archetype: "hourly_heatmap",
      },
    ],
  });
  const timing = deck.selected.find((s) => s.bundle_id === "timing");
  assert(
    timing?.archetype === "hourly_heatmap",
    "mute on prep bundle did not affect timing bundle",
  );
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll override-merge assertions passed.");
