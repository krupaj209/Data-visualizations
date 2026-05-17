# Workspace

## Overview

Internal Headout tool ("Viz Studio") that generates AI-powered, brand-consistent data visualizations for any "CE" (Combined Entity = an attraction like Vatican Museums, Eiffel Tower). Each CE gets 4–7 tailored charts the CMS team can embed as iframes in listing pages.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Artifacts

- `artifacts/viz-studio` (web) — Main app: browse/create CEs, view chart library, copy iframe URLs. Embed view at `/studio/embed/:chartId` fills any iframe size (responsive, container-query–driven).
- `artifacts/api-server` (api) — Express API. Calls Gemini for chart generation, persists CEs + charts in Postgres, served via OpenAPI/Orval-generated hooks.
- `artifacts/mockup-sandbox` (design) — Vite preview server for component variants on the canvas.

## Stack

- pnpm workspaces, Node 24, TypeScript 5.9
- Express 5, PostgreSQL + Drizzle ORM (`ces`, `charts`, `drds` tables; chart spec stored as `jsonb`)
- Zod (`zod/v4`) + `drizzle-zod`
- Orval (from OpenAPI spec) → `@workspace/api-client-react` hooks
- `@google/genai` (Gemini 2.5 Pro) — direct dep of api-server (esbuild externalizes `@google/*`)
- React + Vite + Tailwind v4 + wouter + Recharts
- Brand: Headout — Purps `#8000FF`, Candy `#FF0076`, Manrope; tokens in `artifacts/viz-studio/src/lib/brand.ts`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/Zod from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Chart spec

`artifacts/api-server/src/lib/chart-spec.ts` defines a Zod discriminated union of chart types. Original 9: `weekly_pattern`, `hourly_heatmap`, `month_calendar`, `booking_window`, `stat_grid`, `compare_zones`, `donut_breakdown`, `seasonal_curve`, `ticket_ladder`. Florence-cluster additions: `tribune_density`, `daily_pattern`, `duration_profiles`, `entrance_lanes`, `co_bookings`. Task #36 v3 timeline & narrative family: `daily_programme` (open-to-close horizontal timeline with pinned events + popularity ring), `time_split` (single stacked bar; segment minutes must sum within 5% of `total_min`), `slot_compare` (compare 2–3 time slots across 3–5 dimensions; per-dimension `scores` length must equal slots length; ≤1 slot may be `recommended`). `slot_compare` renders as **grouped horizontal bars** rather than a radar — radars become illegible at 320×320 embeds, while grouped bars stay readable down to ~280px.

Generation: `artifacts/api-server/src/lib/generate-ce.ts` builds a strict prompt with per-type schemas, calls Gemini, validates against Zod, and retries once with the validation error fed back. Strict array lengths enforce data completeness (`.length(12)` months, `.length(7)` weekday rows, `.length(24)` hours). Topic-to-chart routing recognises history/origin/restoration prompts and routes them to `history_timeline`; unmatched topics fail fast.

Renderers: `artifacts/viz-studio/src/components/charts/` — one file per type. All wrapped in `ChartCard` (header with ESTIMATED pill + title/subtitle, content area, footer insight). Charts use container queries + percentage-based geometry to fill any size cleanly.

**Canonical timeline pattern.** `history_timeline` is the standard for any historical/narrative timeline (founding → spectacle → decline → reuse → restoration → modern). It is an at-a-glance **infographic**, not an interactive explorer: every event renders simultaneously with date, era chip, title, and (where useful) a metric chip; `highlight_event` decorates the most pivotal entry with a "★ Pivotal" pill. Era color tokens follow the brand palette (purps construction, candy spectacle, hola decline, slate reuse, mint restoration, indigo modern).

The renderer is **layout-responsive** based on container width (measured via `ResizeObserver`):

- **Horizontal layered layout** (≥560px wide, non-compact): four stacked rows — era pill rail, date pills, horizontal spine with per-event nodes (pivotal node enlarged with `purps` ring), titles + metric chips. Callout sits as a centered footer band. Tuned for inline article-body embeds at ~720–1024 wide × ~280–400 tall — must fit at-a-glance. Titles **must be ≤30 chars**; descriptions intentionally omitted.
- **Vertical layout** (<560px wide, or compact mode): one row per event — date pill on the left; era chip + title + description + metric chip on the right; vertical era spine. Supports a `dense` mode that drops descriptions + callout but keeps every row.

Compact mode (sub-340px embeds, set by global Embed wrapper) tightens padding and forces vertical layout regardless of width. Reference: the `colosseum` curated CE in `lib/curated-seeds/src/data/colosseum.ts` — reuse `history_timeline` rather than introducing a parallel chart type, and respect the ≤30 char title budget.

## Embed contract

Embeds live at `${origin}/studio/embed/:chartId` and render the single chart fluidly into whatever size the host iframe provides (no fixed aspect ratio, **no height floor**). The CMS just pastes the URL — no width/height attrs needed. Charts use container-query-based clamps and adapt from ~200×200 up to 1280×500+.

Chrome density auto-adjusts based on rendered viewport height (`window.innerHeight`):

- **Tall iframes (≥ 340px)**: full chrome — ESTIMATED pill + context subtitle + per-chart secondary strip (insight paragraph, calendar chips, legend, scale ticks, headlines, axis labels).
- **Short iframes (< 340px)**: auto-flip to **compact** which drops the ChartCard header AND every per-chart secondary strip, tightens padding, and lets the visualization fill nearly the entire box. 340px is the empirical break-even where default chrome stops fitting.

URL overrides:

- `?compact=1` / `compact=true` — force compact at any size.
- `?compact=0` / `compact=false` — force default chrome at any size.
- No flag — auto-detect by iframe height (recommended for CMS).

**Task #151 — presentation overrides.** Charts also accept render-time
presentation params that re-skin or re-frame the visual without re-calling
Gemini. They merge over any saved `charts.presentation` jsonb (URL wins):

- `?palette=` — `brand` (default) / `traffic` / `mono` / `cool` / `warm` / `high_contrast`.
- `?direction=` — `low_good` / `low_bad`. Flips the quantitative ramp for charts that encode a single axis (currently `weekly_pattern`, `hourly_heatmap`, `seasonal_curve`).
- `?view=` — chart-type-specific alternate form (e.g. `hourly_heatmap` supports `grid` / `strip`).
- `?density=` — `comfortable` / `compact`. Overrides the iframe-height auto-detect; `?compact=` still works as a legacy alias.
- `?emphasis=` — chart-specific target id (e.g. `mon` on `weekly_pattern`, hour-of-day `14` on `hourly_heatmap`, `slot-0` on `slot_compare`). Decorates the matching element with a brand-colored ring.

The chart types in scope and their option matrix live in
`artifacts/viz-studio/src/lib/presentation.ts` (`PRESENTATION_REGISTRY`).
Legacy types (`compare_zones`, `ticket_ladder`, `stat_grid`, `month_calendar`,
`donut_breakdown`) are intentionally excluded — they predate the curated
cluster and are not part of the CMS embed contract.

Writers edit these on the CE Detail page via a per-chart "Presentation"
disclosure card (palette / view / direction / density / emphasis selects +
"Copy preview URL"). Saves go through `PATCH /api/charts/:id` with only the
`presentation` field set; the api-server detects presentation-only updates
(`isPresentationOnlyUpdate` in `routes/charts.ts`) and **allows them on locked
CEs** since presentation never mutates the chart spec.

Compact is honored by all 8 chart types used by the curated Florence cluster (the only CEs the CMS embeds — see `LOCKED_CE_SLUGS`). `ChartCard` strips its header and tightens padding for every chart. Per-component chrome gating: `SeasonalCurve` hides metric_insights/calendar_notes/fallback legend; `BookingWindow` hides "Sweet spot" pill + sold_out_risk footer; `DurationProfiles` hides headline/scale-ticks/tip footer; `TribuneDensity` hides y_label/context_pills/arrow_callout helper, samples ~5 vs ~12 x-axis labels; `CoBookings` hides headline + per-row badge, tightens spacing; `WeeklyPattern` hides level legend + day_notes; `DailyPattern` hides opening-hours caption, samples ~5 vs ~9 x-axis labels; `EntranceLanes` hides venue title strip; `DailyProgramme` hides ChartCard header + per-event sub-labels + highlight callout; `TimeSplit` hides total/runtime row + bottom callout, tightens legend; `SlotCompare` hides slot legend, "{slot} leads" labels, and bottom insight, shrinks bars to 14px. `HourlyHeatmap` accepts `compact` and renders visualization-only (grid + Quiet→Crowded legend + best-window pill).

The `HourlyHeatmapSpec.highlight_cards` field (`{kind, headline, detail}` × ≤6, kinds: `quietest_hours`, `best_photography`, `best_weather`, `fastest_entry`, `best_evening`, `best_off_season`) is **never rendered inside the chart** — it surfaces only on the studio CE detail page as a "Suggested content" panel (`SuggestedContentPanel` in `pages/CeDetail.tsx`) with a Copy-as-HTML button. This keeps embeds purely visual while preserving supplementary text as ready-to-ship CMS copy. Reference: Colosseum `hourly-crowd-pattern` chart in `lib/curated-seeds/src/data/colosseum.ts`.

Legacy chart types (`compare_zones`, `ticket_ladder`, `stat_grid`) and currently-unused types (`month_calendar`, `donut_breakdown`) **do not** accept `compact`. They predate the curated Florence cluster and are not part of the CMS embed contract. If a future curated CE adopts one, add the `compact?: boolean` prop and gate its chrome before forwarding from `ChartRenderer`.

CMS embed snippet:

```html
<iframe src="https://<host>/studio/embed/<chartId>" frameborder="0"></iframe>
```

Curated Florence cluster CEs are listed in `LOCKED_CE_SLUGS` (`artifacts/api-server/src/routes/ces.ts`) which blocks delete/regenerate so curated chart specs stay canonical.

## Source-tailored CE Intelligence adapters

`artifacts/api-server/src/lib/ce-intelligence.ts` adapters are **specialty-driven** rather than generic:

- **Per-source `SOURCE_CONFIGS`** — each of `official_site`, `tripadvisor`, `getyourguide`, `viator`, `reddit` declares 2-4 targeted **sub-queries**, a `validEvidenceTypes` whitelist, and an `extractionBrief` so each source stays in its lane (official = ground truth, TripAdvisor = visitor tips/sentiment/wait anecdotes, Reddit = trip reports + operational changes, GYG/Viator = product offerings/price points/bundle patterns). `headout` is a stub.
- **Parallel sub-queries with isolation** — `runSourceAdapter` runs sub-queries via `Promise.allSettled`. Per-sub-query failures are logged and ignored; only when **every** sub-query fails does the adapter throw. Merged facts are deduped on a normalized key (lowercase / strip non-alphanumerics / first 80 chars), keeping the highest-confidence variant.
- **`evidence_type` field** — optional enum on `IntelFact` (`authoritative_fact`, `visitor_tip`, `wait_anecdote`, `sentiment_theme`, `trip_report`, `product_offering`, `price_point`, `bundle_pattern`, `operational_change`, `other`). Validated against the source's whitelist; mismatches are dropped. Optional in the OpenAPI spec for backward compat.
- **`sliceIntelForArchetype` evidence-type bias** — `ARCHETYPE_EVIDENCE_AFFINITY` maps each chart archetype to preferred evidence types. Within bucket-matched facts, an evidence-type match adds a +200 boost over confidence. Untagged legacy facts fall back to confidence-only sort.
- **UI surfacing** (`IntelPanel.tsx`) — each fact row shows a mint **evidence-type chip**; each source row shows a per-source **summary line** (`"Visitor tip · 4 • Wait anecdote · 2"`). `EVIDENCE_TYPE_LABELS` is mirrored client-side; keep both sides in sync if extending the enum.

## Research-grounded chart pipeline (Task #99 — intent-driven assembly)

Backend pipeline that **deterministically assembles** a draft chart deck for a specific CE + listing-page template, using its Deep Research Doc (DRD) as the sole source of context. The previous flat per-subcategory question bank + LLM question-picker was replaced with a 4-layer registry.

- **`lib/question-bank`** workspace lib (all pure data + pure functions, no LLM):
  - `intents.ts` — 7 `VISITOR_INTENTS` (`decide_when_to_visit`, `plan_visit_duration`, `choose_right_ticket`, `assess_risk_and_value`, `navigate_logistics`, `compare_value`, `prepare_for_visit`). Each carries a `visitor_state` description.
  - `signals.ts` — `extractSignals(drdMarkdown)` returns a `ContextSignals` record (boolean flags like `has_seasonal_variation`, `has_skip_the_line`, `has_long_queues`, `has_historical_significance` + `sub_products[]` + `typical_visit_minutes` + `drd_has_low_confidence_sections`). Regex/keyword heuristics — stable across re-runs, no LLM, no clock.
  - `bundles.ts` — 7 `QUESTION_BUNDLES` (`timing`, `duration`, `choice`, `risk`, `logistics`, `value`, `prep`). Each bundle declares `required_signals` (ALL must be present to fire), `preferred_signals` (each +1 to score), and an ordered `candidates[]` list of `{archetype, question_template, requires?, prefers?, kind}`.
  - `page-templates.ts` — 8 `PAGE_TEMPLATES` (`plan-your-visit`, `skip-the-line`, `entrances`, `history`, `map-floor-plan`, `tickets-pricing`, `reviews-experiences`, `combo-deals`). Each template is an ordered list of slots, each slot is either a `bundleId` reference OR a `forcedArchetype` (used by `history` to always emit `history_timeline` as the canonical narrative). Templates carry `minCharts` / `maxCharts` bounds.
  - `assembler.ts` — `assembleDeck({ceName, signals, pageType, retireArchetypes?, existingArchetypes?})` walks the template slots deterministically: scores each bundle against signals, picks the first viable candidate (respecting `requires` / `retireArchetypes` / dedupe against `existingArchetypes`), substitutes `{{ceName}}`, and returns `{pageType, selected[], dropped[], bundle_audit[]}`. Every selected chart carries `bundle_id`, `intent_id`, `bundle_score`, and `triggering_signals[]`.
  - `bank.ts` — slimmed to a `SUBCATEGORIES` registry + `listSubcategories` / `isKnownSubcategory` helpers (legacy `RAW_BANK` / `STANDARD_QUESTIONS` / `BankQuestion[]` removed; subcategories now exist only for admin UI grouping).
  - `archetypes.ts` — unchanged (`CHART_ARCHETYPES` registry + `isImplementedArchetype`).

- **DRD storage** — `drds` table keyed on `ceSlug` (one canonical latest DRD per CE). Accepts markdown JSON or PDF upload (multer + `unpdf`). The multipart endpoint exists at runtime but is intentionally omitted from the OpenAPI spec because Orval's Zod generator can't model `Blob` bodies — use `fetch` + `FormData` for PDF uploads.

- **Pipeline** (`artifacts/api-server/src/lib/research-pipeline.ts`):
  1. **Assemble deck** — `extractSignals(drd)` → `assembleDeck({ceName, signals, pageType, retireArchetypes, existingArchetypes})`. **No LLM call for question picking.** `pageType` is forwarded from the request (defaults to `plan-your-visit`).
  2. **Tiny summarize call** — one small Gemini call returns only `{ ce_summary, emoji, proposed_hero }` (it never picks questions, never edits the deck).
  3. **Generate one chart per question** — Gemini call per chart with the per-archetype JSON snippet (`chart-archetype-prompts.ts`) and `googleSearch` tool enabled. Grounding sources auto-merged into provenance. Per-archetype `SOURCING:` notes on `booking_window`, `seasonal_curve`, `hourly_heatmap` mirror the `sighting_probability` pattern: drop the chart when grounding is thin, otherwise round to coarse buckets, omit fabricated sub-metrics, tag every numeric field in `provenance.estimates`.
  4. **Verify** — OpenAI (`gpt-5.4`) re-reads DRD and challenges each spec; verifier_notes stored per chart. Soft-fails if `AI_INTEGRATIONS_OPENAI_*` env vars are missing.

  All Task #80 category-CE-specific machinery (`pickCategoryCeTimingFloor`, `CATEGORY_CE_PREFERRED_ARCHETYPES`, `categoryCeSelectionPriority`, `isCategoryLikeSubcategory`) was deleted — page templates now own the "what charts belong on this page" decision deterministically, so the category-CE workaround is no longer needed. `scripts/src/test-cruise-timing-floor.mts` was removed alongside.

- **Persistence** — `charts` table has `status` ("draft"|"published", default "published") and `provenance` jsonb. Provenance now includes `bundle_id`, `intent_id`, `bundle_score`, `triggering_signals[]`, and `page_type` alongside the existing `{status, drd_snippets, web_sources, estimates, verifier_notes, source_question, recommended_archetype}`. Each pipeline run **only deletes prior `status='draft'` rows for the CE** — published rows survive. New drafts inserted at `sortOrder >= 1000`. CE `status` is only flipped to `"draft"` when no published charts exist; otherwise existing CE status is preserved.

- **Endpoints** — `GET/POST/DELETE /api/drds[/:ceSlug]`, `GET /api/research/subcategories`, `POST /api/research/generate`, `POST /api/ces/:slug/regenerate`. Both `/research/generate` and `/ces/:slug/regenerate` accept an optional `pageType` (enum of the 8 page templates above; defaults to `plan-your-visit`). Florence cluster CEs are guarded by `lib/locked-ces.ts` — pipeline returns 409 for them.

- **UI surfacing** — `pages/QuestionBank.tsx` is now a bundle / page-template browser. `pages/CeDetail.tsx` exposes a page-type `<select>` next to the Regenerate button so writers can re-assemble for a different listing page. The chart-card "Evidence & estimates" disclosure renders a purple `bundle_id` chip (hover for intent + page).

- **Web search at runtime** — Gemini's built-in `googleSearch` tool (the workspace `web-search` skill is agent-only).

- **Unit coverage** — `scripts/src/test-intent-engine.mts` (run via `pnpm --filter @workspace/scripts run test-intent-engine`). Covers registry integrity, signal extraction across rich/sparse DRDs, page-template chart bounds, the forced `history_timeline` slot, `retireArchetypes` enforcement, and bundle_audit shape.

## Editorial verdict + targeted recheck

Each planner idea (recommended *and* rejected) carries a five-judgement editorial block (`useful`, `ce_specific`, `better_than_existing`, `conversion_driven`, `visually_strong`, each `{verdict: yes|weak|no, rationale}`). The deterministic ship/hold/cut rule lives in `artifacts/api-server/src/lib/editorial-verdict.ts`:

- `cut` if `useful` or `ce_specific` is `no`
- `ship` if ≥4 `yes` AND zero `no`
- `hold` otherwise

The verdict is **always computed server-side** — the model never picks ship/hold/cut directly.

`POST /api/ce-intelligence/:slug/recheck-gap` is a multi-query pipeline:
1. Derive 1–3 missing-evidence buckets deterministically from the rejection reason + the archetype's `data_shape` (regex patterns in `editorial-verdict.ts`).
2. Fan out one Gemini-with-`googleSearch` call per bucket; failures isolated.
3. Merge findings + source_refs (deduped) and aggregate the per-bucket `found / partial / not_found` statuses.
4. Re-score the idea editorially (`scoreEditorialForIdea`).

Response shape extends the legacy contract with `editorial`, `editorial_verdict`, and `buckets[]`. The IntelPanel UI promotes recheck-promoted rejected cards (verdict `ship`/`hold`) into the Recommended list with a "Found by recheck" badge; `cut` keeps them rejected. The 7 numeric quality axes hide behind a "Why this score" disclosure.

Unit coverage: `scripts/src/test-editorial-verdict.mjs` (run via `pnpm --filter @workspace/scripts run test-editorial-verdict`). The script re-implements both helpers in plain JS — keep the mirror in sync with the TS source.

## Curated / locked CEs

`lib/curated-seeds` is a workspace lib that owns the hand-curated chart decks for the locked Florence cluster (`galleria-dellaccademia`, `galleria-degli-uffizi`, `duomo-di-firenze`) plus the `colosseum` history-timeline reference deck. The api-server calls `seedCuratedCesIdempotent()` on startup (`artifacts/api-server/src/index.ts`) — missing slugs are inserted with all charts in one transaction; existing CEs are skipped so chart IDs (referenced by external embed URLs) stay stable. CE insert uses `ON CONFLICT (slug) DO NOTHING`. Per-CE failures isolated; never block startup.

The same data is also in `scripts/src/data/{accademia,uffizi,duomo}.mjs` because the dev `seed-*.mjs` scripts (raw `pg.Client`, run via `node`) need it. Long-term, those scripts should switch to importing from the lib via `tsx`.
