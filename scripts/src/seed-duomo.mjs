// One-shot seed: replaces the chart set for the Duomo di Firenze with
// a hand-curated `seasonal_curve` deck (Crowds / Weather / Price).
// Run from the workspace root:
//   node --experimental-vm-modules scripts/src/seed-duomo.mjs
import { makeClient, seedCe } from "./lib/seed-helpers.mjs";
import * as duomo from "./data/duomo.mjs";

const client = makeClient();
await client.connect();
try {
  await seedCe(client, duomo);
} finally {
  await client.end();
}
