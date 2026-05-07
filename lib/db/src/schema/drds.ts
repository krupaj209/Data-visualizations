import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Deep Research Documents — one canonical, latest DRD per CE slug.
 *
 * The Research Lab will eventually expose an HTTP API we pull from. Until
 * then, writers paste/upload markdown or PDF; the api-server extracts text
 * from PDFs into `markdown` and stores the original filename for display.
 *
 * The table is keyed on `ceSlug` (not `ceId`) so a DRD can be uploaded
 * BEFORE a CE row exists — the orchestrator creates the CE on demand.
 */
export const drdsTable = pgTable("drds", {
  id: serial("id").primaryKey(),
  ceSlug: text("ce_slug").notNull().unique(),
  /** Plain markdown form of the DRD body. PDFs are converted on upload. */
  markdown: text("markdown").notNull(),
  /** "markdown" | "pdf" — what the writer originally provided. */
  sourceType: text("source_type").notNull().default("markdown"),
  /** Display name for the original PDF, if any. */
  sourceFilename: text("source_filename"),
  /** Optional list of source URLs the lab cited. JSON-encoded for portability. */
  sources: text("sources").notNull().default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertDrdSchema = createInsertSchema(drdsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDrd = z.infer<typeof insertDrdSchema>;
export type Drd = typeof drdsTable.$inferSelect;
