import {
  pgTable,
  text,
  serial,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Question overrides — writer-controlled tweaks to the deterministic
 * deck assembler's output. Each row represents EXACTLY ONE override
 * action so writers can edit/mute/add a single (bundle, archetype)
 * candidate without rewriting a whole jsonb blob.
 *
 * Two scopes are supported:
 *
 *   - "category" overrides keyed on `subcategory_id`
 *     (Headout numeric id, e.g. "1002", or synthetic id)
 *   - "ce" overrides keyed on `ce_slug`
 *
 * The assembler merges them in this order:
 *
 *   code defaults → category overrides → CE overrides
 *
 * A later layer overrides what an earlier layer did on the same
 * (bundleId, archetype, action) row.
 */

export const overrideActionEnum = z.enum(["edit", "add", "mute"]);
export type QuestionOverrideActionKind = z.infer<typeof overrideActionEnum>;

/** Per-row override shape, used by loader + assembler merge layer. */
const overrideRowSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("edit"),
    bundleId: z.string().min(1),
    archetype: z.string().min(1),
    questionTemplate: z.string().min(3),
  }),
  z.object({
    action: z.literal("add"),
    bundleId: z.string().min(1),
    archetype: z.string().min(1),
    questionTemplate: z.string().min(3),
    kind: z.enum(["standard", "signature"]).optional(),
  }),
  z.object({
    action: z.literal("mute"),
    bundleId: z.string().min(1),
    archetype: z.string().min(1),
  }),
]);

export type QuestionOverrideRow = z.infer<typeof overrideRowSchema>;

/** Category-scope overrides — one row per (subcategoryId, bundleId, archetype, action). */
export const questionCategoryOverridesTable = pgTable(
  "question_category_overrides",
  {
    id: serial("id").primaryKey(),
    /** Stringified Headout subcategory id (e.g. "1002" or "synthetic:cruises:whale-watching"). */
    subcategoryId: text("subcategory_id").notNull(),
    bundleId: text("bundle_id").notNull(),
    archetype: text("archetype").notNull(),
    action: text("action").notNull().$type<QuestionOverrideActionKind>(),
    /** Required when action = edit / add. */
    questionTemplate: text("question_template"),
    /** Only meaningful for action = add. */
    kind: text("kind").$type<"standard" | "signature">(),
    notes: text("notes"),
    /** Free-text writer identity (email / username). Required for audit. */
    createdBy: text("created_by").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    composedUq: uniqueIndex(
      "question_category_overrides_subcat_bundle_arch_action_uq",
    ).on(t.subcategoryId, t.bundleId, t.archetype, t.action),
  }),
);

export const insertQuestionCategoryOverrideSchema = createInsertSchema(
  questionCategoryOverridesTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type QuestionCategoryOverride =
  typeof questionCategoryOverridesTable.$inferSelect;

/** CE-scope overrides — one row per (ceSlug, bundleId, archetype, action). */
export const questionCeOverridesTable = pgTable(
  "question_ce_overrides",
  {
    id: serial("id").primaryKey(),
    ceSlug: text("ce_slug").notNull(),
    bundleId: text("bundle_id").notNull(),
    archetype: text("archetype").notNull(),
    action: text("action").notNull().$type<QuestionOverrideActionKind>(),
    questionTemplate: text("question_template"),
    kind: text("kind").$type<"standard" | "signature">(),
    notes: text("notes"),
    /** Free-text writer identity (email / username). Required for audit. */
    createdBy: text("created_by").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    composedUq: uniqueIndex(
      "question_ce_overrides_ceslug_bundle_arch_action_uq",
    ).on(t.ceSlug, t.bundleId, t.archetype, t.action),
  }),
);

export const insertQuestionCeOverrideSchema = createInsertSchema(
  questionCeOverridesTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type QuestionCeOverride =
  typeof questionCeOverridesTable.$inferSelect;

/**
 * Zod validator for an array of override rows — used by the (forthcoming)
 * admin CRUD routes and by the loader when sanitising DB rows back into
 * the assembler's `OverrideAction` shape.
 */
export const questionOverrideRowsSchema = z.array(overrideRowSchema);
export type QuestionOverrideRows = z.infer<typeof questionOverrideRowsSchema>;
