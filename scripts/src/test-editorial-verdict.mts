// Unit tests for the deterministic editorial verdict rule and the
// missing-evidence query derivation used by the planner + recheck
// pipeline (Task #66).
//
// Imports the *real* helpers from the api-server source so a regression
// in `editorial-verdict.ts` will fail this suite. Run with tsx:
//
//   pnpm --filter @workspace/scripts run test-editorial-verdict

import test from "node:test";
import assert from "node:assert/strict";

import {
  EDITORIAL_JUDGEMENT_KEYS,
  deriveEditorialVerdict,
  deriveMissingEvidenceQueries,
  emptyJudgements,
  type EditorialJudgements,
  type EditorialVerdictValue,
} from "../../artifacts/api-server/src/lib/editorial-verdict.ts";

function fullJudgements(
  overrides: Partial<Record<keyof EditorialJudgements, EditorialVerdictValue>>,
): EditorialJudgements {
  const base = emptyJudgements();
  for (const k of EDITORIAL_JUDGEMENT_KEYS) {
    const override = overrides[k];
    if (override) base[k] = { verdict: override, rationale: "" };
  }
  return base;
}

/* ---------------- Editorial verdict tests ---------------- */

test("ship when all five judgements are yes", () => {
  assert.equal(
    deriveEditorialVerdict(
      fullJudgements({
        useful: "yes",
        ce_specific: "yes",
        better_than_existing: "yes",
        conversion_driven: "yes",
        visually_strong: "yes",
      }),
    ),
    "ship",
  );
});

test("ship when exactly four yes and one weak", () => {
  assert.equal(
    deriveEditorialVerdict(
      fullJudgements({
        useful: "yes",
        ce_specific: "yes",
        better_than_existing: "yes",
        conversion_driven: "yes",
      }),
    ),
    "ship",
  );
});

test("hold when only three yes", () => {
  assert.equal(
    deriveEditorialVerdict(
      fullJudgements({
        useful: "yes",
        ce_specific: "yes",
        better_than_existing: "yes",
      }),
    ),
    "hold",
  );
});

test("hold downgrades a four-yes when any other is no", () => {
  // Not cut because useful & ce_specific are yes; but a "no" anywhere
  // disqualifies ship → hold.
  assert.equal(
    deriveEditorialVerdict(
      fullJudgements({
        useful: "yes",
        ce_specific: "yes",
        better_than_existing: "yes",
        conversion_driven: "yes",
        visually_strong: "no",
      }),
    ),
    "hold",
  );
});

test("cut when useful is no, regardless of other yes votes", () => {
  assert.equal(
    deriveEditorialVerdict(
      fullJudgements({
        useful: "no",
        ce_specific: "yes",
        better_than_existing: "yes",
        conversion_driven: "yes",
        visually_strong: "yes",
      }),
    ),
    "cut",
  );
});

test("cut when ce_specific is no, regardless of other yes votes", () => {
  assert.equal(
    deriveEditorialVerdict(
      fullJudgements({
        useful: "yes",
        ce_specific: "no",
        better_than_existing: "yes",
        conversion_driven: "yes",
        visually_strong: "yes",
      }),
    ),
    "cut",
  );
});

test("hold for the all-weak default (no signal either way)", () => {
  assert.equal(deriveEditorialVerdict(emptyJudgements()), "hold");
});

/* ---------------- Missing-evidence query tests ---------------- */

test("rejection mentioning queue lengths derives wait_times bucket", () => {
  const out = deriveMissingEvidenceQueries({
    ceName: "Vatican Museums",
    rejectionReason: "No queue or wait-time data found in DRD",
    question: "How long is the wait?",
  });
  assert.ok(
    out.some((b) => b.bucket === "wait_times"),
    "expected wait_times bucket",
  );
  assert.ok(
    out[0]!.query.toLowerCase().includes("vatican"),
    "ce name in query",
  );
});

test("rejection mentioning tickets derives prices_tickets bucket", () => {
  const out = deriveMissingEvidenceQueries({
    ceName: "Eiffel Tower",
    rejectionReason: "No ticket tier comparison available",
    question: "Which ticket should I buy?",
  });
  assert.ok(out.some((b) => b.bucket === "prices_tickets"));
});

test("vague rejection falls back to data_shape hints", () => {
  const out = deriveMissingEvidenceQueries({
    ceName: "Galleria Borghese",
    rejectionReason: "Insufficient evidence",
    question: "What's the monthly pattern?",
    dataShape: ["12 months jan..dec with crowd score"],
  });
  assert.ok(out.some((b) => b.bucket === "monthly_pattern"));
});

test("when no patterns match, falls back to general bucket with question", () => {
  const out = deriveMissingEvidenceQueries({
    ceName: "Some Place",
    rejectionReason: "blegh",
    question: "What is the philosophy here?",
  });
  assert.equal(out.length, 1);
  assert.equal(out[0]!.bucket, "general");
  assert.ok(out[0]!.query.includes("Some Place"));
});

test("never returns more than the cap (default 3)", () => {
  const out = deriveMissingEvidenceQueries({
    ceName: "X",
    rejectionReason:
      "no wait, no queue, no crowd, no peak hour, no price, no ticket, no opening hour, no duration, no history, no route, no season, no review, no booking",
    question: "everything",
  });
  assert.ok(out.length <= 3, `got ${out.length}`);
});

test("dedupes buckets between reason and data_shape", () => {
  const out = deriveMissingEvidenceQueries({
    ceName: "X",
    rejectionReason: "wait time data",
    question: "?",
    dataShape: ["hourly wait_time"],
  });
  const buckets = out.map((b) => b.bucket);
  assert.equal(new Set(buckets).size, buckets.length, "no dupes");
});

test("rejection mentioning dress code derives rules_items bucket", () => {
  const out = deriveMissingEvidenceQueries({
    ceName: "St Peter's Basilica",
    rejectionReason: "No official dress code or prohibited-items policy in DRD",
    question: "What's allowed inside?",
  });
  assert.ok(
    out.some((b) => b.bucket === "rules_items"),
    "expected rules_items bucket",
  );
});

test("rejection mentioning wheelchair derives accessibility bucket", () => {
  const out = deriveMissingEvidenceQueries({
    ceName: "Louvre",
    rejectionReason: "No wheelchair or step-free access information found",
    question: "Is it accessible?",
  });
  assert.ok(
    out.some((b) => b.bucket === "accessibility"),
    "expected accessibility bucket",
  );
});

test("rejection mentioning metro derives transit_access bucket", () => {
  const out = deriveMissingEvidenceQueries({
    ceName: "Colosseum",
    rejectionReason: "No metro line or nearest stop directions in DRD",
    question: "How do I get there?",
  });
  assert.ok(
    out.some((b) => b.bucket === "transit_access"),
    "expected transit_access bucket",
  );
});

test("respects an explicit cap=1", () => {
  const out = deriveMissingEvidenceQueries({
    ceName: "X",
    rejectionReason: "wait, crowd, price",
    question: "?",
    cap: 1,
  });
  assert.equal(out.length, 1);
});
