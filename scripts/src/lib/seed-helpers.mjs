// Shared helpers for hand-curated CE seed scripts.
//
// Each per-CE seed file (e.g. `seed-accademia.mjs`) defines the CE row and the
// list of charts to insert, then calls `seedCe(...)` to upsert the CE and
// replace its chart set in a single transaction.
//
// Run an individual seed from the workspace root, for example:
//   node --experimental-vm-modules scripts/src/seed-accademia.mjs
//
// Or run all curated Florence CEs at once:
//   node --experimental-vm-modules scripts/src/seed-florence.mjs
//
// (Resolves `pg` via lib/db so we don't add a duplicate dependency.)
import path from "node:path";
import { createRequire } from "node:module";

const req = createRequire(path.resolve("lib/db/package.json"));
const pg = req("pg");
const { Client } = pg;

export function makeClient() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  return new Client({ connectionString: process.env.DATABASE_URL });
}

/**
 * Upsert a single hand-curated CE and replace its chart set.
 *
 * @param {import("pg").Client} client - Connected pg client (caller manages
 *   connect/end so multiple seeds can share one connection).
 * @param {object} args
 * @param {object} args.ce - CE row fields (slug, name, city, country,
 *   category, summary, emoji).
 * @param {Array<object>} args.charts - Charts to insert in order. Each chart:
 *   { slug, question, title, subtitle, insight, chart_type, spec }.
 */
export async function seedCe(client, { ce, charts }) {
  await client.query("BEGIN");

  try {
    const findRes = await client.query(
      "SELECT id FROM ces WHERE slug = $1",
      [ce.slug],
    );

    let ceId;
    if (findRes.rows.length === 0) {
      const ins = await client.query(
        `INSERT INTO ces (slug, name, city, country, category, summary, emoji, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'ready')
         RETURNING id`,
        [
          ce.slug,
          ce.name,
          ce.city,
          ce.country,
          ce.category,
          ce.summary,
          ce.emoji,
        ],
      );
      ceId = ins.rows[0].id;
      console.log(`Created ${ce.name} CE id:`, ceId);
    } else {
      ceId = findRes.rows[0].id;
      await client.query(
        `UPDATE ces
            SET name = $1, city = $2, country = $3, category = $4,
                summary = $5, emoji = $6, status = 'ready'
          WHERE id = $7`,
        [ce.name, ce.city, ce.country, ce.category, ce.summary, ce.emoji, ceId],
      );
      console.log(`Updated existing ${ce.name} CE id:`, ceId);
    }

    await client.query("DELETE FROM charts WHERE ce_id = $1", [ceId]);

    for (let i = 0; i < charts.length; i++) {
      const c = charts[i];
      await client.query(
        `INSERT INTO charts
           (ce_id, slug, question, title, subtitle, insight, chart_type, spec, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          ceId,
          c.slug,
          c.question,
          c.title,
          c.subtitle,
          c.insight,
          c.chart_type,
          JSON.stringify(c.spec),
          i,
        ],
      );
    }

    const rows = (
      await client.query(
        "SELECT id, slug, chart_type FROM charts WHERE ce_id = $1 ORDER BY sort_order",
        [ceId],
      )
    ).rows;

    await client.query("COMMIT");

    console.log(`Inserted ${rows.length} curated charts for ${ce.name}:`);
    for (const r of rows) {
      console.log(`  /studio/embed/${r.id}  [${r.chart_type}] ${r.slug}`);
    }
    console.log("");
  } catch (err) {
    // Explicit rollback so a partial seed never lingers in the open
    // transaction — important when running multiple CEs in one connection
    // (e.g. seed-florence.mjs) so a failure for one CE doesn't poison the
    // next one.
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error(`Rollback after error failed for ${ce.name}:`, rollbackErr);
    }
    throw err;
  }
}
