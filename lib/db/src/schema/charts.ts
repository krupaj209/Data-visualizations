import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { cesTable } from "./ces";

export const chartsTable = pgTable("charts", {
  id: serial("id").primaryKey(),
  ceId: integer("ce_id")
    .notNull()
    .references(() => cesTable.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  question: text("question").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  insight: text("insight").notNull().default(""),
  chartType: text("chart_type").notNull(),
  spec: jsonb("spec").notNull().$type<Record<string, unknown>>(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertChartSchema = createInsertSchema(chartsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertChart = z.infer<typeof insertChartSchema>;
export type Chart = typeof chartsTable.$inferSelect;
