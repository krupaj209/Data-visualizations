// One-shot seed: replaces the chart set for the Galleria degli Uffizi with
// a hand-curated `seasonal_curve` deck (Crowds / Weather / Price).
// Run from the workspace root:
//   node --experimental-vm-modules scripts/src/seed-uffizi.mjs
import { makeClient, seedCe } from "./lib/seed-helpers.mjs";
import * as uffizi from "./data/uffizi.mjs";

const client = makeClient();
await client.connect();
try {
  await seedCe(client, uffizi);
} finally {
  await client.end();
}
