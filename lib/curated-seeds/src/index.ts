import { db, cesTable, chartsTable } from "@workspace/db";
import { eq, max } from "drizzle-orm";
import { accademia } from "./data/accademia";
import { uffizi } from "./data/uffizi";
import { duomo } from "./data/duomo";
import { colosseum } from "./data/colosseum";
import type { CuratedCe } from "./types";

export type { CuratedCe };

export const CURATED_CES: CuratedCe[] = [accademia, uffizi, duomo, colosseum];

export interface SeedResult {
  inserted: string[];
  skipped: string[];
  failed: Array<{ slug: string; error: string }>;
  /**
   * Charts that were added to an already-existing curated CE because
   * their slug was missing. Format: "<ceSlug>/<chartSlug>".
   */
  addedCharts: string[];
}

/**
 * Idempotently seed the locked / curated CEs.
 *
 * Behaviour:
 *  - If a CE with the slug already exists: skip it (chart IDs are
 *    preserved so existing embed URLs keep working).
 *  - If a CE is missing: insert the CE and all of its charts in a
 *    single transaction.
 *  - The CE insert uses `ON CONFLICT (slug) DO NOTHING` so it is
 *    safe under concurrent multi-instance startup. If two processes
 *    race, one inserts and the other observes "already present" and
 *    skips charts (the winner already inserted them inside its txn).
 *  - Per-CE failures are isolated; one bad row does not abort
 *    seeding for the remaining curated CEs.
 *
 * Safe to call on every server startup.
 */
export async function seedCuratedCesIdempotent(): Promise<SeedResult> {
  const inserted: string[] = [];
  const skipped: string[] = [];
  const failed: Array<{ slug: string; error: string }> = [];
  const addedCharts: string[] = [];

  for (const { ce, charts } of CURATED_CES) {
    try {
      const existingCeRow = await db.transaction(async (tx) => {
        const insertedRows = await tx
          .insert(cesTable)
          .values({
            slug: ce.slug,
            name: ce.name,
            city: ce.city,
            country: ce.country,
            category: ce.category,
            summary: ce.summary,
            emoji: ce.emoji,
            status: "ready",
          })
          .onConflictDoNothing({ target: cesTable.slug })
          .returning({ id: cesTable.id });

        if (insertedRows.length === 0) {
          // Slug already existed — another instance won the race or this
          // CE was previously seeded. Leave existing data untouched so
          // chart IDs (referenced by external embed URLs) remain stable.
          // We still want to additively insert any *new* curated charts
          // (matched by slug) so library expansions ship without manual
          // DB surgery — handled outside this txn below.
          return null;
        }

        const insertedCe = insertedRows[0]!;

        if (charts.length > 0) {
          await tx.insert(chartsTable).values(
            charts.map((c, i) => ({
              ceId: insertedCe.id,
              slug: c.slug,
              question: c.question,
              title: c.title,
              subtitle: c.subtitle,
              insight: c.insight,
              chartType: c.chart_type,
              spec: c.spec,
              provenance: c.provenance ?? null,
              sortOrder: i,
            })),
          );
        }

        inserted.push(ce.slug);
        return insertedCe;
      });

      if (existingCeRow !== null) {
        // Freshly inserted CE — nothing more to do.
        continue;
      }

      // CE pre-existed: additively insert any curated charts whose
      // slug is missing. Existing rows (chart ids referenced by embed
      // URLs) are never touched.
      skipped.push(ce.slug);

      if (charts.length === 0) continue;

      const ceRow = await db
        .select({ id: cesTable.id })
        .from(cesTable)
        .where(eq(cesTable.slug, ce.slug))
        .limit(1);
      if (ceRow.length === 0) continue;
      const ceId = ceRow[0]!.id;

      const existingCharts = await db
        .select({ slug: chartsTable.slug })
        .from(chartsTable)
        .where(eq(chartsTable.ceId, ceId));
      const existingSlugs = new Set(existingCharts.map((c) => c.slug));
      const missing = charts.filter((c) => !existingSlugs.has(c.slug));
      if (missing.length === 0) continue;

      const maxRow = await db
        .select({ max: max(chartsTable.sortOrder) })
        .from(chartsTable)
        .where(eq(chartsTable.ceId, ceId));
      const startSort = (maxRow[0]?.max ?? -1) + 1;

      await db.insert(chartsTable).values(
        missing.map((c, i) => ({
          ceId,
          slug: c.slug,
          question: c.question,
          title: c.title,
          subtitle: c.subtitle,
          insight: c.insight,
          chartType: c.chart_type,
          spec: c.spec,
          provenance: c.provenance ?? null,
          sortOrder: startSort + i,
        })),
      );
      for (const c of missing) addedCharts.push(`${ce.slug}/${c.slug}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push({ slug: ce.slug, error: message });
    }
  }

  return { inserted, skipped, failed, addedCharts };
}
