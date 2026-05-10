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
import {
  buildCeVisualizationPlan,
  scoreEditorialForIdea,
  type CeVisualizationPlan,
  type PlannerVisualization,
  type RejectedVisualization,
} from "../lib/ce-visualization-planner";
import {
  deriveMissingEvidenceQueries,
  type MissingEvidenceBucket,
} from "../lib/editorial-verdict";
import { CHART_ARCHETYPES } from "@workspace/question-bank";
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

    const intelFactsBlock = (intel?.facts ?? [])
      .slice(0, 80)
      .map(
        (f) =>
          `- [${f.id}] ${f.value} (${f.source}, conf ${f.confidence}${
            f.source_url ? `, ${f.source_url}` : ""
          })`,
      )
      .join("\n");

    // 1) Derive 1-3 missing-evidence buckets from the rejection reason +
    //    the archetype's data_shape (so vague rejections still get useful
    //    queries). All deterministic — no model call needed yet.
    const archetypeMeta =
      parsed.data.archetype && parsed.data.archetype in CHART_ARCHETYPES
        ? CHART_ARCHETYPES[
            parsed.data.archetype as keyof typeof CHART_ARCHETYPES
          ]
        : undefined;

    const buckets = deriveMissingEvidenceQueries({
      ceName: ce.name,
      rejectionReason: parsed.data.reason ?? "",
      question: parsed.data.question,
      dataShape: archetypeMeta?.data_shape ?? [],
      cap: 3,
    });

    // 2) Fan out one Gemini-with-googleSearch call per bucket. Each call is
    //    isolated so a single failure or thin result doesn't poison the
    //    others — failed buckets just contribute zero findings.
    const perBucketResults = await Promise.all(
      buckets.map((bucket) =>
        runMissingEvidenceQuery({
          ce: { name: ce.name, city: ce.city, country: ce.country },
          question: parsed.data.question,
          archetype: parsed.data.archetype,
          rejectionReason: parsed.data.reason ?? "",
          drdMarkdown: drd?.markdown ?? "",
          intelFactsBlock,
          bucket,
        }).catch((err) => {
          req.log.warn(
            { err, bucket: bucket.bucket },
            "Missing-evidence query bucket failed",
          );
          return {
            bucket,
            findings: [] as string[],
            source_refs: [] as string[],
            generation_context: "",
            status: "not_found" as const,
          };
        }),
      ),
    );

    // 3) Merge findings + source_refs across buckets, dedupe.
    const findings: string[] = [];
    const sourceRefs: string[] = [];
    const generationContextParts: string[] = [];
    const seenFinding = new Set<string>();
    const seenSource = new Set<string>();
    for (const r of perBucketResults) {
      for (const f of r.findings) {
        const key = f.trim().toLowerCase();
        if (key && !seenFinding.has(key)) {
          seenFinding.add(key);
          findings.push(f.trim());
        }
      }
      for (const s of r.source_refs) {
        const key = s.trim().toLowerCase();
        if (key && !seenSource.has(key)) {
          seenSource.add(key);
          sourceRefs.push(s.trim());
        }
      }
      if (r.generation_context && r.generation_context.trim()) {
        generationContextParts.push(r.generation_context.trim());
      }
    }

    // Aggregate status: found if any bucket found, partial if any partial,
    // else not_found. This drives the UI's promote/keep/cut decision
    // alongside the editorial verdict.
    const statuses = perBucketResults.map((r) => r.status);
    const aggregateStatus: "found" | "partial" | "not_found" =
      statuses.includes("found")
        ? "found"
        : statuses.includes("partial")
          ? "partial"
          : "not_found";

    // 4) Re-score the rejected idea editorially given the merged evidence.
    //    The verdict is computed deterministically from the five judgements.
    let editorialBlock: Awaited<ReturnType<typeof scoreEditorialForIdea>> | null =
      null;
    try {
      editorialBlock = await scoreEditorialForIdea({
        ce: { name: ce.name, city: ce.city, country: ce.country },
        question: parsed.data.question,
        archetype: parsed.data.archetype,
        rejectionReason: parsed.data.reason ?? "",
        drdMarkdown: drd?.markdown ?? "",
        intelFactsBlock,
        recheckFindings: findings,
        sourceRefs,
      });
    } catch (err) {
      req.log.warn(
        { err },
        "Editorial re-scoring failed; returning recheck without verdict",
      );
    }

    // 5) Persist the recheck outcome into the saved visualization plan
    //    so a panel reload (or a different writer landing on this CE)
    //    immediately sees the promotion / updated reason / new editorial
    //    judgements. Local React state is not enough — the plan is the
    //    source of truth.
    const summaryReason =
      findings.length > 0
        ? `Targeted recheck across ${perBucketResults.length} bucket(s) returned ${findings.length} finding(s).`
        : "Targeted recheck returned no new evidence.";

    let updatedPlan: CeVisualizationPlan | null = null;
    const savedPlan = (intel as unknown as { visualizationPlan?: unknown })
      ?.visualizationPlan as CeVisualizationPlan | undefined;

    if (savedPlan && editorialBlock) {
      try {
        updatedPlan = mutatePlanForRecheck({
          plan: savedPlan,
          question: parsed.data.question,
          archetype: parsed.data.archetype,
          editorial: editorialBlock,
          findings,
          sourceRefs,
          generationContext: generationContextParts.join("\n\n"),
          aggregateStatus,
          summaryReason,
        });
        if (updatedPlan) {
          await saveCeVisualizationPlan(ce.slug, updatedPlan);
        }
      } catch (err) {
        req.log.warn(
          { err },
          "Failed to persist recheck mutation onto plan; returning recheck without persistence",
        );
        updatedPlan = null;
      }
    }

    res.json({
      status: aggregateStatus,
      recommended_archetype: parsed.data.archetype ?? "",
      findings,
      source_refs: sourceRefs,
      generation_context: generationContextParts.join("\n\n"),
      reason: summaryReason,
      buckets: buckets.map((b) => ({
        bucket: b.bucket,
        query: b.query,
        description: b.description,
      })),
      editorial: editorialBlock?.judgements ?? null,
      editorial_verdict: editorialBlock?.editorial_verdict ?? null,
      plan: updatedPlan,
    });
  },
);

/**
 * Apply the recheck outcome to the saved plan in place and return the
 * mutated plan. Behaviour:
 *
 *   - ship/hold → remove from `rejected_visualizations`, append to
 *     `recommended_visualizations` with `promoted_from_rejected: true`,
 *     priority bumped past the existing tail, editorial judgements
 *     attached, recheck findings/status snapshotted.
 *   - cut       → keep in `rejected_visualizations` but overwrite the
 *     entry's `editorial`, `editorial_verdict`, `reason`, and snapshot
 *     `recheck_findings`/`recheck_status` so the card surfaces the
 *     stronger rationale on next load.
 *
 * Returns null when the question is no longer in the rejected list (e.g.
 * the writer already removed it) — in that case nothing is persisted.
 */
function mutatePlanForRecheck(args: {
  plan: CeVisualizationPlan;
  question: string;
  archetype?: string;
  editorial: { judgements: import("../lib/editorial-verdict").EditorialJudgements; editorial_verdict: import("../lib/editorial-verdict").EditorialVerdict };
  findings: string[];
  sourceRefs: string[];
  generationContext: string;
  aggregateStatus: "found" | "partial" | "not_found";
  summaryReason: string;
}): CeVisualizationPlan | null {
  const { plan, question, editorial, findings, sourceRefs } = args;
  const rejectedIdx = plan.rejected_visualizations.findIndex(
    (r) => r.question === question,
  );
  if (rejectedIdx < 0) return null;
  const rejected: RejectedVisualization = plan.rejected_visualizations[rejectedIdx]!;

  if (
    editorial.editorial_verdict === "ship" ||
    editorial.editorial_verdict === "hold"
  ) {
    const archetype =
      (rejected.archetype ??
        (args.archetype as PlannerVisualization["archetype"] | undefined)) as
        | PlannerVisualization["archetype"]
        | undefined;
    if (!archetype) return null;

    const maxPriority = plan.recommended_visualizations.reduce(
      (m, v) => Math.max(m, v.priority ?? 0),
      0,
    );

    const promoted: PlannerVisualization = {
      question: rejected.question,
      archetype,
      why_it_matters:
        args.generationContext.trim() ||
        "Promoted by recheck — review evidence before saving.",
      data_needed: [],
      evidence_refs: sourceRefs,
      quality_score: {
        traveler_usefulness: 0,
        evidence_strength: args.aggregateStatus === "found" ? 80 : 60,
        uniqueness: 0,
        visual_fit: 0,
        ce_specificity: 0,
        cms_value: 0,
        verifier_risk: 0,
        overall: 0,
        label: "recommended",
        rationale: `Promoted by recheck (${editorial.editorial_verdict}).`,
        editorial: editorial.judgements,
        editorial_verdict: editorial.editorial_verdict,
      },
      priority: maxPriority + 1,
      promoted_from_rejected: true,
      recheck_findings: findings,
      recheck_status: args.aggregateStatus,
    };

    plan.recommended_visualizations.push(promoted);
    plan.rejected_visualizations.splice(rejectedIdx, 1);
    return plan;
  }

  // cut: update the rejected entry in place — verdict + reason + findings.
  const newReason = [
    rejected.reason,
    `Recheck verdict: ${editorial.editorial_verdict}. ${args.summaryReason}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  plan.rejected_visualizations[rejectedIdx] = {
    ...rejected,
    reason: newReason,
    editorial: editorial.judgements,
    editorial_verdict: editorial.editorial_verdict,
    recheck_findings: findings,
    recheck_status: args.aggregateStatus,
  };
  return plan;
}

interface BucketResult {
  bucket: MissingEvidenceBucket;
  findings: string[];
  source_refs: string[];
  generation_context: string;
  status: "found" | "partial" | "not_found";
}

async function runMissingEvidenceQuery(args: {
  ce: { name: string; city: string; country: string };
  question: string;
  archetype?: string;
  rejectionReason: string;
  drdMarkdown: string;
  intelFactsBlock: string;
  bucket: MissingEvidenceBucket;
}): Promise<BucketResult> {
  const prompt = `You are filling a single, specific evidence gap for Headout's visualization planner.

CE: ${args.ce.name} (${args.ce.city}, ${args.ce.country})
Original question being researched: ${args.question}
Proposed chart type: ${args.archetype ?? "unknown"}
Original rejection reason: ${args.rejectionReason || "(not provided)"}

THIS RESEARCH PASS targets ONE bucket only:
- bucket: ${args.bucket.bucket}
- focus: ${args.bucket.description}
- search query to start with: ${args.bucket.query}

Use Google Search to check official/operator pages, OTAs (Headout/GetYourGuide/Viator), review/forum sources (TripAdvisor/Reddit), and reputable travel sources for THIS bucket only. Do not drift into other topics — they are handled by separate passes.

Return STRICT JSON only:
{
  "status": "found" | "partial" | "not_found",
  "findings": ["source-backed fact specific to the bucket above, with numbers/names where possible"],
  "source_refs": ["source domain or URL"],
  "generation_context": "paste-ready source-backed context for chart generation, or empty string"
}

Rules:
- Only return findings that materially help fill THIS bucket. Generic descriptions of the CE do not count.
- If you find enough evidence to source the chart's bucket, status="found".
- If you find only directional evidence, status="partial" and generation_context must say what remains estimated.
- If you still cannot find the missing data, status="not_found".

CE Intelligence facts:
${args.intelFactsBlock || "(none)"}

DRD excerpt:
"""
${(args.drdMarkdown ?? "").slice(0, 8000) || "(no DRD uploaded)"}
"""`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-pro",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: 0.25,
      maxOutputTokens: 2048,
      tools: [{ googleSearch: {} }],
    },
  });
  const raw = response.text ?? "{}";
  const json = safeJsonObject(raw);
  if (!json) {
    return {
      bucket: args.bucket,
      findings: [],
      source_refs: [],
      generation_context: "",
      status: "not_found",
    };
  }

  // Merge any URLs surfaced by the model's grounding metadata into source_refs.
  const groundingUrls: string[] = [];
  const candidates = (
    response as unknown as {
      candidates?: {
        groundingMetadata?: {
          groundingChunks?: Array<{ web?: { uri?: string } }>;
        };
      }[];
    }
  ).candidates;
  const chunks = candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  for (const c of chunks) {
    const uri = c.web?.uri;
    if (uri) groundingUrls.push(uri);
  }

  const findings = Array.isArray(json["findings"])
    ? (json["findings"] as unknown[]).map((s) => String(s)).filter(Boolean)
    : [];
  const refsFromModel = Array.isArray(json["source_refs"])
    ? (json["source_refs"] as unknown[]).map((s) => String(s)).filter(Boolean)
    : [];
  const allRefs = [...refsFromModel, ...groundingUrls];

  const rawStatus = String(json["status"] ?? "not_found").toLowerCase();
  const status: "found" | "partial" | "not_found" =
    rawStatus === "found"
      ? "found"
      : rawStatus === "partial"
        ? "partial"
        : "not_found";

  return {
    bucket: args.bucket,
    findings,
    source_refs: allRefs,
    generation_context: String(json["generation_context"] ?? ""),
    status,
  };
}

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
