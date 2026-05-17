import { ai } from "@workspace/integrations-gemini-ai";
import {
  CHART_ARCHETYPES,
  isImplementedArchetype,
  type ChartArchetypeId,
} from "@workspace/question-bank";
import { logger } from "./logger";

const MODEL = "gemini-2.5-pro";

export type FeasibilityVerdictKind = "ready" | "needs_more" | "out_of_scope";

export interface FeasibilityMissingDatum {
  label: string;
  hint?: string;
}

export interface FeasibilityWebSource {
  title: string;
  url: string;
}

export interface FeasibilityDuplicate {
  chartId: number;
  chartSlug: string;
  chartTitle: string;
  chartType: string;
  matchType: "archetype_intent" | "archetype_fuzzy" | "question_only";
  similarity: number;
  reason: string;
  mergeAllowed: boolean;
}

export interface FeasibilityVerdict {
  verdict: FeasibilityVerdictKind;
  topic: string;
  question?: string;
  archetype?: ChartArchetypeId;
  rationale: string;
  missing_data: FeasibilityMissingDatum[];
  drd_snippets: string[];
  web_sources: FeasibilityWebSource[];
  generated_chart_id?: number;
  /**
   * Populated server-side by the ideation/feasibility route when the
   * proposed topic + recommended archetype matches an existing chart on
   * the same CE. The UI uses this to render a "Looks like a duplicate"
   * banner with Open / Merge / Create-anyway actions.
   */
  duplicate_of?: FeasibilityDuplicate;
}

export interface FeasibilityInput {
  ce: { name: string; city: string; country: string; slug: string };
  topic: string;
  drdMarkdown: string;
  /** One-shot pasted/PDF context. Folded into the research call, not stored. */
  extraContext?: string;
  /** Existing chart questions, so the assistant can avoid duplicate proposals. */
  existingCharts: { question: string; chartType: string }[];
}

function safeJson<T>(raw: string): T | null {
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
  const candidate = fenced?.[1]?.trim() ?? raw.trim();
  try {
    return JSON.parse(candidate) as T;
  } catch {
    // Try to find the first {…} blob
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

/**
 * Run a topic feasibility check: ground the topic in the DRD + a fresh
 * googleSearch pass, then produce a structured verdict. Mirrors the
 * two-call grounded-JSON pattern used by `generateOneChart` — research
 * step uses tools, spec step is strict JSON.
 */
export async function checkTopicFeasibility(
  input: FeasibilityInput,
): Promise<FeasibilityVerdict> {
  const ceLine = `${input.ce.name} (${input.ce.city}, ${input.ce.country})`;
  const archetypeMenu = Object.values(CHART_ARCHETYPES)
    .filter((a) => isImplementedArchetype(a.id))
    .map((a) => `- ${a.id}: ${a.label} — ${a.answers}`)
    .join("\n");
  const drdBlock = truncate(input.drdMarkdown ?? "", 12_000);
  const existingBlock =
    input.existingCharts.length > 0
      ? input.existingCharts
          .map((c) => `- ${c.chartType}: ${c.question}`)
          .join("\n")
      : "(none)";
  const extraBlock = input.extraContext?.trim()
    ? `\n\nOne-shot writer context for THIS topic only:\n"""\n${truncate(
        input.extraContext,
        20_000,
      )}\n"""`
    : "";

  const researchPrompt = `A Headout writer wants to add a chart on the topic below to the listing page for ${ceLine}.

Topic: "${input.topic}"

Use Google Search to surface CURRENT facts that would let us answer the topic with a confident data visualization. Look for the concrete numbers the chart would need (e.g. weekly/hourly crowd patterns, monthly seasonality, lead-time distributions, ticket tiers, wait-time-by-entrance, durations, etc.).

Return a SHORT research brief (6-12 bullets) of CURRENT facts you actually grounded. Format each line as:
- <fact, with the specific number/day/hour> (source domain)

If a fact category is missing entirely, say so explicitly with "MISSING: <what you couldn't find>" so the next step knows to flag it as required input from the writer.

Deep Research Doc (context only — note which parts of the topic the DRD already covers):
"""
${drdBlock}
"""${extraBlock}`;

  let researchBrief = "";
  let researchResponse: unknown = null;
  try {
    const r = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: researchPrompt }] }],
      config: {
        temperature: 0.4,
        maxOutputTokens: 2048,
        tools: [{ googleSearch: {} }],
      },
    });
    researchBrief = (r.text ?? "").trim();
    researchResponse = r;
  } catch (err) {
    logger.warn(
      { err, slug: input.ce.slug },
      "feasibility research step failed; falling back to DRD-only",
    );
  }

  const specPrompt = `You are deciding whether a Headout writer's proposed chart topic can be supported by available evidence for ${ceLine}.

Topic: "${input.topic}"

Available archetypes (you MUST pick one of these ids when proposing a chart):
${archetypeMenu}

Existing chart deck for this CE (avoid duplicates — if the topic substantially overlaps an existing chart, say so in rationale):
${existingBlock}

Output STRICT JSON (no markdown, no commentary), shape:
{
  "verdict": "ready" | "needs_more" | "out_of_scope",
  "topic": "the writer's topic, normalised, sentence case",
  "question": "the visitor-facing question this chart would answer (sentence case, ≤ 100 chars)",
  "archetype": "<one archetype id from the list above>",
  "rationale": "one or two sentences explaining the verdict",
  "missing_data": [
    { "label": "concise data point title", "hint": "where the writer might find it" }
  ],
  "drd_snippets": ["short exact phrase from the DRD that supports this topic", ...],
  "web_sources": [{ "title": "...", "url": "https://..." }]
}

Rules:
- "ready" — the DRD AND/OR the live web findings clearly cover every data point needed for the chosen archetype. Leave missing_data as []. Web sources should list the URLs/domains you actually grounded.
- "needs_more" — the topic is in-scope but at least one critical data point is missing. List EACH missing item as a separate concise object in missing_data with a helpful hint (e.g. "Hourly visitor counts per weekday — try the operator's Popular Times snapshot or recent TripAdvisor wait reports"). Still pick an archetype + question so the writer sees the proposed shape.
- "out_of_scope" — the topic doesn't fit any implemented archetype, or it's not really about THIS CE, or it would invent data that no source could ground. Set archetype/question to "" and explain in rationale.
- NEVER fabricate web_sources or drd_snippets. If you didn't ground something, leave the array empty.
- Sentence case throughout. Keep rationale ≤ 280 chars.

Live Web Findings (from a fresh google search — treat as authoritative for any fact the DRD doesn't cover):
"""
${researchBrief || "(no live findings — judge from the DRD only)"}
"""

Deep Research Doc:
"""
${drdBlock}
"""${extraBlock}`;

  const specResp = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: specPrompt }] }],
    config: {
      responseMimeType: "application/json",
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  });
  const raw = specResp.text ?? "";
  const parsed = safeJson<{
    verdict?: string;
    topic?: string;
    question?: string;
    archetype?: string;
    rationale?: string;
    missing_data?: { label?: string; hint?: string }[];
    drd_snippets?: string[];
    web_sources?: { title?: string; url?: string }[];
  }>(raw);
  if (!parsed) {
    throw new Error("Feasibility check returned invalid JSON");
  }

  const verdictRaw = (parsed.verdict ?? "").toLowerCase();
  const verdict: FeasibilityVerdictKind =
    verdictRaw === "ready" || verdictRaw === "needs_more" || verdictRaw === "out_of_scope"
      ? (verdictRaw as FeasibilityVerdictKind)
      : "needs_more";

  const archetypeRaw = (parsed.archetype ?? "").trim();
  const archetype =
    archetypeRaw &&
    archetypeRaw in CHART_ARCHETYPES &&
    isImplementedArchetype(archetypeRaw as ChartArchetypeId)
      ? (archetypeRaw as ChartArchetypeId)
      : undefined;

  // Merge any grounding URLs from the research response's groundingMetadata
  // into web_sources so we never lose actual citations the model used.
  const webSources: FeasibilityWebSource[] = [];
  const seenUrls = new Set<string>();
  for (const s of parsed.web_sources ?? []) {
    if (!s?.url || !s.title) continue;
    if (seenUrls.has(s.url)) continue;
    seenUrls.add(s.url);
    webSources.push({ title: String(s.title).slice(0, 240), url: String(s.url) });
  }
  try {
    const candidates =
      (researchResponse as { candidates?: Array<{ groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> } }> })
        ?.candidates ?? [];
    for (const c of candidates) {
      const chunks = c.groundingMetadata?.groundingChunks ?? [];
      for (const chunk of chunks) {
        const url = chunk.web?.uri;
        if (!url || seenUrls.has(url)) continue;
        seenUrls.add(url);
        webSources.push({
          title: chunk.web?.title?.slice(0, 240) ?? url,
          url,
        });
      }
    }
  } catch {
    // grounding metadata is best-effort
  }

  return {
    verdict,
    topic: parsed.topic?.trim() || input.topic,
    ...(parsed.question?.trim()
      ? { question: parsed.question.trim().slice(0, 200) }
      : {}),
    ...(archetype ? { archetype } : {}),
    rationale:
      parsed.rationale?.trim() ||
      (verdict === "ready"
        ? "Sufficient evidence available."
        : verdict === "out_of_scope"
          ? "Topic does not fit an implemented archetype."
          : "More evidence needed."),
    missing_data: Array.isArray(parsed.missing_data)
      ? parsed.missing_data
          .filter((m): m is { label: string; hint?: string } =>
            Boolean(m?.label),
          )
          .slice(0, 8)
          .map((m) => ({
            label: String(m.label).slice(0, 200),
            ...(m.hint ? { hint: String(m.hint).slice(0, 280) } : {}),
          }))
      : [],
    drd_snippets: Array.isArray(parsed.drd_snippets)
      ? parsed.drd_snippets
          .filter((s): s is string => typeof s === "string" && !!s.trim())
          .slice(0, 6)
          .map((s) => s.slice(0, 280))
      : [],
    web_sources: webSources.slice(0, 6),
  };
}

/**
 * Render the feasibility verdict as a markdown summary for the
 * transcript's `content` field. The structured payload lives in
 * `feasibility` jsonb — this string is purely the human-readable
 * fallback for older clients (and for transcript scrollback).
 */
export function formatVerdictForTranscript(v: FeasibilityVerdict): string {
  const header =
    v.verdict === "ready"
      ? "✅ Ready to generate"
      : v.verdict === "needs_more"
        ? "📥 Needs more data"
        : "🚫 Out of scope";
  const lines = [`**${header}** — ${v.rationale}`];
  if (v.question) lines.push(`Visitor question: ${v.question}`);
  if (v.archetype) lines.push(`Recommended chart: ${v.archetype}`);
  if (v.missing_data.length > 0) {
    lines.push("");
    lines.push("Missing data points:");
    for (const m of v.missing_data) {
      lines.push(`- ${m.label}${m.hint ? ` — ${m.hint}` : ""}`);
    }
  }
  return lines.join("\n");
}
