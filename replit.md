# Workspace

## Overview

Internal Headout tool ("Viz Studio") that generates AI-powered, brand-consistent data visualizations for any "CE" (Combined Entity = an attraction like Vatican Museums, Eiffel Tower). Each CE gets 4–7 tailored charts (heatmaps, ticket comparisons, booking-window curves, seasonal curves, etc.) that the CMS team can embed as iframes in listing pages.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Artifacts

- `artifacts/viz-studio` (web) — Main app: browse/create CEs, view chart library, copy iframe URLs. Embed view at `/studio/embed/:chartId` fills any iframe size (responsive, container-query–driven) with a 400px height floor.
- `artifacts/api-server` (api) — Express API. POSTs to Gemini for chart generation, persists CEs + charts in Postgres, serves via OpenAPI/Orval-generated hooks.
- `artifacts/mockup-sandbox` (design) — Vite preview server for component variants on the canvas.

### Source-tailored CE Intelligence adapters (Task #61)

Each adapter in `artifacts/api-server/src/lib/ce-intelligence.ts` is now **specialty-driven** rather than running the same generic prompt:

- **Per-source `SOURCE_CONFIGS`** — each of `official_site`, `tripadvisor`, `getyourguide`, `viator`, `reddit` declares (a) 2-4 targeted **sub-queries** to broaden coverage of that source, (b) a `validEvidenceTypes` whitelist, and (c) an `extractionBrief` with explicit "look for / do NOT extract / good vs. bad fact" guidance so each source stays in its lane (e.g. official_site = ground truth only, TripAdvisor = visitor tips/sentiment/wait anecdotes, Reddit = trip reports + operational changes the operator hasn't acknowledged, GYG/Viator = product offerings/price points/bundle patterns). `headout` remains a stub.
- **Parallel sub-queries with isolation** — `runSourceAdapter` runs all sub-queries via `Promise.allSettled`. Per-sub-query failures are logged and ignored; only when **every** sub-query fails does the adapter throw so the orchestrator marks the whole source as "error". One bad query never empties a source.
- **Dedupe** — facts merged across sub-queries are deduped on a normalized key (lowercase / strip non-alphanumerics / first 80 chars), keeping the highest-confidence variant.
- **`evidence_type` field** — optional enum on `IntelFact` (`authoritative_fact`, `visitor_tip`, `wait_anecdote`, `sentiment_theme`, `trip_report`, `product_offering`, `price_point`, `bundle_pattern`, `operational_change`, `other`). Set per fact by the source-specific prompt and validated against the source's allowed-types whitelist — facts tagged with a type that belongs to a different source's specialty are dropped rather than mis-stored. Old rows pre-date the field and continue to load (it's optional in the OpenAPI spec).
- **`sliceIntelForArchetype` evidence-type bias** — `ARCHETYPE_EVIDENCE_AFFINITY` maps each chart archetype to its preferred evidence types (e.g. `ticket_ladder` → `[price_point, product_offering]`, `weekly_pattern` → `[visitor_tip, wait_anecdote, trip_report]`, `daily_programme` → `[authoritative_fact]`). Within bucket-matched facts, an evidence-type match adds a +200 boost over confidence so a perfectly-matched fact at conf 60 outranks an unmatched fact at conf 99. Untagged legacy facts get no boost and fall back to confidence-only sort — backward compatible.
- **UI surfacing** (`IntelPanel.tsx`) — each fact row shows a mint **evidence-type chip** next to its source badge; each source row in the Sources strip shows a per-source **summary line** (`"Visitor tip · 4 • Wait anecdote · 2"`) so writers can see at a glance which kinds of evidence each source actually delivered. `EVIDENCE_TYPE_LABELS` is mirrored client-side (the API contract surfaces the field as a free-form string, so add new entries to both sides if you extend the enum).

### Research-grounded chart pipeline (Task #26)

Backend pipeline that adapts a subcategory question bank to a specific CE using its Deep Research Doc (DRD), then generates a draft chart deck with provenance.

- **`lib/question-bank`** workspace lib — pure-data registry of:
  - `CHART_ARCHETYPES` (mirror of the 9 chart-spec types with metadata + per-subcategory affinity hints)
  - `CROSS_CUTTING_QUESTIONS` (3 universal questions inherited by every subcategory)
  - Curated `BankQuestion[]` for 14 of 15 subcategories (`outdoor_activities` and a couple long-tail ones are stubs returning `unratified: true` — orchestrator bootstraps from DRD only)
  - `SUBCATEGORIES` registry (15 ids: landmarks, museums, sightseeing_cruises, day_trips, guided_tours, theme_parks, walking_tours, hop_on_hop_off, plays, helicopter_tours, cooking_classes, wineries, spa, outdoor_activities, combos)
- **DRD storage** — `drds` table keyed on `ceSlug` (one canonical latest DRD per CE). Accepts markdown JSON or PDF upload (multer + `unpdf` for extraction). Multipart endpoint exists at runtime but is intentionally omitted from the OpenAPI spec because Orval's Zod generator can't model `Blob` bodies in a Node typecheck context — use `fetch` + `FormData` directly for PDF uploads.
**Category-CE timing floor (Task #80).** The category-CE bias above strips standard timing charts and pushes the LLM toward comparison archetypes — that cost the Thames cruise deck 100% of timing/booking coverage. Step `(4c)` in `selectQuestions` reserves one slot: if no chart in the surviving deck has a TIMING archetype (`daily_pattern` / `hourly_heatmap` / `weekly_pattern` / `booking_window` / `seasonal_curve` / `optimal_departure`), the deterministic helper `pickCategoryCeTimingFloor` (also exported for testing) picks the highest-priority candidate from the bank then standards whose drop reason isn't a hard data-signal skip (`drd_flag` / `unlimited_capacity` / `no_data_signal` / `drd_low_confidence`). At the signature cap (5 for category-CE) it displaces the lowest-ranked signature; standards are never displaced. Belt-and-braces: the standards auto-restore loop in step (1) also restores S2 booking_window for category-CEs when no other timing chart was kept. The `sightseeing_cruises` bank gained matching `daily_pattern` and cruise-framed `booking_window` signatures plus a sunset-by-month-aware `optimal_departure` so the floor has real candidates to draw on. Unit coverage in `scripts/src/test-cruise-timing-floor.mts` (run via `pnpm --filter @workspace/scripts run test-cruise-timing-floor`).

- **Pipeline** (`artifacts/api-server/src/lib/research-pipeline.ts`):
  1. **Select questions** — Gemini reads DRD + bank, picks 4-7 questions (one per archetype), drops the rest with reasons, proposes 1-2 hero questions. Two prompt-level rules tighten DRD grounding:
     - **DRD-confidence rule**: questions whose underlying topic is rated Low confidence / called out as an "Honest Gap" / flagged as anecdotal in the DRD must be skipped, with a `dropped` reason prefixed `drd_low_confidence:` so writers see exactly which DRD section drove the suppression.
     - **Category-CE detection**: when the DRD describes 3+ named sub-products with materially different positioning (e.g. Thames cruises = Uber Boat / sightseeing / Greenwich / dining / HOHO), the model returns `is_category_ce: true` plus a `sub_products[]` list. The selection prompt then biases toward comparison archetypes (`slot_compare`, `compare_zones`, `ticket_ladder`, `time_split`) and away from single-curve generics. Deterministic post-processing (`step (4b)` in `selectQuestions`) auto-promotes a bank `slot_compare` if the model flagged a category-CE but didn't actually pick one. Defence-in-depth: a category-CE claim with <3 sub-products is downgraded to single-product.
  2. **Generate one chart per question** — Gemini call per chart with the per-archetype JSON snippet (`chart-archetype-prompts.ts`) and `googleSearch` tool enabled for live web grounding. Grounding sources auto-merged into provenance from `response.candidates[0].groundingMetadata`. Per-archetype `SOURCING:` notes on `booking_window`, `seasonal_curve`, and `hourly_heatmap` mirror the `sighting_probability` pattern: drop the chart when grounding is thin, otherwise round to coarse buckets, omit fabricated sub-metrics (e.g. `sold_out_risk`, `weather_score`, `price_score`), and tag every numeric field in `provenance.estimates`.
  3. **Verify** — OpenAI (`gpt-5.4`) re-reads DRD and challenges each spec; verifier_notes stored per chart. Soft-fails if `AI_INTEGRATIONS_OPENAI_*` env vars are missing.
- **Persistence** — `charts` table extended with `status` ("draft"|"published", default "published" for legacy/curated rows) and `provenance` jsonb (`{status, drd_snippets, web_sources, estimates, verifier_notes, source_question, recommended_archetype}`). Each pipeline run **only deletes prior `status='draft'` rows for the CE** — published rows survive untouched so live embeds keep working. New drafts are inserted at `sortOrder >= 1000` to avoid colliding with the published deck. CE `status` is only flipped to `"draft"` when no published charts exist for the CE; otherwise the existing CE status is preserved. Provenance today is chart-level (not per-numeric-field) — per-field tagging is intentional future work.
- **Endpoints** — `GET/POST/DELETE /api/drds[/:ceSlug]`, `GET /api/research/subcategories`, `POST /api/research/generate`. The Florence cluster CEs are guarded by `lib/locked-ces.ts` (shared by `/ces` and `/research/generate`) — pipeline returns 409 for them so curated decks can never be wiped. Unknown subcategory ids are accepted and bootstrapped as `unratified` (cross-cutting questions only).
- **Web search at runtime** — uses Gemini's built-in `googleSearch` tool because the workspace `web-search` skill is agent-only (not server-callable from the running api-server).

### Editorial verdict + targeted recheck (Task #66)

Each planner idea (recommended *and* rejected) carries a five-judgement editorial block (`useful`, `ce_specific`, `better_than_existing`, `conversion_driven`, `visually_strong`, each `{verdict: yes|weak|no, rationale}`). The deterministic ship/hold/cut rule lives in `artifacts/api-server/src/lib/editorial-verdict.ts` (also home to the missing-evidence query derivation):

- `cut` if `useful` or `ce_specific` is `no` (regardless of other yes votes)
- `ship` if ≥4 `yes` AND zero `no`
- `hold` otherwise

The verdict is **always computed server-side** from the five judgements — the model never picks ship/hold/cut directly.

`POST /api/ce-intelligence/:slug/recheck-gap` is now a multi-query pipeline rather than a single Gemini shot:
1. Derive 1–3 missing-evidence buckets deterministically from the rejection reason + the archetype's `data_shape` (regex patterns in `editorial-verdict.ts`).
2. Fan out one Gemini-with-`googleSearch` call per bucket; failures isolated.
3. Merge findings + source_refs (deduped) and aggregate the per-bucket `found / partial / not_found` statuses.
4. Re-score the idea editorially (`scoreEditorialForIdea`) — same five judgements, deterministic verdict.

Response shape extends the legacy contract with `editorial`, `editorial_verdict`, and a `buckets[]` array showing which queries fired. The IntelPanel UI promotes recheck-promoted rejected cards (verdict `ship`/`hold`) into the Recommended list with a "Found by recheck" badge instead of immediately auto-creating a chart; `cut` keeps them rejected. The 7 numeric quality axes now hide behind a "Why this score" disclosure under each card; the editorial chip strip + verdict pill are the primary surface.

Unit coverage for the deterministic rule and the missing-evidence derivation lives in `scripts/src/test-editorial-verdict.mjs` (run via `pnpm --filter @workspace/scripts run test-editorial-verdict`). The script intentionally re-implements both helpers in plain JS — there's no TS-aware test runner wired up yet, so keep the mirror in sync with the TS source.

### Curated / locked CEs

`lib/curated-seeds` is a workspace lib that owns the hand-curated chart decks for the locked Florence cluster (`galleria-dellaccademia`, `galleria-degli-uffizi`, `duomo-di-firenze`) plus the `colosseum` history-timeline reference deck. The api-server calls `seedCuratedCesIdempotent()` on startup (in `artifacts/api-server/src/index.ts`) — if a slug is missing it inserts the CE and all its charts in one transaction, otherwise it skips so existing chart IDs (referenced by external embed URLs) stay stable. CE insert uses `ON CONFLICT (slug) DO NOTHING` for safety under multi-instance startup. Failures per CE are isolated and never block server startup.

The same data is also still present in `scripts/src/data/{accademia,uffizi,duomo}.mjs` because the dev `seed-*.mjs` scripts (raw `pg.Client`, run via `node`) need it. This duplication is short-term — long-term, those scripts should switch to importing from the lib via `tsx`.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (`ces`, `charts` tables; chart spec stored as `jsonb`)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec) → `@workspace/api-client-react` hooks
- **AI**: `@google/genai` (Gemini 2.5 Pro) — direct dep of api-server (esbuild externalizes `@google/*`)
- **Frontend**: React + Vite + Tailwind v4 + wouter + Recharts
- **Brand**: Headout — Purps `#8000FF`, Candy `#FF0076`, Manrope font; tokens in `artifacts/viz-studio/src/lib/brand.ts`

## Chart spec

`artifacts/api-server/src/lib/chart-spec.ts` defines a Zod discriminated union of chart types. Original 9: `weekly_pattern`, `hourly_heatmap`, `month_calendar`, `booking_window`, `stat_grid`, `compare_zones`, `donut_breakdown`, `seasonal_curve`, `ticket_ladder`. Florence-cluster additions: `tribune_density`, `daily_pattern`, `duration_profiles`, `entrance_lanes`, `co_bookings`. Task #36 v3 timeline & narrative family: `daily_programme` (open-to-close horizontal timeline with pinned events + popularity ring), `time_split` (single stacked bar broken into named segments — segment minutes must sum within 5% of `total_min`), `slot_compare` (compare 2–3 time slots across 3–5 dimensions; per-dimension `scores` length must equal slots length; ≤1 slot may be `recommended`). `slot_compare` renders as **grouped horizontal bars** rather than a radar — a 3-axis radar with overlapping polygons becomes illegible at 320×320 embeds, while grouped bars stay readable down to ~280px wide and scale linearly.

Generation: `artifacts/api-server/src/lib/generate-ce.ts` builds a strict prompt with per-type schemas, calls Gemini, validates against Zod, and retries once with the validation error fed back. Strict array lengths enforce data completeness (`.length(12)` for months, `.length(7)` for weekday rows, `.length(24)` for hours). Topic-to-chart creation also recognises history/origin/restoration prompts and routes them to `history_timeline`; unmatched topics now fail fast instead of defaulting to `weekly_pattern`.

Renderers: `artifacts/viz-studio/src/components/charts/` — one file per type. All wrapped in `ChartCard` (header with ESTIMATED pill + title/subtitle, content area, footer insight). Charts use container queries + percentage-based geometry so they fill any size cleanly above the 400px embed floor.

**Canonical timeline pattern.** `history_timeline` is the standard Headout pattern for any historical/narrative timeline visualization (founding → spectacle → decline → reuse → restoration → modern). The renderer is an at-a-glance **infographic**, not an interactive explorer: every event renders simultaneously with its date, era chip, title, and (where useful) a punchy metric chip; `highlight_event` decorates the most pivotal entry with a "★ Pivotal" pill rather than hiding the rest behind a click. Era color tokens follow the existing brand palette (purps for construction, candy for spectacle, hola for decline, slate for reuse, mint for restoration, indigo for modern).

The renderer is **layout-responsive** based on container width (measured via `ResizeObserver`):

- **Horizontal layered layout** (≥560px wide, non-compact): four stacked rows — (1) era pill rail where each pill spans `n` columns equal to the consecutive event count in that era, (2) date pills above the spine, (3) horizontal spine with one colored node per event (pivotal node enlarged with a `purps` ring), (4) titles + metric chips beneath each node. Callout sits as a centered footer band. Tuned for inline article-body embeds at ~720–1024 wide × ~280–400 tall — readers do not scroll inside an iframe nested in an article they're already scrolling, so the entire timeline must fit at-a-glance. Titles **must be ≤30 chars** to fit one column at 9 events; descriptions are intentionally omitted in horizontal mode (the at-a-glance era arc is the deliverable).
- **Vertical layout** (<560px wide, or compact mode): one row per event with the date pill on the left and era chip + title + description + metric chip on the right, connected by a vertical era spine. This path also supports a `dense` mode (tall enough to skip global compact, but too short to fit all rows with descriptions): drops descriptions + callout but keeps every row.

Compact mode (sub-340px embeds, set by the global Embed wrapper) tightens padding and forces vertical layout regardless of width. Reference implementation: the `colosseum` curated CE in `lib/curated-seeds/src/data/colosseum.ts` — future timeline questions on any CE should reuse `history_timeline` rather than introducing a parallel chart type, and curated titles should respect the ≤30 char budget so the horizontal layout reads cleanly.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Embed contract

Embeds live at `${origin}/studio/embed/:chartId` and render the single chart fluidly into whatever size the host iframe provides (no fixed aspect ratio, **no height floor**). The CMS just pastes the URL — no width/height attrs needed. Charts use container-query-based clamps internally and adapt to whatever box they're given, from ~200×200 up to 1280×500+.

Chrome density auto-adjusts based on rendered viewport height (`window.innerHeight`):

- **Tall iframes (≥ 340px)** render full chrome: ESTIMATED pill + context subtitle in the ChartCard header, plus any per-chart secondary strip (insight paragraph, calendar chips, legend, helper callouts, scale ticks, headline, y-axis label, etc.).
- **Short iframes (< 340px)** auto-flip into **compact mode** which drops the ChartCard header AND every per-chart secondary strip, tightens outer padding, and lets the visualization fill nearly the entire box. The 340px threshold is the empirical break-even where default chrome stops fitting without crowding or clipping bottom labels (months, x-axis, day names).

URL overrides:

- `?compact=1` (or `compact=true`) — force compact mode at any size.
- `?compact=0` (or `compact=false`) — force default chrome at any size (embedder accepts that small iframes may clip).
- No flag — auto-detect based on iframe height (recommended for CMS embeds).

Compact is honored by all 8 chart types used by the curated Florence cluster (the only CEs the CMS embeds — see `LOCKED_CE_SLUGS`). `ChartCard` strips its header (ESTIMATED pill + subtitle) and tightens padding for every chart. Per-component secondary-chrome gating:

- **SeasonalCurveChart** — hides `metric_insights` paragraph, `calendar_notes` chip rail, fallback legend; tightens bar-area top padding from 22→14px.
- **BookingWindowChart** — hides "Sweet spot ·" pill in header strip and `sold_out_risk` insight footer.
- **DurationProfilesChart** — hides headline strip, scale-tick row, and `tip` footer (each bar self-labels its value range, so the axis is redundant at narrow widths).
- **TribuneDensityChart** — hides y-axis label strip (`y_label`), `context_pills` rail, `arrow_callout.helper`; samples sparser x-axis labels (~5 vs ~12).
- **CoBookingsChart** — hides headline strip; tightens row gap, rank/icon size, name font; hides `badge` chip on each row.
- **WeeklyPatternChart** — hides level legend and `day_notes` chips.
- **DailyPatternChart** — hides opening-hours `caption` pill; samples sparser x-axis labels (~5 vs ~9).
- **EntranceLanesChart** — hides venue title strip (Landmark icon + name + caption).
- **DailyProgrammeChart** — hides ChartCard header + per-event location/popularity sub-labels and the highlight callout (timeline track + event icons remain).
- **TimeSplitChart** — hides total/runtime header row and the bottom callout pill; legend rail uses tighter gap and drops per-segment notes.
- **SlotCompareChart** — hides slot-legend chip rail, "{slot} leads" per-row labels, and the bottom insight footer; bars shrink to 14px and use first-letter mini-labels instead of slot-name columns.
- **HourlyHeatmapChart** — accepts `compact`. Embeds (and the studio chart preview) render visualization-only: heatmap grid + Quiet→Crowded legend + best-window pill. The optional `highlight_cards` field on the spec (`{kind, headline, detail}` × ≤6, kinds: `quietest_hours`, `best_photography`, `best_weather`, `fastest_entry`, `best_evening`, `best_off_season`) is **never rendered inside the chart** — it surfaces only on the studio CE detail page as a "Suggested content" panel (`SuggestedContentPanel` in `pages/CeDetail.tsx`) with a Copy-as-HTML button so writers can paste it into the article body alongside the embed. This keeps embeds purely visual while preserving the supplementary text as ready-to-ship CMS copy. Reference deck: the Colosseum `hourly-crowd-pattern` chart in `lib/curated-seeds/src/data/colosseum.ts`.

Legacy chart types (`compare_zones`, `ticket_ladder`, `stat_grid`) and currently-unused types (`month_calendar`, `donut_breakdown`) **do not** accept a `compact` prop and `ChartRenderer` does not pass it to them. They predate the curated Florence cluster, are not part of the CMS embed contract, and may crowd at very small sizes. If a future curated CE adopts one of these types, add the `compact?: boolean` prop and gate its chrome before forwarding from `ChartRenderer`.

CMS embed snippet (auto-compact at small sizes, full chrome at large):

```html
<iframe src="https://<host>/studio/embed/<chartId>" frameborder="0"></iframe>
```

Curated Florence cluster CEs (currently `galleria-dellaccademia`; `uffizi`, `duomo` planned) are listed in `LOCKED_CE_SLUGS` (`artifacts/api-server/src/routes/ces.ts`) which blocks delete/regenerate so curated chart specs in `scripts/src/data/*.mjs` remain canonical.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
