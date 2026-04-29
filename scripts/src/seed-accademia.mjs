// One-shot seed: replaces the chart set for "Galleria dell'Accademia" with
// the curated 7-chart deck per Headout reference designs.
// Run from the workspace root:
//   node --experimental-vm-modules scripts/src/seed-accademia.mjs
import { makeClient, seedCe } from "./lib/seed-helpers.mjs";
import * as accademia from "./data/accademia.mjs";

const client = makeClient();
await client.connect();
try {
  await seedCe(client, accademia);
} finally {
  await client.end();
}
