/**
 * Loader for writer-controlled question overrides. Two scopes:
 *
 *   - category-scope (keyed on Headout subcategory id)
 *   - CE-scope     (keyed on ce slug)
 *
 * Each row in either table represents ONE action against ONE (bundle,
 * archetype) candidate. The loader streams them into `OverrideAction[]`
 * for the assembler's merge layer. Lookup is best-effort: a DB error or
 * empty result returns `[]` so the pipeline gracefully falls back to
 * code defaults.
 */

import { asc, eq } from "drizzle-orm";
import {
  db,
  questionCategoryOverridesTable,
  questionCeOverridesTable,
  type QuestionCategoryOverride,
  type QuestionCeOverride,
} from "@workspace/db";
import {
  RATIFIED_HEADOUT_SUBCATEGORY_IDS,
  resolveBundleSubcategory,
} from "@workspace/question-bank";
import type { OverrideAction } from "@workspace/question-bank";
import { logger } from "./logger";

export interface LoadedOverrides {
  categoryActions: OverrideAction[];
  ceActions: OverrideAction[];
  /** Curated internal subcategory key the overrides were keyed against (debug). */
  resolvedBundleKey: string | null;
}

type RawRow = QuestionCategoryOverride | QuestionCeOverride;

function rowToAction(row: RawRow): OverrideAction | null {
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

/**
 * Pull both override layers for a given CE + Headout subcategory.
 *
 * Category overrides are stored under the SAME string the route caller
 * passes (e.g. "1002"), so writers can override at the Headout-canonical
 * level without us needing to know the internal bridge.
 */
export async function loadOverridesFor(args: {
  ceSlug: string;
  subcategoryId: string;
}): Promise<LoadedOverrides> {
  const { ceSlug, subcategoryId } = args;
  const resolved = resolveBundleSubcategory(subcategoryId);
  const bridgedKey = typeof resolved === "string" ? resolved : null;

  let categoryActions: OverrideAction[] = [];
  let ceActions: OverrideAction[] = [];

  try {
    // Order by `id ASC` so multiple actions targeting the same
    // (bundle, archetype) within this layer apply in stable insertion
    // order — last-written wins inside the layer, and the layer itself
    // is then overlaid by the CE-scope layer in the assembler.
    const rows = await db
      .select()
      .from(questionCategoryOverridesTable)
      .where(eq(questionCategoryOverridesTable.subcategoryId, subcategoryId))
      .orderBy(asc(questionCategoryOverridesTable.id));
    categoryActions = rows
      .map(rowToAction)
      .filter((a): a is OverrideAction => a !== null);
  } catch (err) {
    logger.warn(
      { err, subcategoryId },
      "loadOverridesFor: category override lookup failed; falling back to []",
    );
  }

  try {
    const rows = await db
      .select()
      .from(questionCeOverridesTable)
      .where(eq(questionCeOverridesTable.ceSlug, ceSlug))
      .orderBy(asc(questionCeOverridesTable.id));
    ceActions = rows
      .map(rowToAction)
      .filter((a): a is OverrideAction => a !== null);
  } catch (err) {
    logger.warn(
      { err, ceSlug },
      "loadOverridesFor: CE override lookup failed; falling back to []",
    );
  }

  if (
    (categoryActions.length > 0 || ceActions.length > 0) &&
    RATIFIED_HEADOUT_SUBCATEGORY_IDS.size > 0
  ) {
    logger.info(
      {
        ceSlug,
        subcategoryId,
        bridgedKey,
        categoryActionCount: categoryActions.length,
        ceActionCount: ceActions.length,
        categoryActionIds: categoryActions.map((a) => a.id),
        ceActionIds: ceActions.map((a) => a.id),
      },
      "loadOverridesFor: applying question overrides",
    );
  }

  return { categoryActions, ceActions, resolvedBundleKey: bridgedKey };
}
