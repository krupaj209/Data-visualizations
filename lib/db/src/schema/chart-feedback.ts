import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { chartsTable } from "./charts";

/**
 * Writer-facing feedback on a single chart. Captured from the feedback
 * affordance on the chart card in CeDetail and the in-Studio embed view.
 *
 * Either `rating` (1-5) or `issueCategory` (or both) should be present;
 * `note` and `reporterName` are optional free text. `status` flows through
 * "open" → "resolved" | "dismissed" via the Triage page.
 */
export const chartFeedbackTable = pgTable("chart_feedback", {
  id: serial("id").primaryKey(),
  chartId: integer("chart_id")
    .notNull()
    .references(() => chartsTable.id, { onDelete: "cascade" }),
  /** Optional 1-5 rating (1 = bad, 5 = great). Null when only flagging an issue. */
  rating: integer("rating"),
  /**
   * One of: "wrong_data" | "misleading" | "ugly" | "doesnt_answer" | "other".
   * Drives the inline severity badge color. Null when only leaving a rating.
   */
  issueCategory: text("issue_category"),
  note: text("note").notNull().default(""),
  reporterName: text("reporter_name").notNull().default(""),
  /** "open" | "resolved" | "dismissed" */
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertChartFeedbackSchema = createInsertSchema(
  chartFeedbackTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChartFeedback = z.infer<typeof insertChartFeedbackSchema>;
export type ChartFeedback = typeof chartFeedbackTable.$inferSelect;

/**
 * Implicit-edit signal log. The future writer authoring layer (task #27)
 * will append a row each time a writer edits a chart. The triage page
 * surfaces the count as "AI then edited Nx" and the trouble-score formula
 * weights each edit at 0.25 against the original AI generation.
 *
 * Defined here (not in `charts.ts`) because it's part of the feedback
 * loop's data model — chart edits are only meaningful as a quality signal.
 */
export const chartEditsTable = pgTable("chart_edits", {
  id: serial("id").primaryKey(),
  chartId: integer("chart_id")
    .notNull()
    .references(() => chartsTable.id, { onDelete: "cascade" }),
  editorName: text("editor_name").notNull().default(""),
  summary: text("summary").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ChartEdit = typeof chartEditsTable.$inferSelect;
