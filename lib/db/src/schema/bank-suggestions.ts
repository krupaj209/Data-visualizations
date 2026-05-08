import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

/**
 * Suggestions submitted from the public Question Bank page. Free-form, no
 * auth — anyone with the URL can propose a new question for a subcategory
 * or flag an existing one. Status moves open -> accepted | dismissed via
 * the staff triage view.
 */
export const bankSuggestionsTable = pgTable("bank_suggestions", {
  id: serial("id").primaryKey(),
  /** Subcategory id from question-bank (or "_general" for cross-cutting). */
  subcategoryId: text("subcategory_id").notNull(),
  /** Proposed visitor question text. */
  question: text("question").notNull(),
  /** Optional archetype the suggester thinks would answer it. */
  recommendedArchetype: text("recommended_archetype"),
  /** Optional free-text reasoning / context. */
  note: text("note"),
  /** Display name of the suggester ("anonymous" if absent). */
  suggestedBy: text("suggested_by").notNull().default("anonymous"),
  /** open | accepted | dismissed */
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type BankSuggestion = typeof bankSuggestionsTable.$inferSelect;
