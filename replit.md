# Workspace

## Overview

Internal Headout tool ("Viz Studio") that generates AI-powered, brand-consistent data visualizations for any "CE" (Combined Entity = an attraction like Vatican Museums, Eiffel Tower). Each CE gets 4–7 tailored charts (heatmaps, ticket comparisons, booking-window curves, seasonal curves, etc.) that the CMS team can embed as iframes in listing pages.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Artifacts

- `artifacts/viz-studio` (web) — Main app: browse/create CEs, view chart library, copy iframe URLs. Embed view at `/studio/embed/:chartId` fills any iframe size (responsive, container-query–driven) with a 400px height floor.
- `artifacts/api-server` (api) — Express API. POSTs to Gemini for chart generation, persists CEs + charts in Postgres, serves via OpenAPI/Orval-generated hooks.
- `artifacts/mockup-sandbox` (design) — Vite preview server for component variants on the canvas.

### Research-grounded chart pipeline (Task #26)

Backend pipeline that adapts a subcategory question bank to a specific CE using its Deep Research Doc (DRD), then generates a draft chart deck with provenance.

- **`lib/question-bank`** workspace lib — pure-data registry of:
  - `CHART_ARCHETYPES` (mirror of the 9 chart-spec types with metadata + per-subcategory affinity hints)
  - `CROSS_CUTTING_QUESTIONS` (3 universal questions inherited by every subcategory)
  - Curated `BankQuestion[]` for 14 of 15 subcategories (`outdoor_activities` and a couple long-tail ones are stubs returning `unratified: true` — orchestrator bootstraps from DRD only)
  - `SUBCATEGORIES` registry (15 ids: landmarks, museums, sightseeing_cruises, day_trips, guided_tours, theme_parks, walking_tours, hop_on_hop_off, plays, helicopter_tours, cooking_classes, wineries, spa, outdoor_activities, combos)
- **DRD storage** — `drds` table keyed on `ceSlug` (one canonical latest DRD per CE). Accepts markdown JSON or PDF upload (multer + `unpdf` for extraction). Multipart endpoint exists at runtime but is intentionally omitted from the OpenAPI spec because Orval's Zod generator can't model `Blob` bodies in a Node typecheck context — use `fetch` + `FormData` directly for PDF uploads.
- **Pipeline** (`artifacts/api-server/src/lib/research-pipeline.ts`):
  1. **Select questions** — Gemini reads DRD + bank, picks 4-7 questions (one per archetype), drops the rest with reasons, proposes 1-2 hero questions.
  2. **Generate one chart per question** — Gemini call per chart with the per-archetype JSON snippet (`chart-archetype-prompts.ts`) and `googleSearch` tool enabled for live web grounding. Grounding sources auto-merged into provenance from `response.candidates[0].groundingMetadata`.
  3. **Verify** — OpenAI (`gpt-5.4`) re-reads DRD and challenges each spec; verifier_notes stored per chart. Soft-fails if `AI_INTEGRATIONS_OPENAI_*` env vars are missing.
- **Persistence** — `charts` table extended with `status` ("draft"|"published", default "published" for legacy/curated rows) and `provenance` jsonb (`{status, drd_snippets, web_sources, estimates, verifier_notes, source_question, recommended_archetype}`). Each pipeline run **only deletes prior `status='draft'` rows for the CE** — published rows survive untouched so live embeds keep working. New drafts are inserted at `sortOrder >= 1000` to avoid colliding with the published deck. CE `status` is only flipped to `"draft"` when no published charts exist for the CE; otherwise the existing CE status is preserved. Provenance today is chart-level (not per-numeric-field) — per-field tagging is intentional future work.
- **Endpoints** — `GET/POST/DELETE /api/drds[/:ceSlug]`, `GET /api/research/subcategories`, `POST /api/research/generate`. The Florence cluster CEs are guarded by `lib/locked-ces.ts` (shared by `/ces` and `/research/generate`) — pipeline returns 409 for them so curated decks can never be wiped. Unknown subcategory ids are accepted and bootstrapped as `unratified` (cross-cutting questions only).
- **Web search at runtime** — uses Gemini's built-in `googleSearch` tool because the workspace `web-search` skill is agent-only (not server-callable from the running api-server).

### Curated / locked CEs

`lib/curated-seeds` is a workspace lib that owns the hand-curated chart decks for the locked Florence cluster (`galleria-dellaccademia`, `galleria-degli-uffizi`, `duomo-di-firenze`). The api-server calls `seedCuratedCesIdempotent()` on startup (in `artifacts/api-server/src/index.ts`) — if a slug is missing it inserts the CE and all its charts in one transaction, otherwise it skips so existing chart IDs (referenced by external embed URLs) stay stable. CE insert uses `ON CONFLICT (slug) DO NOTHING` for safety under multi-instance startup. Failures per CE are isolated and never block server startup.

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

Generation: `artifacts/api-server/src/lib/generate-ce.ts` builds a strict prompt with per-type schemas, calls Gemini, validates against Zod, and retries once with the validation error fed back. Strict array lengths enforce data completeness (`.length(12)` for months, `.length(7)` for weekday rows, `.length(24)` for hours).

Renderers: `artifacts/viz-studio/src/components/charts/` — one file per type. All wrapped in `ChartCard` (header with ESTIMATED pill + title/subtitle, content area, footer insight). Charts use container queries + percentage-based geometry so they fill any size cleanly above the 400px embed floor.

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

Legacy chart types (`hourly_heatmap`, `compare_zones`, `ticket_ladder`, `stat_grid`) and currently-unused types (`month_calendar`, `donut_breakdown`) **do not** accept a `compact` prop and `ChartRenderer` does not pass it to them. They predate the curated Florence cluster, are not part of the CMS embed contract, and may crowd at very small sizes. If a future curated CE adopts one of these types, add the `compact?: boolean` prop and gate its chrome before forwarding from `ChartRenderer`.

CMS embed snippet (auto-compact at small sizes, full chrome at large):

```html
<iframe src="https://<host>/studio/embed/<chartId>" frameborder="0"></iframe>
```

Curated Florence cluster CEs (currently `galleria-dellaccademia`; `uffizi`, `duomo` planned) are listed in `LOCKED_CE_SLUGS` (`artifacts/api-server/src/routes/ces.ts`) which blocks delete/regenerate so curated chart specs in `scripts/src/data/*.mjs` remain canonical.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
