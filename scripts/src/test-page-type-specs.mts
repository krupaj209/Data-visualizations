// Sanity tests for the Task #92 page-type chart specs.
// Validates the cross-field superRefine rules on entrance_map,
// floor_plan_flow, rules_checklist, transit_options, time_value_matrix,
// and accessibility_guide.
//
//   pnpm --filter @workspace/scripts run test-page-type-specs

import test from "node:test";
import assert from "node:assert/strict";

import { chartSpecSchema } from "../../artifacts/api-server/src/lib/chart-spec.ts";

function parse(spec: unknown) {
  return chartSpecSchema.safeParse(spec);
}

/* ---------------- entrance_map ---------------- */

test("entrance_map accepts a minimal valid spec", () => {
  const res = parse({
    type: "entrance_map",
    entrances: [
      { name: "Sperone Valadier", status: "recommended" },
      { name: "Stern", status: "groups" },
    ],
  });
  assert.equal(res.success, true, JSON.stringify(res));
});

test("entrance_map rejects an empty entrances array", () => {
  const res = parse({ type: "entrance_map", entrances: [] });
  assert.equal(res.success, false);
});

/* ---------------- floor_plan_flow ---------------- */

test("floor_plan_flow accepts a start..end ordered spec", () => {
  const res = parse({
    type: "floor_plan_flow",
    stops: [
      { name: "Entrance", kind: "start" },
      { name: "David Hall", kind: "highlight" },
      { name: "Exit", kind: "end" },
    ],
  });
  assert.equal(res.success, true, JSON.stringify(res));
});

test("floor_plan_flow rejects when first stop is not 'start'", () => {
  const res = parse({
    type: "floor_plan_flow",
    stops: [
      { name: "David Hall", kind: "highlight" },
      { name: "Exit", kind: "end" },
    ],
  });
  assert.equal(res.success, false);
});

test("floor_plan_flow rejects when last stop is not 'end'", () => {
  const res = parse({
    type: "floor_plan_flow",
    stops: [
      { name: "Entrance", kind: "start" },
      { name: "David Hall", kind: "highlight" },
    ],
  });
  assert.equal(res.success, false);
});

/* ---------------- rules_checklist ---------------- */

test("rules_checklist accepts a typical religious-site spec", () => {
  const res = parse({
    type: "rules_checklist",
    items: [
      { label: "Shoulders covered", severity: "required", category: "dress" },
      { label: "No large bags", severity: "prohibited", category: "items" },
      { label: "Flash photography off", severity: "restricted", category: "photography" },
      { label: "Silence inside", severity: "required", category: "behavior" },
    ],
  });
  assert.equal(res.success, true, JSON.stringify(res));
});

test("rules_checklist rejects an unknown severity", () => {
  const res = parse({
    type: "rules_checklist",
    items: [
      { label: "Hats off", severity: "maybe", category: "dress" },
    ],
  });
  assert.equal(res.success, false);
});

/* ---------------- transit_options ---------------- */

test("transit_options accepts a valid multi-mode spec", () => {
  const res = parse({
    type: "transit_options",
    options: [
      {
        mode: "metro",
        label: "Line B from Termini",
        minutes_min: 12,
        minutes_max: 18,
        recommended: true,
      },
      { mode: "walk", label: "From Roma Termini", minutes_min: 22, minutes_max: 28 },
    ],
  });
  assert.equal(res.success, true, JSON.stringify(res));
});

test("transit_options rejects minutes_min > minutes_max", () => {
  const res = parse({
    type: "transit_options",
    options: [
      { mode: "bus", label: "85 bus", minutes_min: 30, minutes_max: 20 },
      { mode: "walk", label: "Walk", minutes_min: 22, minutes_max: 28 },
    ],
  });
  assert.equal(res.success, false);
});

test("transit_options rejects more than one recommended option", () => {
  const res = parse({
    type: "transit_options",
    options: [
      { mode: "metro", label: "M", minutes_min: 10, minutes_max: 15, recommended: true },
      { mode: "bus", label: "B", minutes_min: 18, minutes_max: 25, recommended: true },
    ],
  });
  assert.equal(res.success, false);
});

/* ---------------- time_value_matrix ---------------- */

function tvm(overrides: Record<string, unknown> = {}) {
  return {
    type: "time_value_matrix",
    scenarios: [
      { id: "half_day", label: "Half-day basic", accent: "purps" },
      { id: "full_day", label: "Full-day skip-the-line", accent: "candy" },
      { id: "two_day", label: "Two-day pass", accent: "hola" },
    ],
    dimensions: [
      { label: "Headline coverage", scores: [50, 80, 95] },
      { label: "Crowd avoidance", scores: [40, 75, 70] },
      { label: "Value per hour", scores: [85, 70, 50] },
    ],
    summary: { best_value_scenario: "full_day" },
    ...overrides,
  };
}

test("time_value_matrix accepts a valid 3-scenario spec", () => {
  const res = parse(tvm());
  assert.equal(res.success, true, JSON.stringify(res));
});

test("time_value_matrix rejects when best_value_scenario does not match a scenario id", () => {
  const res = parse(tvm({ summary: { best_value_scenario: "nonexistent" } }));
  assert.equal(res.success, false);
});

test("time_value_matrix rejects when a dimension has the wrong number of scores", () => {
  const res = parse(
    tvm({
      dimensions: [
        { label: "Headline coverage", scores: [50, 80] }, // only 2, need 3
        { label: "Crowd avoidance", scores: [40, 75, 70] },
        { label: "Value per hour", scores: [85, 70, 50] },
      ],
    }),
  );
  assert.equal(res.success, false);
});

test("time_value_matrix rejects duplicate scenario ids", () => {
  const res = parse(
    tvm({
      scenarios: [
        { id: "half_day", label: "Half-day basic", accent: "purps" },
        { id: "half_day", label: "Half-day premium", accent: "candy" },
        { id: "two_day", label: "Two-day pass", accent: "hola" },
      ],
    }),
  );
  assert.equal(res.success, false);
});

/* ---------------- accessibility_guide ---------------- */

test("accessibility_guide accepts a typical mixed-availability spec", () => {
  const res = parse({
    type: "accessibility_guide",
    features: [
      { label: "Step-free entrance", category: "mobility", availability: "full" },
      { label: "Lift to floor 2 only", category: "mobility", availability: "partial" },
      { label: "Audio guide", category: "sensory", availability: "full" },
      { label: "Sensory bag loan", category: "sensory", availability: "on_request" },
    ],
  });
  assert.equal(res.success, true, JSON.stringify(res));
});

test("accessibility_guide rejects an empty features array", () => {
  const res = parse({ type: "accessibility_guide", features: [] });
  assert.equal(res.success, false);
});
