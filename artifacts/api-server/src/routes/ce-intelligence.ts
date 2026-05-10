import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, cesTable, drdsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  INTEL_SOURCE_IDS,
  type IntelSourceId,
  getCeIntelligence,
  refreshCeIntelligence,
  deleteIntelSource,
  saveCeVisualizationPlan,
} from "../lib/ce-intelligence";
import { buildCeVisualizationPlan } from "../lib/ce-visualization-planner";
import { ai } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();

const refreshBody = z.object({
  /** Optional subset of sources. Empty/omitted = refresh all. */
  sources: z.array(z.enum(INTEL_SOURCE_IDS)).optional(),
  /** Bootstrap CE info if the CE row doesn't exist yet. */
  name: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

const planBody = z.object({
  subcategoryId: z.string().optional(),
  subcategoryLabel: z.string().optional(),
  subcategoryDescription: z.string().optional(),
  includeLiveSearch: z.boolean().optional(),
});

const recheckGapBody = z.object({
  question: z.string().trim().min(4).max(240),
  archetype: z.string().trim().max(80).optional(),
  reason: z.string().trim().max(1000).optional(),
});

function safeJsonObject(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const fence = text.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (!fence?.[1]) return null;
    try {
      return JSON.parse(fence[1]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

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

router.post(
  "/ce-intelligence/:ceSlug/plan",
  async (req, res): Promise<void> => {
    const ceSlug = req.params["ceSlug"];
    if (!ceSlug) {
      res.status(400).json({ error: "ceSlug is required" });
      return;
    }
    const parsed = planBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [ce] = await db
      .select()
      .from(cesTable)
      .where(eq(cesTable.slug, ceSlug));
    if (!ce) {
      res.status(404).json({ error: `CE "${ceSlug}" not found.` });
      return;
    }

    const [drd] = await db
      .select()
      .from(drdsTable)
      .where(eq(drdsTable.ceSlug, ce.slug));
    const intel = await getCeIntelligence(ce.slug);

    if (!drd && (!intel || intel.facts.length === 0)) {
      res.status(412).json({
        error:
          "Upload a DRD or refresh CE Intelligence before planning visualizations.",
      });
      return;
    }

    try {
      const plan = await buildCeVisualizationPlan({
        ce: {
          name: ce.name,
          city: ce.city,
          country: ce.country,
          slug: ce.slug,
        },
        subcategoryId:
          parsed.data.subcategoryId ?? ce.category ?? "unknown_subcategory",
        subcategoryLabel: parsed.data.subcategoryLabel,
        subcategoryDescription: parsed.data.subcategoryDescription,
        drdMarkdown: drd?.markdown ?? "",
        intel,
        includeLiveSearch: parsed.data.includeLiveSearch ?? true,
      });
      await saveCeVisualizationPlan(ce.slug, plan);
      res.json(plan);
    } catch (err) {
      req.log.error({ err }, "Visualization planner failed");
      res.status(502).json({
        error:
          err instanceof Error
            ? `Visualization planner failed: ${err.message}`
            : "Visualization planner failed",
      });
    }
  },
);

router.post(
  "/ce-intelligence/:ceSlug/recheck-gap",
  async (req, res): Promise<void> => {
    const ceSlug = req.params["ceSlug"];
    if (!ceSlug) {
      res.status(400).json({ error: "ceSlug is required" });
      return;
    }
    const parsed = recheckGapBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [ce] = await db
      .select()
      .from(cesTable)
      .where(eq(cesTable.slug, ceSlug));
    if (!ce) {
      res.status(404).json({ error: `CE "${ceSlug}" not found.` });
      return;
    }
    const [drd] = await db
      .select()
      .from(drdsTable)
      .where(eq(drdsTable.ceSlug, ce.slug));
    const intel = await getCeIntelligence(ce.slug);

    const intelFacts = (intel?.facts ?? [])
      .slice(0, 80)
      .map(
        (f) =>
          `- [${f.id}] ${f.value} (${f.source}, conf ${f.confidence}${
            f.source_url ? `, ${f.source_url}` : ""
          })`,
      )
      .join("\n");

    const prompt = `You are repairing an evidence gap for Headout's visualization planner.

CE: ${ce.name} (${ce.city}, ${ce.country})
Question rejected: ${parsed.data.question}
Proposed chart type: ${parsed.data.archetype ?? "unknown"}
Original rejection reason: ${parsed.data.reason ?? "not provided"}

First inspect the DRD excerpt and CE Intelligence facts below. Then use Google Search to check official/operator pages, OTAs (Headout/GetYourGuide/Viator), review/forum sources (TripAdvisor/Reddit), and reputable travel sources for the exact missing evidence.

Return STRICT JSON only:
{
  "status": "found" | "partial" | "not_found",
  "recommended_archetype": "${parsed.data.archetype ?? ""}",
  "findings": ["source-backed fact, with numbers/names where possible"],
  "source_refs": ["source domain or URL"],
  "generation_context": "paste-ready source-backed context for chart generation, or empty string",
  "reason": "short explanation"
}

Rules:
- Do not make the chart source-backed if you only found generic or anecdotal evidence.
- If you find enough evidence for the chart, status="found".
- If you find only directional evidence, status="partial" and generation_context must say what remains estimated.
- If you still cannot find the missing data, status="not_found" and explain what source would be needed.
- Prefer multiple source types when possible. Do not rely only on the official site when the missing claim is about sentiment, queues, comparative value, or price dynamics.

CE Intelligence facts:
${intelFacts || "(none)"}

DRD excerpt:
"""
${(drd?.markdown ?? "").slice(0, 12000) || "(no DRD uploaded)"}
"""`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.25,
          maxOutputTokens: 4096,
          tools: [{ googleSearch: {} }],
        },
      });
      const raw = response.text ?? "{}";
      const json = safeJsonObject(raw);
      if (!json) throw new Error("Recheck returned invalid JSON");
      res.json(json);
    } catch (err) {
      req.log.error({ err }, "Evidence gap recheck failed");
      res.status(502).json({
        error:
          err instanceof Error
            ? `Evidence gap recheck failed: ${err.message}`
            : "Evidence gap recheck failed",
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
