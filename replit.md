# Workspace

## Overview

Internal Headout tool ("Viz Studio") that generates AI-powered, brand-consistent data visualizations for any "CE" (Combined Entity = an attraction like Vatican Museums, Eiffel Tower). Each CE gets 4–7 tailored charts (heatmaps, ticket comparisons, booking-window curves, seasonal curves, etc.) that the CMS team can embed as iframes in listing pages.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Artifacts

- `artifacts/viz-studio` (web) — Main app: browse/create CEs, view chart library, copy iframe URLs. Embed view at `/studio/embed/:chartId` is a strict 16:10 full-bleed render for use in iframes.
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

Renderers: `artifacts/viz-studio/src/components/charts/` — one file per type. All wrapped in `ChartCard` which enforces 16:10 aspect ratio, header (ESTIMATED pill, title, subtitle), and footer insight.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Embed contract

Embeds live at `${origin}/studio/embed/:chartId` and render the single chart at strict 16:10 (min 800×500, prefer 1600×1000). The `Embed` page uses `aspect-ratio` so an `<iframe width=1600 height=1000>` displays the chart full-bleed without crop. CMS embed snippet:

```html
<iframe src="https://<host>/studio/embed/<chartId>" width="1600" height="1000" frameborder="0"></iframe>
```

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
