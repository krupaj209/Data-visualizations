import { Router, type IRouter } from "express";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  bankSuggestionsTable,
  questionCategoryOverridesTable,
  questionCeOverridesTable,
  cesTable,
  type BankSuggestion,
  type QuestionCategoryOverride,
  type QuestionCeOverride,
  type Ce,
} from "@workspace/db";
import {
  CHART_ARCHETYPES,
  CHART_ARCHETYPE_IDS,
  QUESTION_BUNDLES,
  VISITOR_INTENTS,
  PAGE_TEMPLATES,
  listSubcategories,
  SUBCATEGORY_IDS,
  mergeBundleOverrides,
  type OverrideAction,
  type OverrideSource,
} from "@workspace/question-bank";
import {
  HEADOUT_CATEGORIES,
  findSubcategoryById,
  getSubcategoriesByCategory,
} from "@workspace/taxonomy";
import { inferSubcategoryId } from "../lib/infer-subcategory";

const KNOWN_SUBCATEGORY_IDS = new Set<string>([
  ...SUBCATEGORY_IDS,
  "_general",
]);
const KNOWN_ARCHETYPE_IDS = new Set<string>(CHART_ARCHETYPE_IDS);
const KNOWN_BUNDLE_IDS = new Set<string>(Object.keys(QUESTION_BUNDLES));
const KNOWN_CATEGORY_IDS = new Set<number>(
  HEADOUT_CATEGORIES.map((c) => c.categoryId),
);

const router: IRouter = Router();

/* -------------------------------------------------------------------------- */
/* Helpers — row ↔ override-action, merge view                                */
/* -------------------------------------------------------------------------- */

type AnyOverrideRow = QuestionCategoryOverride | QuestionCeOverride;

function rowToAction(row: AnyOverrideRow): OverrideAction | null {
  if (row.action === "edit") {
    if (!row.questionTemplate) return null;
    return {
      id: row.id,
      action: "edit",
      bundleId: row.bundleId,
      archetype: row.archetype,
      questionTemplate: row.questionTemplate,
    };
  }
  if (row.action === "add") {
    if (!row.questionTemplate) return null;
    return {
      id: row.id,
      action: "add",
      bundleId: row.bundleId,
      archetype: row.archetype,
      questionTemplate: row.questionTemplate,
      ...(row.kind ? { kind: row.kind } : {}),
    };
  }
  if (row.action === "mute") {
    return {
      id: row.id,
      action: "mute",
      bundleId: row.bundleId,
      archetype: row.archetype,
    };
  }
  return null;
}

function toActions(rows: AnyOverrideRow[]): OverrideAction[] {
  return rows
    .map(rowToAction)
    .filter((a): a is OverrideAction => a !== null);
}

function sourceLabel(source: OverrideSource): string {
  if (source === "category") return "category_override";
  if (source === "ce") return "ce_override";
  return "code";
}

function buildMergedBundles(
  categoryActions: OverrideAction[],
  ceActions: OverrideAction[],
) {
  return Object.values(QUESTION_BUNDLES).map((bundle) => {
    const merged = mergeBundleOverrides(bundle, categoryActions, ceActions);
    return {
      bundleId: bundle.id,
      intent: bundle.intent,
      label: bundle.label,
      description: bundle.description,
      candidates: merged.candidates.map((c) => {
        const annotated = c as typeof c & {
          __source: OverrideSource;
          __muted: boolean;
          __overrideId?: number;
        };
        return {
          archetype: c.archetype,
          questionTemplate: c.question_template,
          kind: c.kind ?? "signature",
          source: sourceLabel(annotated.__source),
          muted: Boolean(annotated.__muted),
          ...(annotated.__overrideId !== undefined
            ? { overrideId: annotated.__overrideId }
            : {}),
          ...(c.requires ? { requires: c.requires } : {}),
          ...(c.prefers ? { prefers: c.prefers } : {}),
        };
      }),
    };
  });
}

function serializeCategoryOverride(row: QuestionCategoryOverride) {
  return {
    id: row.id,
    subcategoryId: row.subcategoryId,
    bundleId: row.bundleId,
    archetype: row.archetype,
    action: row.action,
    questionTemplate: row.questionTemplate,
    kind: row.kind,
    notes: row.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeCeOverride(row: QuestionCeOverride) {
  return {
    id: row.id,
    ceSlug: row.ceSlug,
    bundleId: row.bundleId,
    archetype: row.archetype,
    action: row.action,
    questionTemplate: row.questionTemplate,
    kind: row.kind,
    notes: row.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type Scope = {
  kind: "global" | "category" | "subcategory" | "ce";
  categoryId?: number;
  subcategoryId?: string;
  ceSlug?: string;
  resolvedSubcategoryId?: string;
};

async function loadCategoryRows(
  subcategoryId?: string,
): Promise<QuestionCategoryOverride[]> {
  if (!subcategoryId) return [];
  return db
    .select()
    .from(questionCategoryOverridesTable)
    .where(eq(questionCategoryOverridesTable.subcategoryId, subcategoryId))
    .orderBy(asc(questionCategoryOverridesTable.id));
}

async function loadCeRows(ceSlug?: string): Promise<QuestionCeOverride[]> {
  if (!ceSlug) return [];
  return db
    .select()
    .from(questionCeOverridesTable)
    .where(eq(questionCeOverridesTable.ceSlug, ceSlug))
    .orderBy(asc(questionCeOverridesTable.id));
}

async function buildViewForScope(scope: Scope) {
  const subcategoryForCategoryLayer =
    scope.subcategoryId ?? scope.resolvedSubcategoryId;
  let categoryRows = await loadCategoryRows(subcategoryForCategoryLayer);
  const ceRows = await loadCeRows(scope.ceSlug);
  const ceActions = toActions(ceRows);

  // For category-scope filter: load every override row across every subcategory
  // in that category, and emit a per-subcategory merged view so the editor can
  // show "this candidate is overridden in X of the Y subcategories in this
  // category". The top-level `mergedBundles` for category scope is left at the
  // code defaults because overrides from different subcategories within a
  // single category cannot be sensibly collapsed into one view — consumers
  // should read `perSubcategoryMerged` for the effective per-subcategory data.
  let perSubcategoryMerged:
    | { subcategoryId: string; mergedBundles: ReturnType<typeof buildMergedBundles> }[]
    | undefined;
  if (scope.kind === "category" && typeof scope.categoryId === "number") {
    const categoryRowsAll = await loadOverridesForCategory(scope.categoryId);
    categoryRows = categoryRowsAll;
    const grouped = new Map<string, QuestionCategoryOverride[]>();
    for (const sub of getSubcategoriesByCategory(scope.categoryId)) {
      grouped.set(String(sub.subcategoryId), []);
    }
    for (const row of categoryRowsAll) {
      const bucket = grouped.get(row.subcategoryId);
      if (bucket) bucket.push(row);
      else grouped.set(row.subcategoryId, [row]);
    }
    perSubcategoryMerged = [...grouped.entries()].map(([subId, rows]) => ({
      subcategoryId: subId,
      mergedBundles: buildMergedBundles(toActions(rows), []),
    }));
  }
  const categoryActions =
    scope.kind === "category" ? [] : toActions(categoryRows);

  return {
    archetypes: CHART_ARCHETYPES,
    intents: VISITOR_INTENTS,
    bundles: QUESTION_BUNDLES,
    pageTemplates: PAGE_TEMPLATES,
    subcategories: listSubcategories(),
    scope: {
      kind: scope.kind,
      categoryId: scope.categoryId ?? null,
      subcategoryId: scope.subcategoryId ?? null,
      ceSlug: scope.ceSlug ?? null,
      resolvedSubcategoryId: scope.resolvedSubcategoryId ?? null,
    },
    mergedBundles: buildMergedBundles(categoryActions, ceActions),
    categoryOverrides: categoryRows.map(serializeCategoryOverride),
    ceOverrides: ceRows.map(serializeCeOverride),
    ...(perSubcategoryMerged ? { perSubcategoryMerged } : {}),
  };
}

async function lookupCe(slug: string): Promise<Ce | null> {
  const [row] = await db
    .select()
    .from(cesTable)
    .where(eq(cesTable.slug, slug))
    .limit(1);
  return row ?? null;
}

/* -------------------------------------------------------------------------- */
/* GET /api/question-bank — merged view (with optional filters)               */
/* -------------------------------------------------------------------------- */

router.get("/question-bank", async (req, res): Promise<void> => {
  const rawCategoryId = req.query["categoryId"];
  const rawSubcategoryId = req.query["subcategoryId"];
  const rawCeSlug = req.query["ceSlug"];

  let scope: Scope = { kind: "global" };

  if (typeof rawCeSlug === "string" && rawCeSlug.length > 0) {
    const ce = await lookupCe(rawCeSlug);
    if (!ce) {
      res.status(400).json({ error: `unknown ceSlug: ${rawCeSlug}` });
      return;
    }
    scope = {
      kind: "ce",
      ceSlug: ce.slug,
      resolvedSubcategoryId: inferSubcategoryId(ce),
    };
  } else if (typeof rawSubcategoryId === "string" && rawSubcategoryId.length > 0) {
    if (validateSubcategoryId(rawSubcategoryId)) {
      res
        .status(400)
        .json({ error: `unknown subcategoryId: ${rawSubcategoryId}` });
      return;
    }
    scope = { kind: "subcategory", subcategoryId: rawSubcategoryId };
  } else if (typeof rawCategoryId === "string" && rawCategoryId.length > 0) {
    const n = Number(rawCategoryId);
    if (!Number.isInteger(n) || !KNOWN_CATEGORY_IDS.has(n)) {
      res.status(400).json({ error: `unknown categoryId: ${rawCategoryId}` });
      return;
    }
    scope = { kind: "category", categoryId: n };
  }

  res.json(await buildViewForScope(scope));
});

/* -------------------------------------------------------------------------- */
/* Category overrides CRUD                                                    */
/* -------------------------------------------------------------------------- */

const overrideActionEnum = z.enum(["edit", "add", "mute"]);
const overrideKindEnum = z.enum(["standard", "signature"]);

const categoryOverrideInsertBody = z
  .object({
    subcategoryId: z.string().trim().min(1).max(120),
    bundleId: z.string().trim().min(1).max(60),
    archetype: z.string().trim().min(1).max(80),
    action: overrideActionEnum,
    questionTemplate: z.string().trim().min(3).max(400).optional(),
    kind: overrideKindEnum.optional(),
    notes: z.string().trim().max(2000).optional(),
    createdBy: z.string().trim().max(120).optional(),
  })
  .refine(
    (v) => v.action === "mute" || (v.questionTemplate && v.questionTemplate.length >= 3),
    { message: "questionTemplate is required for edit/add actions" },
  );

const ceOverrideInsertBody = z
  .object({
    ceSlug: z.string().trim().min(1).max(200),
    bundleId: z.string().trim().min(1).max(60),
    archetype: z.string().trim().min(1).max(80),
    action: overrideActionEnum,
    questionTemplate: z.string().trim().min(3).max(400).optional(),
    kind: overrideKindEnum.optional(),
    notes: z.string().trim().max(2000).optional(),
    createdBy: z.string().trim().max(120).optional(),
  })
  .refine(
    (v) => v.action === "mute" || (v.questionTemplate && v.questionTemplate.length >= 3),
    { message: "questionTemplate is required for edit/add actions" },
  );

const overridePatchBody = z.object({
  action: overrideActionEnum.optional(),
  questionTemplate: z.string().trim().max(400).nullable().optional(),
  kind: overrideKindEnum.nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  createdBy: z.string().trim().max(120).optional(),
});

const bulkApplyBody = z
  .object({
    categoryId: z.number().int(),
    bundleId: z.string().trim().min(1).max(60),
    archetype: z.string().trim().min(1).max(80),
    action: overrideActionEnum,
    questionTemplate: z.string().trim().min(3).max(400).optional(),
    kind: overrideKindEnum.optional(),
    notes: z.string().trim().max(2000).optional(),
    createdBy: z.string().trim().max(120).optional(),
  })
  .refine(
    (v) => v.action === "mute" || (v.questionTemplate && v.questionTemplate.length >= 3),
    { message: "questionTemplate is required for edit/add actions" },
  );

const bulkDeleteBody = z.object({
  categoryId: z.number().int(),
  bundleId: z.string().trim().min(1).max(60),
  archetype: z.string().trim().min(1).max(80),
  action: overrideActionEnum,
});

function validateBundleArchetype(
  bundleId: string,
  archetype: string,
): string | null {
  if (!KNOWN_BUNDLE_IDS.has(bundleId)) return `unknown bundleId: ${bundleId}`;
  if (!KNOWN_ARCHETYPE_IDS.has(archetype))
    return `unknown archetype: ${archetype}`;
  return null;
}

function validateSubcategoryId(subcategoryId: string): string | null {
  if (KNOWN_SUBCATEGORY_IDS.has(subcategoryId)) return null;
  if (findSubcategoryById(subcategoryId)) return null;
  return `unknown subcategoryId: ${subcategoryId}`;
}

router.post(
  "/question-bank/category-overrides",
  async (req, res): Promise<void> => {
    const parsed = categoryOverrideInsertBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const v = parsed.data;
    const subErr = validateSubcategoryId(v.subcategoryId);
    if (subErr) {
      res.status(400).json({ error: subErr });
      return;
    }
    const baErr = validateBundleArchetype(v.bundleId, v.archetype);
    if (baErr) {
      res.status(400).json({ error: baErr });
      return;
    }
    const [row] = await db
      .insert(questionCategoryOverridesTable)
      .values({
        subcategoryId: v.subcategoryId,
        bundleId: v.bundleId,
        archetype: v.archetype,
        action: v.action,
        questionTemplate: v.questionTemplate ?? null,
        kind: v.kind ?? null,
        notes: v.notes ?? null,
        createdBy: v.createdBy ?? "",
      })
      .onConflictDoUpdate({
        target: [
          questionCategoryOverridesTable.subcategoryId,
          questionCategoryOverridesTable.bundleId,
          questionCategoryOverridesTable.archetype,
          questionCategoryOverridesTable.action,
        ],
        set: {
          questionTemplate: v.questionTemplate ?? null,
          kind: v.kind ?? null,
          notes: v.notes ?? null,
          ...(v.createdBy ? { createdBy: v.createdBy } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();
    if (!row) {
      res.status(500).json({ error: "insert failed" });
      return;
    }
    const view = await buildViewForScope({
      kind: "subcategory",
      subcategoryId: row.subcategoryId,
    });
    res.status(201).json({
      view,
      categoryOverride: serializeCategoryOverride(row),
      ceOverride: null,
    });
  },
);

router.patch(
  "/question-bank/category-overrides/:id",
  async (req, res): Promise<void> => {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const parsed = overridePatchBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const v = parsed.data;
    const [existing] = await db
      .select()
      .from(questionCategoryOverridesTable)
      .where(eq(questionCategoryOverridesTable.id, id))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "not found" });
      return;
    }
    const nextAction = v.action ?? existing.action;
    const nextTemplate =
      v.questionTemplate !== undefined
        ? v.questionTemplate
        : existing.questionTemplate;
    if (nextAction !== "mute" && (!nextTemplate || nextTemplate.trim().length < 3)) {
      res
        .status(400)
        .json({ error: "questionTemplate is required for edit/add actions" });
      return;
    }
    const patch: Partial<typeof questionCategoryOverridesTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (v.action !== undefined) patch.action = v.action;
    if (v.questionTemplate !== undefined)
      patch.questionTemplate = v.questionTemplate;
    if (v.kind !== undefined) patch.kind = v.kind;
    if (v.notes !== undefined) patch.notes = v.notes;
    if (v.createdBy !== undefined) patch.createdBy = v.createdBy;

    const [row] = await db
      .update(questionCategoryOverridesTable)
      .set(patch)
      .where(eq(questionCategoryOverridesTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "not found" });
      return;
    }
    const view = await buildViewForScope({
      kind: "subcategory",
      subcategoryId: row.subcategoryId,
    });
    res.json({
      view,
      categoryOverride: serializeCategoryOverride(row),
      ceOverride: null,
    });
  },
);

router.delete(
  "/question-bank/category-overrides/:id",
  async (req, res): Promise<void> => {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const [row] = await db
      .delete(questionCategoryOverridesTable)
      .where(eq(questionCategoryOverridesTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "not found" });
      return;
    }
    const view = await buildViewForScope({
      kind: "subcategory",
      subcategoryId: row.subcategoryId,
    });
    res.json({ view, categoryOverride: null, ceOverride: null });
  },
);

/* -------------------------------------------------------------------------- */
/* CE overrides CRUD                                                          */
/* -------------------------------------------------------------------------- */

router.post(
  "/question-bank/ce-overrides",
  async (req, res): Promise<void> => {
    const parsed = ceOverrideInsertBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const v = parsed.data;
    const baErr = validateBundleArchetype(v.bundleId, v.archetype);
    if (baErr) {
      res.status(400).json({ error: baErr });
      return;
    }
    const ce = await lookupCe(v.ceSlug);
    if (!ce) {
      res.status(400).json({ error: `unknown ceSlug: ${v.ceSlug}` });
      return;
    }
    const [row] = await db
      .insert(questionCeOverridesTable)
      .values({
        ceSlug: v.ceSlug,
        bundleId: v.bundleId,
        archetype: v.archetype,
        action: v.action,
        questionTemplate: v.questionTemplate ?? null,
        kind: v.kind ?? null,
        notes: v.notes ?? null,
        createdBy: v.createdBy ?? "",
      })
      .onConflictDoUpdate({
        target: [
          questionCeOverridesTable.ceSlug,
          questionCeOverridesTable.bundleId,
          questionCeOverridesTable.archetype,
          questionCeOverridesTable.action,
        ],
        set: {
          questionTemplate: v.questionTemplate ?? null,
          kind: v.kind ?? null,
          notes: v.notes ?? null,
          ...(v.createdBy ? { createdBy: v.createdBy } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();
    if (!row) {
      res.status(500).json({ error: "insert failed" });
      return;
    }
    const view = await buildViewForScope({
      kind: "ce",
      ceSlug: row.ceSlug,
      resolvedSubcategoryId: inferSubcategoryId(ce),
    });
    res
      .status(201)
      .json({ view, categoryOverride: null, ceOverride: serializeCeOverride(row) });
  },
);

router.patch(
  "/question-bank/ce-overrides/:id",
  async (req, res): Promise<void> => {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const parsed = overridePatchBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const v = parsed.data;
    const [existing] = await db
      .select()
      .from(questionCeOverridesTable)
      .where(eq(questionCeOverridesTable.id, id))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "not found" });
      return;
    }
    const nextAction = v.action ?? existing.action;
    const nextTemplate =
      v.questionTemplate !== undefined
        ? v.questionTemplate
        : existing.questionTemplate;
    if (nextAction !== "mute" && (!nextTemplate || nextTemplate.trim().length < 3)) {
      res
        .status(400)
        .json({ error: "questionTemplate is required for edit/add actions" });
      return;
    }
    const patch: Partial<typeof questionCeOverridesTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (v.action !== undefined) patch.action = v.action;
    if (v.questionTemplate !== undefined)
      patch.questionTemplate = v.questionTemplate;
    if (v.kind !== undefined) patch.kind = v.kind;
    if (v.notes !== undefined) patch.notes = v.notes;
    if (v.createdBy !== undefined) patch.createdBy = v.createdBy;

    const [row] = await db
      .update(questionCeOverridesTable)
      .set(patch)
      .where(eq(questionCeOverridesTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "not found" });
      return;
    }
    const ce = await lookupCe(row.ceSlug);
    const view = await buildViewForScope({
      kind: "ce",
      ceSlug: row.ceSlug,
      resolvedSubcategoryId: ce ? inferSubcategoryId(ce) : undefined,
    });
    res.json({
      view,
      categoryOverride: null,
      ceOverride: serializeCeOverride(row),
    });
  },
);

router.delete(
  "/question-bank/ce-overrides/:id",
  async (req, res): Promise<void> => {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const [row] = await db
      .delete(questionCeOverridesTable)
      .where(eq(questionCeOverridesTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "not found" });
      return;
    }
    const ce = await lookupCe(row.ceSlug);
    const view = await buildViewForScope({
      kind: "ce",
      ceSlug: row.ceSlug,
      resolvedSubcategoryId: ce ? inferSubcategoryId(ce) : undefined,
    });
    res.json({ view, categoryOverride: null, ceOverride: null });
  },
);

/* -------------------------------------------------------------------------- */
/* Category bulk apply / bulk revert                                          */
/* -------------------------------------------------------------------------- */

function subcategoryIdsForCategory(categoryId: number): string[] {
  return getSubcategoriesByCategory(categoryId).map((s) =>
    String(s.subcategoryId),
  );
}

async function loadOverridesForCategory(
  categoryId: number,
): Promise<QuestionCategoryOverride[]> {
  const subIds = subcategoryIdsForCategory(categoryId);
  if (subIds.length === 0) return [];
  return db
    .select()
    .from(questionCategoryOverridesTable)
    .where(inArray(questionCategoryOverridesTable.subcategoryId, subIds))
    .orderBy(asc(questionCategoryOverridesTable.id));
}

router.post(
  /^\/question-bank\/category-overrides:bulk$/,
  async (req, res): Promise<void> => {
    const parsed = bulkApplyBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const v = parsed.data;
    if (!KNOWN_CATEGORY_IDS.has(v.categoryId)) {
      res.status(400).json({ error: `unknown categoryId: ${v.categoryId}` });
      return;
    }
    const baErr = validateBundleArchetype(v.bundleId, v.archetype);
    if (baErr) {
      res.status(400).json({ error: baErr });
      return;
    }
    const subIds = subcategoryIdsForCategory(v.categoryId);
    const affected: string[] = [];
    await db.transaction(async (tx) => {
      for (const subId of subIds) {
        await tx
          .insert(questionCategoryOverridesTable)
          .values({
            subcategoryId: subId,
            bundleId: v.bundleId,
            archetype: v.archetype,
            action: v.action,
            questionTemplate: v.questionTemplate ?? null,
            kind: v.kind ?? null,
            notes: v.notes ?? null,
            createdBy: v.createdBy ?? "",
          })
          .onConflictDoUpdate({
            target: [
              questionCategoryOverridesTable.subcategoryId,
              questionCategoryOverridesTable.bundleId,
              questionCategoryOverridesTable.archetype,
              questionCategoryOverridesTable.action,
            ],
            set: {
              questionTemplate: v.questionTemplate ?? null,
              kind: v.kind ?? null,
              notes: v.notes ?? null,
              ...(v.createdBy ? { createdBy: v.createdBy } : {}),
              updatedAt: new Date(),
            },
          });
        affected.push(subId);
      }
    });
    const overrides = await loadOverridesForCategory(v.categoryId);
    res.json({
      categoryId: v.categoryId,
      affectedSubcategoryIds: affected,
      upserted: affected.length,
      deleted: 0,
      overrides: overrides.map(serializeCategoryOverride),
    });
  },
);

router.delete(
  /^\/question-bank\/category-overrides:bulk$/,
  async (req, res): Promise<void> => {
    const parsed = bulkDeleteBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const v = parsed.data;
    if (!KNOWN_CATEGORY_IDS.has(v.categoryId)) {
      res.status(400).json({ error: `unknown categoryId: ${v.categoryId}` });
      return;
    }
    const baErr = validateBundleArchetype(v.bundleId, v.archetype);
    if (baErr) {
      res.status(400).json({ error: baErr });
      return;
    }
    const subIds = subcategoryIdsForCategory(v.categoryId);
    let deleted = 0;
    const affected: string[] = [];
    await db.transaction(async (tx) => {
      for (const subId of subIds) {
        const removed = await tx
          .delete(questionCategoryOverridesTable)
          .where(
            and(
              eq(questionCategoryOverridesTable.subcategoryId, subId),
              eq(questionCategoryOverridesTable.bundleId, v.bundleId),
              eq(questionCategoryOverridesTable.archetype, v.archetype),
              eq(questionCategoryOverridesTable.action, v.action),
            ),
          )
          .returning();
        if (removed.length > 0) {
          deleted += removed.length;
          affected.push(subId);
        }
      }
    });
    const overrides = await loadOverridesForCategory(v.categoryId);
    res.json({
      categoryId: v.categoryId,
      affectedSubcategoryIds: affected,
      upserted: 0,
      deleted,
      overrides: overrides.map(serializeCategoryOverride),
    });
  },
);

/* -------------------------------------------------------------------------- */
/* Legacy bank suggestions (unchanged — kept for backward compat)             */
/* -------------------------------------------------------------------------- */

const suggestionBody = z.object({
  subcategoryId: z
    .string()
    .max(80)
    .transform((s) => s.trim())
    .refine(
      (s) => KNOWN_SUBCATEGORY_IDS.has(s),
      "subcategoryId must be a known subcategory or '_general'",
    ),
  question: z
    .string()
    .max(400)
    .transform((s) => s.trim())
    .refine((s) => s.length >= 4, "question must be at least 4 characters"),
  recommendedArchetype: z
    .string()
    .max(80)
    .transform((s) => s.trim())
    .refine(
      (s) => s === "" || KNOWN_ARCHETYPE_IDS.has(s),
      "recommendedArchetype must be a known archetype id",
    )
    .optional(),
  note: z
    .string()
    .max(2000)
    .transform((s) => s.trim())
    .optional(),
  suggestedBy: z
    .string()
    .max(120)
    .transform((s) => s.trim())
    .optional(),
});

const SUGGESTION_STATUSES = ["open", "accepted", "dismissed"] as const;
type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

function serializeSuggestion(row: BankSuggestion) {
  return {
    id: row.id,
    subcategoryId: row.subcategoryId,
    question: row.question,
    recommendedArchetype: row.recommendedArchetype,
    note: row.note,
    suggestedBy: row.suggestedBy,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

router.post("/question-bank/suggestions", async (req, res): Promise<void> => {
  const parsed = suggestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(bankSuggestionsTable)
    .values({
      subcategoryId: parsed.data.subcategoryId,
      question: parsed.data.question,
      recommendedArchetype: parsed.data.recommendedArchetype || null,
      note: parsed.data.note || null,
      suggestedBy: (parsed.data.suggestedBy || "anonymous").slice(0, 120),
    })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Failed to record suggestion" });
    return;
  }
  res.status(201).json(serializeSuggestion(row));
});

router.get("/question-bank/suggestions", async (req, res): Promise<void> => {
  const rawStatus = req.query["status"];
  let status: SuggestionStatus | null = null;
  if (typeof rawStatus === "string" && rawStatus.length > 0) {
    if (!SUGGESTION_STATUSES.includes(rawStatus as SuggestionStatus)) {
      res
        .status(400)
        .json({ error: `status must be one of ${SUGGESTION_STATUSES.join(", ")}` });
      return;
    }
    status = rawStatus as SuggestionStatus;
  }
  const rows = status
    ? await db
        .select()
        .from(bankSuggestionsTable)
        .where(eq(bankSuggestionsTable.status, status))
        .orderBy(desc(bankSuggestionsTable.createdAt))
    : await db
        .select()
        .from(bankSuggestionsTable)
        .orderBy(desc(bankSuggestionsTable.createdAt));
  res.json(rows.map(serializeSuggestion));
});

const patchBody = z.object({
  status: z.enum(["open", "accepted", "dismissed"]),
});

router.patch(
  "/question-bank/suggestions/:id",
  async (req, res): Promise<void> => {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const parsed = patchBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [row] = await db
      .update(bankSuggestionsTable)
      .set({ status: parsed.data.status })
      .where(eq(bankSuggestionsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(serializeSuggestion(row));
  },
);

export default router;
