---
name: Intel-first CE creation flow
description: Decisions behind routing new-CE creation through a plan-review step and how mandatory vs optional charts are decided.
---

# Intel-first CE creation

**Every new CE goes through a CE Intel review step first; creation never
auto-generates charts.** Create persists the CE only (skip chart generation),
then the writer reviews the planned deck and explicitly generates. Opening an
*existing* CE still goes straight to its visualizations.

**Why:** A DRD is optional at creation time. Auto-generating a deck before the
writer has reviewed/grounded it produced low-quality charts; the review step is
the gate. (An earlier revision DRD-gated this — only intel-first when a DRD was
attached — but the requirement is intel-first for all new CEs.)

**How to apply:** A new CE with no DRD/intel must still produce a reviewable
deck. The plan endpoint returns 412 when there's no DRD and no intel facts;
callers that need a guaranteed deck pass an opt-in flag to get a **deterministic
page-template deck** instead (no LLM, neutral/empty evidence). Keep the 412
default so other consumers (the existing IntelPanel) are unaffected.

## Mandatory vs optional (dynamic) charts

`mandatory` originates deterministically in the deck assembler (forced-archetype
slots and `required` bundle slots). The LLM planner re-derives `mandatory` per
recommended idea by matching the idea's archetype to **bundle membership**, not
exact archetype equality, using a fresh deterministic deck build.

**Why:** The planner's chosen archetype can differ from the assembler's first
candidate *within the same bundle*; matching on bundle membership keeps "this
slot is required" stable when the specific archetype shifts. If the deck build
throws, fall back to all-dynamic (nothing locked) so creation never hard-fails.

**How to apply:** `mandatory` rides on the plan response as plain jsonb and is
intentionally **not** in the OpenAPI spec — plan/review UIs read it via loose
local types. The review UI locks mandatory charts ON and defaults optional ones
ON; generation uses the existing per-chart create path (small concurrency +
best-effort verify) then routes to the CE detail page.
