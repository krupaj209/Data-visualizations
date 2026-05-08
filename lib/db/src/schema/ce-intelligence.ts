import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";

/**
 * CE Intelligence Layer — a persistent, structured knowledge profile per CE.
 *
 * One row per CE slug. The `profile` column is a bag of buckets (see
 * `ce-intelligence.ts` in api-server for the canonical shape). Each fact
 * carries its source attribution, fetched-at timestamp, and confidence so
 * the chart pipeline can read straight from here AND the UI can cite
 * facts back to their original sources.
 *
 * The `sources` column tracks per-adapter run status (last_tried_at,
 * last_success_at, fact_count, error) so the UI can render
 * "TripAdvisor: 0 results, last tried 2h ago" style messaging without
 * losing prior good data.
 *
 * Keyed on slug (not ceId) because intelligence can be built BEFORE a CE
 * row is created (mirrors the DRD pattern).
 */
export const ceIntelligenceTable = pgTable("ce_intelligence", {
  id: serial("id").primaryKey(),
  ceSlug: text("ce_slug").notNull().unique(),
  profile: jsonb("profile")
    .notNull()
    .$type<Record<string, unknown>>()
    .default({}),
  sources: jsonb("sources")
    .notNull()
    .$type<Record<string, unknown>>()
    .default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type CeIntelligence = typeof ceIntelligenceTable.$inferSelect;
