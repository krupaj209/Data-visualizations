import type { Ce } from "@workspace/db";
import { isKnownSubcategory } from "@workspace/question-bank";

/**
 * Best-effort mapping from a CE row to a curated SubcategoryId. The CE row
 * only carries a free-text `category`; this helper hits the curated map
 * first, then falls back to keyword heuristics on name/category/slug.
 */
export function inferSubcategoryId(ce: Ce): string {
  const raw = (ce.category || "").trim();
  if (raw && isKnownSubcategory(raw)) return raw;

  const haystack = `${ce.name} ${ce.category} ${ce.slug}`.toLowerCase();
  if (/\b(cruise|river|boat|thames|seine|canal)\b/.test(haystack)) {
    return "sightseeing_cruises";
  }
  if (/\b(gallery|museum|uffizi|accademia|louvre|vatican)\b/.test(haystack)) {
    return "museums";
  }
  if (/\b(colosseum|tower|landmark|monument|palace)\b/.test(haystack)) {
    return "landmarks";
  }
  if (/\b(day trip|day-trip|excursion)\b/.test(haystack)) {
    return "day_trips";
  }
  return raw || "landmarks";
}
