/**
 * Identifier for a Headout subcategory. Real subcategories use numeric ids
 * (Headout's canonical taxonomy); the rare entry that has no numeric id in
 * the source TSV gets a stable synthetic `"synthetic:<slug>"` string id.
 */
export type HeadoutSubcategoryId = number | string;

export interface HeadoutSubcategory {
  categoryId: number;
  categoryName: string;
  subcategoryId: HeadoutSubcategoryId;
  subcategoryName: string;
  /**
   * True when the subcategory has no numeric Headout id in the source TSV
   * (i.e. it was given a synthetic id here).
   */
  isSynthetic: boolean;
  /**
   * True when no curated bundle currently maps to this subcategory. The
   * assembler still produces a default-bundle deck for it.
   */
  unratified: boolean;
}

export interface HeadoutCategory {
  categoryId: number;
  categoryName: string;
  subcategories: HeadoutSubcategory[];
}

/**
 * Raw shape used by `data.ts` — `unratified` is derived at runtime against
 * the question-bank bridge, so this internal record omits it.
 */
export interface HeadoutCategoryRecord {
  categoryId: number;
  categoryName: string;
  subcategories: {
    subcategoryId: HeadoutSubcategoryId;
    subcategoryName: string;
  }[];
}
