import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, cesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  INTEL_SOURCE_IDS,
  type IntelSourceId,
  getCeIntelligence,
  refreshCeIntelligence,
  deleteIntelSource,
} from "../lib/ce-intelligence";

const router: IRouter = Router();

const refreshBody = z.object({
  /** Optional subset of sources. Empty/omitted = refresh all. */
  sources: z.array(z.enum(INTEL_SOURCE_IDS)).optional(),
  /** Bootstrap CE info if the CE row doesn't exist yet. */
  name: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

router.get("/ce-intelligence/:ceSlug", async (req, res): Promise<void> => {
  const ceSlug = req.params["ceSlug"];
  if (!ceSlug) {
    res.status(400).json({ error: "ceSlug is required" });
    return;
  }
  const view = await getCeIntelligence(ceSlug);
  if (!view) {
    res.status(404).json({ error: "No intelligence profile yet" });
    return;
  }
  res.json(view);
});

router.post(
  "/ce-intelligence/:ceSlug/refresh",
  async (req, res): Promise<void> => {
    const ceSlug = req.params["ceSlug"];
    if (!ceSlug) {
      res.status(400).json({ error: "ceSlug is required" });
      return;
    }
    const parsed = refreshBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    // Resolve the CE name/city/country either from the existing row or
    // from the request body. Locked CEs are allowed to build profiles —
    // this is read-only enrichment that never touches their charts.
    const [ce] = await db
      .select()
      .from(cesTable)
      .where(eq(cesTable.slug, ceSlug));

    const name = ce?.name ?? parsed.data.name;
    const city = ce?.city ?? parsed.data.city;
    const country = ce?.country ?? parsed.data.country;
    if (!name || !city || !country) {
      res.status(400).json({
        error: `CE "${ceSlug}" not found — provide name/city/country to bootstrap.`,
      });
      return;
    }

    try {
      const view = await refreshCeIntelligence(
        { ce: { name, city, country, slug: ceSlug } },
        { sources: parsed.data.sources as IntelSourceId[] | undefined },
      );
      res.json(view);
    } catch (err) {
      req.log.error({ err }, "Intelligence refresh failed");
      res.status(502).json({
        error:
          err instanceof Error
            ? `Intelligence refresh failed: ${err.message}`
            : "Intelligence refresh failed",
      });
    }
  },
);

router.delete(
  "/ce-intelligence/:ceSlug/sources/:source",
  async (req, res): Promise<void> => {
    const ceSlug = req.params["ceSlug"];
    const source = req.params["source"] as IntelSourceId | undefined;
    if (!ceSlug || !source) {
      res.status(400).json({ error: "ceSlug and source are required" });
      return;
    }
    if (!INTEL_SOURCE_IDS.includes(source)) {
      res.status(400).json({ error: `Unknown source "${source}"` });
      return;
    }
    const view = await deleteIntelSource(ceSlug, source);
    if (!view) {
      res.status(404).json({ error: "No intelligence profile yet" });
      return;
    }
    res.json(view);
  },
);

export default router;
