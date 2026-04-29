# Workspace

## Overview

Internal Headout tool ("Viz Studio") that generates AI-powered, brand-consistent data visualizations for any "CE" (Combined Entity = an attraction like Vatican Museums, Eiffel Tower). Each CE gets 4–7 tailored charts (heatmaps, ticket comparisons, booking-window curves, seasonal curves, etc.) that the CMS team can embed as iframes in listing pages.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Artifacts

- `artifacts/viz-studio` (web) — Main app: browse/create CEs, view chart library, copy iframe URLs. Embed view at `/studio/embed/:chartId` fills any iframe size (responsive, container-query–driven) with a 400px height floor.
- `artifacts/api-server` (api) — Express API. POSTs to Gemini for chart generation, persists CEs + charts in Postgres, serves via OpenAPI/Orval-generated hooks.
- `artifacts/mockup-sandbox` (design) — Vite preview server for component variants on the canvas.
- `artifacts/weekly-pattern-widget` (web) — Standalone earlier widget (deployed; do not delete).

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

`artifacts/api-server/src/lib/chart-spec.ts` defines a Zod discriminated union of 9 chart types: `weekly_pattern`, `hourly_heatmap`, `month_calendar`, `booking_window`, `stat_grid`, `compare_zones`, `donut_breakdown`, `seasonal_curve`, `ticket_ladder`.

Generation: `artifacts/api-server/src/lib/generate-ce.ts` builds a strict prompt with per-type schemas, calls Gemini, validates against Zod, and retries once with the validation error fed back. Strict array lengths enforce data completeness (`.length(12)` for months, `.length(7)` for weekday rows, `.length(24)` for hours).

Renderers: `artifacts/viz-studio/src/components/charts/` — one file per type. All wrapped in `ChartCard` (header with ESTIMATED pill + title/subtitle, content area, footer insight). Charts use container queries + percentage-based geometry so they fill any size cleanly above the 400px embed floor.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Embed contract

Embeds live at `${origin}/studio/embed/:chartId` and render the single chart fluidly into whatever size the host iframe provides (no fixed aspect ratio). The `Embed` page applies a height floor — body has `overflow: hidden` in embed mode, so any iframe shorter than the floor clips rather than collapses to an unreadable strip.

Two modes via URL flag:

- **Default** (no flag) — full chrome including ESTIMATED pill, context subtitle, chart, and any per-type footer (insight paragraph, calendar chips, legend, helper callouts). Floor: **400px**. Use when the iframe is the only content the host shows for that chart.
- **Compact** (`?compact=1`) — drops the ChartCard header (ESTIMATED pill + subtitle) **and** any per-chart footer chrome that hosts typically duplicate as bullet copy beneath the card. Tightens outer padding and per-chart row/tick density so the visualization fills the available space cleanly from 320×260 up to 960×400+. Floor: **260px**. Use when the host CMS renders its own bullets/explanation outside the iframe and only the visualization should live inside.

Compact is honored by all 8 chart types used by the curated Florence cluster (the only CEs the CMS embeds — see `LOCKED_CE_SLUGS`). `ChartCard` strips its header (ESTIMATED pill + subtitle) and tightens padding for every chart. Per-component footer/secondary-chrome gating:

- **SeasonalCurveChart** — hides `metric_insights` paragraph, `calendar_notes` chip rail, fallback legend.
- **BookingWindowChart** — hides "Sweet spot ·" pill in header strip and `sold_out_risk` insight footer.
- **DurationProfilesChart** — hides headline strip and `tip` footer; shortens scale-tick labels (e.g. "30 min" → "30m").
- **TribuneDensityChart** — hides `context_pills` rail, `arrow_callout.helper`; samples sparser x-axis labels (~5 vs ~12).
- **CoBookingsChart** — hides headline strip; tightens row gap, rank/icon size, name font; hides `badge` chip on each row.
- **WeeklyPatternChart** — hides level legend and `day_notes` chips.
- **DailyPatternChart** — hides opening-hours `caption` pill; samples sparser x-axis labels (~5 vs ~9).
- **EntranceLanesChart** — hides venue title strip (Landmark icon + name + caption).

Legacy chart types (`hourly_heatmap`, `compare_zones`, `ticket_ladder`, `stat_grid`) and currently-unused types (`month_calendar`, `donut_breakdown`) **do not** accept a `compact` prop and `ChartRenderer` does not pass it to them. They predate the curated Florence cluster, are not part of the CMS embed contract, and may clip at the 260px floor. If a future curated CE adopts one of these types, add the `compact?: boolean` prop and gate its chrome before forwarding from `ChartRenderer`.

CMS embed snippet (compact mode for short card slots ~320×320):

```html
<iframe src="https://<host>/studio/embed/<chartId>?compact=1" width="320" height="320" frameborder="0"></iframe>
```

Curated Florence cluster CEs (currently `galleria-dellaccademia`; `uffizi`, `duomo` planned) are listed in `LOCKED_CE_SLUGS` (`artifacts/api-server/src/routes/ces.ts`) which blocks delete/regenerate so curated chart specs in `scripts/src/data/*.mjs` remain canonical.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
