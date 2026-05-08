import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { chartsTable } from "./charts";

/**
 * Audit log of every writer edit on a chart. Consumed by the future
 * feedback loop ("this chart was AI-generated, then edited 3 times by
 * writers" as a quality signal). Writer id is a stub string for now —
 * we have no auth on Viz Studio yet.
 */
export const chartEditsTable = pgTable("chart_edits", {
  id: serial("id").primaryKey(),
  chartId: integer("chart_id")
    .notNull()
    .references(() => chartsTable.id, { onDelete: "cascade" }),
  /** Stub writer id — display name or "anonymous" if absent. */
  writerId: text("writer_id").notNull().default("anonymous"),
  /**
   * "edit" — header/spec edit
   * "verify" — wrote the verifier overlay (no spec change)
   * "publish" — flipped from draft → published
   * "unpublish" — flipped from published → draft
   * "create" — created via topic-to-chart
   */
  action: text("action").notNull(),
  /** Snapshot of the previous chart state (for forensics, not undo). */
  before: jsonb("before").$type<Record<string, unknown> | null>(),
  /** Snapshot of the new chart state. */
  after: jsonb("after").$type<Record<string, unknown> | null>(),
  /** Free-text note (e.g. verifier issue summary, ideation prompt). */
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ChartEdit = typeof chartEditsTable.$inferSelect;
