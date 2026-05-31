---
name: Signal extraction + assembler improvements
description: Lessons from fixing 4 blind spots in the plan-assembly pipeline — bundle ordering, subcategory defaults, DRD section parsing, honest-gaps propagation.
---

## Bundle candidate ordering matters
`entrance_lanes` must be BEFORE `highlight_rank` in the logistics bundle. When `has_skip_the_line` and `has_famous_highlights` both fire (which they do for every commercial landmark after the subcategory bootstrap), whichever candidate is listed first wins the single logistics slot. "Which queue do I join?" beats "which highlights to see?" for the logistics intent.

**Why:** landmark bootstrap fires both signals by default. Order = priority.
**How to apply:** When adding a new logistics candidate, ask: is there a more specific logistical question that should win first?

## Subcategory bootstrap defaults
`landmarks` and `observation_decks` should default `has_multiple_sub_products = true` in `bootstrapSignalsFromSubcategory`. Every commercial landmark sells multiple ticket tiers by definition; the choice bundle should fire without requiring DRD bullet formatting.

**Why:** Many DRDs describe products in prose, not bullets. The regex misses these.

## LLM signal pre-pass pattern
- New file: `artifacts/api-server/src/lib/llm-signal-prepass.ts`
- Gated by `ENABLE_LLM_SIGNAL_PREPASS=true` env var (default off for safety)
- Returns `Partial<ContextSignals>` with only boolean fields
- OR-merged with regex extraction in `selectQuestions` in research-pipeline.ts — LLM only adds, never removes
- In-memory content-hash cache; DB caching deferred (see task #223)
- `BooleanSignalKey` type narrows which signals are safe to set as boolean

## DRD section parsing (viz-briefs + honest-gaps)
- `lib/question-bank/src/viz-briefs.ts`: `extractVizBriefs()` — looks for Part 1H / "Visualization Intelligence" / "Chart type:" patterns
- `lib/question-bank/src/honest-gaps.ts`: `extractHonestGaps()` + `scoreGapArchetypeMatch()` — looks for Part 1J / "Honest Gaps" section headers and inline "no reliable data" sentences
- `assembler.ts` `vizBriefArchetypes` param adds a priority pass BEFORE normal candidate ordering — all other gates (retired, unimplemented, signal) still apply
- `drd_declared_gaps: string[]` on `ChartProvenance` and `ChartProvenanceLite`; rendered as amber "Gap" pills in Evidence & Sources on CeDetail

## Type safety note for ContextSignals
`ContextSignals` has non-boolean fields (`sub_products: string[]`, `typical_visit_minutes: {min,max}|null`). When writing by key dynamically, use double-cast: `(obj as unknown as Record<string, boolean>)[key] = true`. `CHART_ARCHETYPES` is a `Record<ChartArchetypeId, ChartArchetype>` (not array) — use `Object.keys()` to iterate ids.
