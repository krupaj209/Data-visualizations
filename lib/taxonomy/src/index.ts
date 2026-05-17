import { HEADOUT_CATEGORIES } from "./data";
import type {
  HeadoutCategory,
  HeadoutCategoryRecord,
  HeadoutSubcategory,
  HeadoutSubcategoryId,
} from "./types";

export type {
  HeadoutCategory,
  HeadoutSubcategory,
  HeadoutSubcategoryId,
} from "./types";

function buildSubcategory(
  cat: HeadoutCategoryRecord,
  sub: HeadoutCategoryRecord["subcategories"][number],
  ratifiedIds: ReadonlySet<HeadoutSubcategoryId>,
): HeadoutSubcategory {
  const isSynthetic = typeof sub.subcategoryId === "string";
  return {
    categoryId: cat.categoryId,
    categoryName: cat.categoryName,
    subcategoryId: sub.subcategoryId,
    subcategoryName: sub.subcategoryName,
    isSynthetic,
    unratified: !ratifiedIds.has(sub.subcategoryId),
  };
}

/**
 * Build the public registry. `ratifiedIds` is the set of Headout subcategory
 * ids the question-bank lib currently has a curated bundle for. Passing it
 * explicitly avoids a cyclic dependency between taxonomy and question-bank.
 */
export function buildTaxonomyRegistry(
  ratifiedIds: ReadonlySet<HeadoutSubcategoryId> = new Set(),
): {
  categories: HeadoutCategory[];
  subcategories: HeadoutSubcategory[];
} {
  const categories = HEADOUT_CATEGORIES.map((cat) => ({
    categoryId: cat.categoryId,
    categoryName: cat.categoryName,
    subcategories: cat.subcategories.map((s) =>
      buildSubcategory(cat, s, ratifiedIds),
    ),
  }));
  const subcategories = categories.flatMap((c) => c.subcategories);
  return { categories, subcategories };
}

/** Default registry — every subcategory is flagged `unratified: true`. */
const DEFAULT = buildTaxonomyRegistry();

export function listCategories(
  ratifiedIds?: ReadonlySet<HeadoutSubcategoryId>,
): HeadoutCategory[] {
  return ratifiedIds
    ? buildTaxonomyRegistry(ratifiedIds).categories
    : DEFAULT.categories;
}

export function listSubcategories(
  ratifiedIds?: ReadonlySet<HeadoutSubcategoryId>,
): HeadoutSubcategory[] {
  return ratifiedIds
    ? buildTaxonomyRegistry(ratifiedIds).subcategories
    : DEFAULT.subcategories;
}

export function getSubcategoriesByCategory(
  categoryId: number,
  ratifiedIds?: ReadonlySet<HeadoutSubcategoryId>,
): HeadoutSubcategory[] {
  const cat = listCategories(ratifiedIds).find(
    (c) => c.categoryId === categoryId,
  );
  return cat ? cat.subcategories : [];
}

export function findSubcategoryById(
  subcategoryId: HeadoutSubcategoryId,
  ratifiedIds?: ReadonlySet<HeadoutSubcategoryId>,
): HeadoutSubcategory | undefined {
  // Allow string-form numeric ids (e.g. "1007") so query params Just Work.
  const normalized =
    typeof subcategoryId === "string" && /^\d+$/.test(subcategoryId)
      ? Number(subcategoryId)
      : subcategoryId;
  return listSubcategories(ratifiedIds).find(
    (s) => s.subcategoryId === normalized,
  );
}

export { HEADOUT_CATEGORIES } from "./data";
