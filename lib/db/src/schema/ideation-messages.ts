import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { cesTable } from "./ces";

/**
 * Per-CE ideation chatbot conversation log. Scoped to a CE so the
 * writer can pick up where they left off. No multi-user concurrency —
 * one shared transcript per CE for now (matches v1 single-writer assumption).
 */
export const ideationMessagesTable = pgTable("ideation_messages", {
  id: serial("id").primaryKey(),
  ceId: integer("ce_id")
    .notNull()
    .references(() => cesTable.id, { onDelete: "cascade" }),
  /** "user" or "assistant". */
  role: text("role").notNull(),
  content: text("content").notNull(),
  /**
   * Optional structured chart-idea proposals attached to assistant turns.
   * Stored as an array of `{ topic, archetype, rationale }` objects so the
   * UI can render them as accept-and-generate cards. Mirrors the OpenAPI
   * `IdeationMessage.proposals` schema (array, not wrapper object).
   */
  proposals: jsonb("proposals").$type<Record<string, unknown>[] | null>(),
  /**
   * Optional structured feasibility verdict attached to assistant turns
   * produced by the topic-to-chart flow. Stored as a `FeasibilityVerdict`
   * (mirrors the OpenAPI schema) — null for free-form chat turns.
   *
   * Shape: `{ verdict, topic, question?, archetype?, rationale,
   *   missing_data[], drd_snippets[], web_sources[], generated_chart_id? }`.
   * `generated_chart_id` is filled in after the writer clicks "Generate"
   * so the transcript stays linked to its draft chart.
   */
  feasibility: jsonb("feasibility").$type<Record<string, unknown> | null>(),
  /**
   * Turn kind. `"chat"` for legacy free-form ideation turns, `"topic"`
   * for the structured topic-to-chart flow. Defaults to "chat" so old
   * rows stay valid.
   */
  kind: text("kind").notNull().default("chat"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type IdeationMessage = typeof ideationMessagesTable.$inferSelect;
