/**
 * One-shot reset: wipes every CE, chart, and DRD on the dev database so the
 * api-server's `seedCuratedCesIdempotent()` can repopulate the 4 curated
 * Florence/Rome cluster CEs from `@workspace/curated-seeds` on next startup.
 *
 * Safety guards:
 *   - Refuses to run unless `--yes-wipe-dev` is passed.
 *   - Refuses to run if NODE_ENV=production.
 *   - Refuses to run if the connection string looks production-ish.
 *
 * Usage (from workspace root):
 *   pnpm --filter @workspace/scripts run reset-dev-db-to-curated -- --yes-wipe-dev
 */
import path from "node:path";
import { createRequire } from "node:module";

const req = createRequire(path.resolve("lib/db/package.json"));
const pg = req("pg");
const { Client } = pg;

function fail(msg: string): never {
  console.error(`[reset-dev-db] ${msg}`);
  process.exit(1);
}

const args = process.argv.slice(2);
if (!args.includes("--yes-wipe-dev")) {
  fail("Refusing to run without --yes-wipe-dev flag.");
}

if (process.env["NODE_ENV"] === "production") {
  fail("Refusing to run with NODE_ENV=production.");
}

const url = process.env["DATABASE_URL"];
if (!url) {
  fail("DATABASE_URL is required.");
}

const lower = url.toLowerCase();
const prodMarkers = ["prod", "production"];
for (const marker of prodMarkers) {
  if (lower.includes(marker)) {
    fail(
      `DATABASE_URL contains "${marker}" — refusing to run against a production-looking database.`,
    );
  }
}

const client = new Client({ connectionString: url });
try {
  await client.connect();
  await client.query("BEGIN");
  // CASCADE handles every table that references ces/charts/drds (chart_edits,
  // chart_feedback, ideation_messages, bank_suggestions, ce_intelligence, ...).
  await client.query("TRUNCATE TABLE charts, ces, drds RESTART IDENTITY CASCADE");
  await client.query("COMMIT");
  console.log(
    "[reset-dev-db] Wiped charts, ces, drds (CASCADE). Restart the API Server workflow to re-seed curated CEs.",
  );
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("[reset-dev-db] Failed:", err);
  process.exitCode = 1;
} finally {
  await client.end();
}
