// One-shot seed: refreshes every hand-curated Florence CE in a single run.
// Useful after schema/spec changes so all curated decks land in one shot.
// Run from the workspace root:
//   node --experimental-vm-modules scripts/src/seed-florence.mjs
import { makeClient, seedCe } from "./lib/seed-helpers.mjs";
import * as accademia from "./data/accademia.mjs";
import * as uffizi from "./data/uffizi.mjs";
import * as duomo from "./data/duomo.mjs";

const client = makeClient();
await client.connect();
try {
  for (const data of [accademia, uffizi, duomo]) {
    await seedCe(client, data);
  }
} finally {
  await client.end();
}
