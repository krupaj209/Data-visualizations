/**
 * Single source of truth for the CEs whose chart sets are hand-curated and
 * must NEVER be touched by an automated pipeline (delete, regenerate, or
 * draft replacement). Both the legacy `/ces` routes and the new research
 * pipeline import from here.
 */
export const LOCKED_CE_SLUGS: ReadonlySet<string> = new Set([
  "galleria-dellaccademia",
  "galleria-degli-uffizi",
  "duomo-di-firenze",
]);

export function isLockedCe(slug: string): boolean {
  return LOCKED_CE_SLUGS.has(slug);
}
