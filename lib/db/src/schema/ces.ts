import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cesTable = pgTable("ces", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  category: text("category").notNull().default("attraction"),
  summary: text("summary").notNull().default(""),
  emoji: text("emoji").notNull().default("📍"),
  status: text("status").notNull().default("ready"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertCeSchema = createInsertSchema(cesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCe = z.infer<typeof insertCeSchema>;
export type Ce = typeof cesTable.$inferSelect;
