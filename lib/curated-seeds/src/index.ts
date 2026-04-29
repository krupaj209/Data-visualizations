import { db, cesTable, chartsTable } from "@workspace/db";
import { accademia } from "./data/accademia";
import { uffizi } from "./data/uffizi";
import { duomo } from "./data/duomo";
import type { CuratedCe } from "./types";

export type { CuratedCe };

export const CURATED_CES: CuratedCe[] = [accademia, uffizi, duomo];

export interface SeedResult {
  inserted: string[];
  skipped: string[];
  failed: Array<{ slug: string; error: string }>;
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

  for (const { ce, charts } of CURATED_CES) {
    try {
      await db.transaction(async (tx) => {
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
          skipped.push(ce.slug);
          return;
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
              sortOrder: i,
            })),
          );
        }

        inserted.push(ce.slug);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push({ slug: ce.slug, error: message });
    }
  }

  return { inserted, skipped, failed };
}
