import { ai } from "@workspace/integrations-gemini-ai";
import {
  CHART_ARCHETYPES,
  CROSS_CUTTING_QUESTIONS,
  getSubcategoryBankFlexible,
  type BankQuestion,
  type ChartArchetypeId,
} from "@workspace/question-bank";
import { aiChartSchema, type AiChart } from "./chart-spec";
import { ARCHETYPE_PROMPT } from "./chart-archetype-prompts";
import { openai } from "./openai";
import { logger } from "./logger";

const MODEL = "gemini-2.5-pro";
const VERIFIER_MODEL = "gpt-5.4";

export interface ResearchPipelineInput {
  ce: { name: string; city: string; country: string; slug: string };
  /**
   * Subcategory id. Known ids resolve to a curated bank; unknown ids are
   * accepted and bootstrapped as `unratified` (orchestrator runs with only
   * cross-cutting + DRD-derived hero questions).
   */
  subcategoryId: string;
  /** Optional human label/description for unknown long-tail subcategories. */
  subcategoryLabel?: string;
  subcategoryDescription?: string;
  drdMarkdown: string;
  /**
   * Optional writer-supplied topics that should be turned into hero
   * questions in addition to the curated bank.
   */
  writerTopics?: string[];
}

export interface ChartProvenance {
  status: "drd_grounded" | "web_grounded" | "estimated";
  drd_snippets: string[];
  web_sources: { title: string; url: string }[];
  estimates: { field: string; reasoning: string }[];
  verifier_notes: string;
}

export interface GeneratedChart {
  spec: AiChart;
  provenance: ChartProvenance;
}

export interface ResearchChart extends AiChart {
  recommended_archetype: ChartArchetypeId;
  source_question: string;
  provenance: ChartProvenance;
}

export interface ResearchPipelineResult {
  summary: string;
  emoji: string;
  charts: ResearchChart[];
  /** Any question-bank entries the LLM declined to use, with reasons. */
  dropped_questions: { question: string; reason: string }[];
  /** Hero questions the LLM proposed in addition to the curated bank. */
  proposed_hero_questions: BankQuestion[];
}

/* -------------------------------------------------------------------------- */
/* Step 1 — Adapt the question bank to the specific CE                        */
/* -------------------------------------------------------------------------- */

interface QuestionSelection {
  summary: string;
  emoji: string;
  selected: { question: string; archetype: ChartArchetypeId; rationale: string }[];
  dropped: { question: string; reason: string }[];
  proposed_hero: BankQuestion[];
}

async function selectQuestions(
  input: ResearchPipelineInput,
): Promise<QuestionSelection> {
  const bank = getSubcategoryBankFlexible(
    input.subcategoryId,
    input.subcategoryLabel,
    input.subcategoryDescription,
  );
  const baseQuestions: BankQuestion[] = [
    ...CROSS_CUTTING_QUESTIONS,
    ...bank.questions,
  ];

  const archetypeIds = Object.keys(CHART_ARCHETYPES) as ChartArchetypeId[];

  const writerTopics = (input.writerTopics ?? [])
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const prompt = `You are designing a Headout listing-page visualization deck.

CE: ${input.ce.name} (${input.ce.city}, ${input.ce.country})
Subcategory: ${bank.subcategory.label} — ${bank.subcategory.description}
${bank.unratified ? "(NOTE: this subcategory has no curated bank yet — bootstrap a draft set entirely from the DRD.)" : ""}

Below is the curated question bank for this subcategory. For EACH question, decide whether it applies to THIS CE based on the Deep Research Doc. If applies_when is set, the gate must be satisfied. Aim to keep 4-7 final questions total — drop the rest with a one-line reason.

Curated questions:
${JSON.stringify(baseQuestions, null, 2)}

Available chart archetypes (you may only use these ids): ${archetypeIds.join(", ")}

${writerTopics.length > 0 ? `Writer-supplied hero topics that MUST be turned into questions: ${writerTopics.join("; ")}` : ""}

After filtering, propose 1-2 ADDITIONAL hero questions that are uniquely tailored to this specific CE (e.g. a famous named room, a signature ride, a sunset slot) — anchored in the DRD, not invented. These go in proposed_hero[].

Also produce a 2-sentence visitor-facing summary of the CE and pick a single emoji.

Return JSON ONLY (no markdown), shape:
{
  "summary": "...",
  "emoji": "📍",
  "selected": [ { "question": "...", "archetype": "<one of the ids>", "rationale": "one line" }, ... ],
  "dropped":  [ { "question": "...", "reason": "one line" }, ... ],
  "proposed_hero": [ { "question": "...", "recommended_archetype": "...", "applies_when": "...", "notes": "..." }, ... ]
}

Rules:
- Selected questions must be unique by archetype (no two charts using the same archetype).
- Sentence case for all visitor-facing copy.
- Reference the CE by name in summary.

Deep Research Doc:
"""
${truncate(input.drdMarkdown, 16000)}
"""`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      temperature: 0.4,
      maxOutputTokens: 4096,
    },
  });

  const raw = response.text ?? "";
  if (!raw) throw new Error("Question selection returned empty response");

  const parsed = safeJson<QuestionSelection>(raw);
  if (!parsed) {
    throw new Error("Question selection produced invalid JSON");
  }
  if (!Array.isArray(parsed.selected) || parsed.selected.length === 0) {
    throw new Error("Question selection returned no charts");
  }

  // De-dupe archetypes deterministically: keep first occurrence.
  const seen = new Set<string>();
  parsed.selected = parsed.selected.filter((s) => {
    if (!archetypeIds.includes(s.archetype)) return false;
    if (seen.has(s.archetype)) return false;
    seen.add(s.archetype);
    return true;
  });

  parsed.proposed_hero = Array.isArray(parsed.proposed_hero)
    ? parsed.proposed_hero
    : [];
  parsed.dropped = Array.isArray(parsed.dropped) ? parsed.dropped : [];

  return parsed;
}

/* -------------------------------------------------------------------------- */
/* Step 2 — Generate one chart spec, grounded in the DRD + web search          */
/* -------------------------------------------------------------------------- */

export interface GeneratedChart {
  spec: AiChart;
  provenance: ChartProvenance;
}

export async function generateOneChart(
  input: ResearchPipelineInput,
  question: string,
  archetype: ChartArchetypeId,
): Promise<GeneratedChart> {
  const archetypeBlock = ARCHETYPE_PROMPT[archetype];

  const prompt = `Design a SINGLE chart that answers this visitor question for ${input.ce.name}.

Question: "${question}"
Required archetype: ${archetype}

Chart-spec schema for this archetype (fill EVERY required field exactly):
${archetypeBlock}

Grounding rules (very important):
1. PREFER numbers from the Deep Research Doc below. When you use a fact from the DRD, capture the exact phrase you used in provenance.drd_snippets.
2. If the DRD doesn't cover it AND you can ground it via Google Search, use the search result and capture the source URL in provenance.web_sources.
3. If neither covers it, produce an HONEST estimate a Headout local guide would broadly agree with — and explicitly list which fields you estimated in provenance.estimates with a one-line reasoning.
4. Set provenance.status to "drd_grounded" if every numeric field came from the DRD; "web_grounded" if at least one came from web search; "estimated" otherwise.
5. Do NOT invent specific weather scores, price scores, or visitor-mix percentages — leave optional fields blank rather than fabricate. Required fields can use estimates with reasoning.

Output STRICT JSON (no markdown), shape:
{
  "chart": {
    "slug": "kebab-case",
    "question": "${escape(question)}",
    "title": "2-5 word internal title, sentence case",
    "subtitle": "one short clarifying line, sentence case",
    "insight": "single most useful one-sentence takeaway, sentence case",
    "spec": { ...the archetype spec from above... }
  },
  "provenance": {
    "status": "drd_grounded" | "web_grounded" | "estimated",
    "drd_snippets": ["..."],
    "web_sources": [{ "title": "...", "url": "https://..." }],
    "estimates": [{ "field": "spec.days[3].score", "reasoning": "..." }],
    "verifier_notes": ""
  }
}

Today is ${new Date().toISOString().slice(0, 10)} (use as the start_date for month_calendar).

Deep Research Doc:
"""
${truncate(input.drdMarkdown, 14000)}
"""`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      temperature: 0.6,
      maxOutputTokens: 6144,
      // Gemini Google Search grounding tool — gives the model real-time web
      // access and surfaces grounding metadata we can mirror into provenance.
      tools: [{ googleSearch: {} }],
    },
  });

  const raw = response.text ?? "";
  if (!raw) throw new Error(`Chart generation returned empty for ${archetype}`);

  const parsed = safeJson<{ chart: unknown; provenance?: ChartProvenance }>(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Chart generation produced invalid JSON for ${archetype}`);
  }

  const chartParsed = aiChartSchema.safeParse(parsed.chart);
  if (!chartParsed.success) {
    // One retry with the validation error fed back, mirroring generate-ce.ts.
    const issues = chartParsed.error.issues
      .slice(0, 6)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    const retryPrompt = `${prompt}\n\nThe previous response was invalid: ${issues}\n\nRegenerate the FULL JSON, fixing the issues. Output ONLY the JSON object.`;
    const retry = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: retryPrompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.4,
        maxOutputTokens: 6144,
        tools: [{ googleSearch: {} }],
      },
    });
    const retryRaw = retry.text ?? "";
    const retryParsed = safeJson<{ chart: unknown; provenance?: ChartProvenance }>(
      retryRaw,
    );
    const retryChart = retryParsed
      ? aiChartSchema.safeParse(retryParsed.chart)
      : null;
    if (!retryChart || !retryChart.success) {
      throw new Error(
        `Chart generation failed schema for ${archetype}: ${issues}`,
      );
    }
    return {
      spec: retryChart.data,
      // IMPORTANT: pull grounding metadata from the RETRY response (which
      // produced the spec we're keeping), not the original failed response.
      provenance: normalizeProvenance(retryParsed?.provenance, retry),
    };
  }

  return {
    spec: chartParsed.data,
    provenance: normalizeProvenance(parsed.provenance, response),
  };
}

function normalizeProvenance(
  raw: ChartProvenance | undefined,
  geminiResponse: unknown,
): ChartProvenance {
  const out: ChartProvenance = {
    status: raw?.status ?? "estimated",
    drd_snippets: Array.isArray(raw?.drd_snippets) ? raw!.drd_snippets : [],
    web_sources: Array.isArray(raw?.web_sources) ? raw!.web_sources : [],
    estimates: Array.isArray(raw?.estimates) ? raw!.estimates : [],
    verifier_notes: typeof raw?.verifier_notes === "string" ? raw!.verifier_notes : "",
  };

  // Pull any Google-search grounding sources Gemini surfaced on the response
  // and merge them into web_sources so writers can see the real citations.
  const grounded = extractGroundingSources(geminiResponse);
  for (const g of grounded) {
    if (!out.web_sources.find((s) => s.url === g.url)) {
      out.web_sources.push(g);
    }
  }
  if (out.web_sources.length > 0 && out.status === "estimated") {
    out.status = "web_grounded";
  }
  return out;
}

interface GroundingChunk {
  web?: { uri?: string; title?: string };
}

function extractGroundingSources(
  resp: unknown,
): { title: string; url: string }[] {
  // Gemini SDK shape: response.candidates[0].groundingMetadata.groundingChunks[]
  // Defensive walk — schema occasionally shifts across SDK versions.
  const candidates = (resp as { candidates?: unknown[] } | undefined)
    ?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  const meta = (candidates[0] as { groundingMetadata?: unknown })
    ?.groundingMetadata;
  const chunks = (meta as { groundingChunks?: unknown[] } | undefined)
    ?.groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const out: { title: string; url: string }[] = [];
  for (const c of chunks as GroundingChunk[]) {
    if (c?.web?.uri) {
      out.push({
        title: c.web.title ?? c.web.uri,
        url: c.web.uri,
      });
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Step 3 — OpenAI verification pass                                           */
/* -------------------------------------------------------------------------- */

export interface VerifierStructuredResult {
  verified: boolean;
  issues: string[];
  suggestions: string[];
  /**
   * Optional full chart-spec the verifier proposes as a fix. The route
   * layer must re-validate this with `chartSpecSchema` before persisting
   * — the verifier is encouraged to produce one when it can but is not
   * required to.
   */
  suggestedSpec: unknown | null;
  verifier_notes: string;
}

/**
 * Like `verifyChart`, but returns the structured verifier output instead of
 * collapsing it into a single string. Used by the on-demand verify endpoint
 * so the UI can render issues/suggestions cleanly and offer an "apply
 * suggested spec" action.
 */
export async function verifyChartStructured(
  input: ResearchPipelineInput,
  chart: AiChart,
): Promise<VerifierStructuredResult> {
  if (!openai) {
    return {
      verified: true,
      issues: [],
      suggestions: [],
      suggestedSpec: null,
      verifier_notes: "skipped: openai not configured",
    };
  }

  // Fresh web check (Step 3a). Before handing the chart to the OpenAI
  // verifier, ask Gemini with `googleSearch` enabled to surface live
  // findings about the question for THIS CE — what current operator
  // pages, recent reviews, and ticketing sites say. This catches
  // staleness the DRD alone would miss (e.g. a price changed last
  // month, a closure was added, hours shifted). Soft-fails on any
  // error so the verifier still runs.
  let webFindings = "(no fresh web findings — google search unavailable)";
  try {
    const findingsResp = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Search the live web for the most current information about this question for ${input.ce.name} (${input.ce.city}, ${input.ce.country}):

Question: "${chart.question}"

Return 3-6 short bullet points of CURRENT facts you found (with the source domain in parentheses). Focus on numbers, prices, hours, closures, or seasonal patterns that would be relevant to fact-checking a chart answering this question. Do NOT speculate — only report what you actually found via search. If search returned nothing useful, say so.

Today is ${new Date().toISOString().slice(0, 10)}.`,
            },
          ],
        },
      ],
      config: {
        temperature: 0.2,
        maxOutputTokens: 1024,
        tools: [{ googleSearch: {} }],
      },
    });
    const text = findingsResp.text?.trim();
    if (text) webFindings = text;
  } catch (err) {
    logger.warn(
      { err, slug: input.ce.slug },
      "Fresh-web pre-check failed; falling back to DRD-only verify",
    );
  }

  const prompt = `You are verifying a single Headout chart spec against a Deep Research Doc AND fresh web findings.

CE: ${input.ce.name} (${input.ce.city}, ${input.ce.country})
Question being answered: ${chart.question}

The chart spec (JSON):
${JSON.stringify(chart.spec)}

Cross-reference the spec against BOTH sources below. Look for any data points that CONTRADICT either the DRD or the fresh web findings, OR that are clearly wrong for this CE. Be strict but pragmatic — small rounding is fine, factual contradictions and stale numbers are not. If the fresh web findings disagree with the DRD on a numeric fact, prefer the fresh findings.

If you find at least one issue AND can confidently propose a corrected version, set "suggested_spec" to a FULL replacement spec object (same "type" as the original). The replacement must be complete and self-contained — the writer will be able to apply it with one click. If you can't confidently fix it, set "suggested_spec" to null.

Return JSON ONLY:
{
  "verified": true | false,
  "issues": ["one line per problem found"],
  "suggestions": ["one line per fix recommendation"],
  "suggested_spec": null | { "type": "${chart.spec.type}", ... }
}

Fresh web findings (Gemini + googleSearch, ${new Date().toISOString().slice(0, 10)}):
"""
${truncate(webFindings, 4000)}
"""

Deep Research Doc:
"""
${truncate(input.drdMarkdown, 12000)}
"""`;

  try {
    const response = await openai.chat.completions.create({
      model: VERIFIER_MODEL,
      max_completion_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const text = response.choices[0]?.message?.content ?? "{}";
    const parsed = safeJson<{
      verified?: boolean;
      issues?: string[];
      suggestions?: string[];
      suggested_spec?: unknown;
    }>(text);
    const issues = parsed?.issues ?? [];
    const suggestions = parsed?.suggestions ?? [];
    const verified = !!parsed?.verified && issues.length === 0;
    const notes = verified
      ? "verifier: ok"
      : `verifier: ${issues.length} issue(s)` +
        (issues.length > 0 ? ` — ${issues.join(" | ")}` : "") +
        (suggestions.length > 0
          ? ` | suggestions: ${suggestions.join(" | ")}`
          : "");
    return {
      verified,
      issues,
      suggestions,
      suggestedSpec: parsed?.suggested_spec ?? null,
      verifier_notes: notes,
    };
  } catch (err) {
    logger.warn({ err }, "OpenAI verifier (structured) failed");
    return {
      verified: false,
      issues: [],
      suggestions: [],
      suggestedSpec: null,
      verifier_notes: `verifier failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}

export async function verifyChart(
  input: ResearchPipelineInput,
  chart: AiChart,
  provenance: ChartProvenance,
): Promise<ChartProvenance> {
  if (!openai) {
    return { ...provenance, verifier_notes: "skipped: openai not configured" };
  }

  const prompt = `You are verifying a single Headout chart spec against a Deep Research Doc.

CE: ${input.ce.name} (${input.ce.city}, ${input.ce.country})
Question being answered: ${chart.question}

The chart spec (JSON):
${JSON.stringify(chart.spec)}

Author's provenance claims:
${JSON.stringify(provenance)}

Re-read the DRD below. Look for any data points in the spec that CONTRADICT the DRD or that are claimed as "drd_grounded" but are not actually supported. Be strict but pragmatic — small rounding is fine, factual contradictions are not.

Return JSON ONLY:
{
  "verified": true | false,
  "issues": ["one line per problem found"],
  "suggestions": ["one line per fix recommendation"]
}

Deep Research Doc:
"""
${truncate(input.drdMarkdown, 14000)}
"""`;

  try {
    const response = await openai.chat.completions.create({
      model: VERIFIER_MODEL,
      max_completion_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const text = response.choices[0]?.message?.content ?? "{}";
    const parsed = safeJson<{
      verified?: boolean;
      issues?: string[];
      suggestions?: string[];
    }>(text);
    const issues = parsed?.issues ?? [];
    const suggestions = parsed?.suggestions ?? [];
    const summary =
      parsed?.verified && issues.length === 0
        ? "verifier: ok"
        : `verifier: ${issues.length} issue(s)` +
          (issues.length > 0 ? ` — ${issues.join(" | ")}` : "") +
          (suggestions.length > 0
            ? ` | suggestions: ${suggestions.join(" | ")}`
            : "");
    return { ...provenance, verifier_notes: summary };
  } catch (err) {
    logger.warn({ err }, "OpenAI verifier failed; continuing without it");
    return {
      ...provenance,
      verifier_notes: `verifier failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Orchestrator                                                                */
/* -------------------------------------------------------------------------- */

export async function runResearchPipeline(
  input: ResearchPipelineInput,
): Promise<ResearchPipelineResult> {
  if (!input.drdMarkdown.trim()) {
    throw new Error("DRD is empty — upload one before running the pipeline.");
  }

  logger.info(
    { slug: input.ce.slug, subcategory: input.subcategoryId },
    "Research pipeline: selecting questions",
  );
  const selection = await selectQuestions(input);

  const charts: ResearchChart[] = [];
  for (const sel of selection.selected) {
    try {
      logger.info(
        { slug: input.ce.slug, archetype: sel.archetype, question: sel.question },
        "Research pipeline: generating chart",
      );
      const generated = await generateOneChart(
        input,
        sel.question,
        sel.archetype,
      );
      const provenance = await verifyChart(
        input,
        generated.spec,
        generated.provenance,
      );
      charts.push({
        ...generated.spec,
        recommended_archetype: sel.archetype,
        source_question: sel.question,
        provenance,
      });
    } catch (err) {
      logger.warn(
        { err, archetype: sel.archetype },
        "Research pipeline: skipping chart due to generation error",
      );
    }
  }

  if (charts.length === 0) {
    throw new Error(
      "Research pipeline produced zero valid charts. Check DRD content and try again.",
    );
  }

  // De-dupe slugs deterministically (rare but possible across charts).
  const seenSlugs = new Set<string>();
  for (const c of charts) {
    if (seenSlugs.has(c.slug)) {
      c.slug = `${c.slug}-${c.recommended_archetype}`;
    }
    seenSlugs.add(c.slug);
  }

  return {
    summary: selection.summary || `${input.ce.name} — research-grounded deck.`,
    emoji: selection.emoji || "📍",
    charts,
    dropped_questions: selection.dropped,
    proposed_hero_questions: selection.proposed_hero,
  };
}

/**
 * Regenerate a SINGLE chart in place. Used by the per-chart regenerate
 * action in the Triage page. Reuses the same per-archetype prompt + DRD
 * grounding + OpenAI verifier as the full pipeline so the result is
 * comparable in quality.
 */
export async function regenerateSingleChart(args: {
  ce: { name: string; city: string; country: string; slug: string };
  question: string;
  archetype: ChartArchetypeId;
  drdMarkdown: string;
}): Promise<{ chart: AiChart; provenance: ChartProvenance }> {
  const input: ResearchPipelineInput = {
    ce: args.ce,
    subcategoryId: "single_chart_regen",
    drdMarkdown: args.drdMarkdown,
  };
  const generated = await generateOneChart(input, args.question, args.archetype);
  const provenance = await verifyChart(input, generated.spec, generated.provenance);
  return { chart: generated.spec, provenance };
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + "\n\n…[truncated]";
}

function escape(s: string): string {
  return s.replace(/"/g, '\\"');
}

function safeJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    // Try to recover from accidentally fenced output.
    const fence = text.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (fence?.[1]) {
      try {
        return JSON.parse(fence[1]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
