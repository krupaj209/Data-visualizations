import { seedCuratedCesIdempotent } from "@workspace/curated-seeds";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  seedCuratedCesIdempotent()
    .then((result) => {
      if (result.inserted.length > 0) {
        logger.info(
          { inserted: result.inserted, skipped: result.skipped },
          "Curated CEs seeded",
        );
      } else {
        logger.info(
          { skipped: result.skipped },
          "Curated CEs already present, no seeding needed",
        );
      }
    })
    .catch((seedErr) => {
      logger.error(
        { err: seedErr },
        "Failed to seed curated CEs — continuing startup anyway",
      );
    });
});
