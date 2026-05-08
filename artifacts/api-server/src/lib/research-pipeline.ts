import { ai } from "@workspace/integrations-gemini-ai";
import {
  CHART_ARCHETYPES,
  STANDARD_QUESTIONS,
  getSubcategoryBankFlexible,
  isImplementedArchetype,
  type BankQuestion,
  type BankQuestionKind,
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
  /** "standard" (S1-S4) or "signature" (subcat-specific). Optional for legacy rows. */
  kind?: BankQuestionKind;
  /** Shared id for questions that travel together (e.g. S1a/S1b → "crowd_timing"). */
  topic_id?: string;
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

interface SelectedQuestion {
  question: string;
  archetype: ChartArchetypeId;
  rationale: string;
  kind: BankQuestionKind;
  topic_id?: string;
}

interface QuestionSelection {
  summary: string;
  emoji: string;
  selected: SelectedQuestion[];
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

  const archetypeIds = Object.keys(CHART_ARCHETYPES) as ChartArchetypeId[];

  const writerTopics = (input.writerTopics ?? [])
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const standards = STANDARD_QUESTIONS;
  const signatures = bank.questions;

  const prompt = `You are designing a Headout listing-page visualization deck.

CE: ${input.ce.name} (${input.ce.city}, ${input.ce.country})
Subcategory: ${bank.subcategory.label} — ${bank.subcategory.description}
${bank.unratified ? "(NOTE: this subcategory has no curated bank yet — bootstrap a draft signature set entirely from the DRD via proposed_hero[]. Standard questions still apply.)" : ""}

You receive TWO question lists:

(A) STANDARD questions — these are the universal asks every CE inherits. For EACH, decide whether to KEEP or SKIP based on the Deep Research Doc. SKIP only when the structured \`skip_if\` predicate is satisfied by the DRD; otherwise keep. Record skipped standards in \`dropped\` with the reason. Questions that share a \`topic_id\` MUST be kept-or-skipped TOGETHER (e.g. S1a + S1b both carry topic_id "crowd_timing" — never keep one without the other).

Standard questions:
${JSON.stringify(standards, null, 2)}

(B) SIGNATURE questions — subcategory-specific. Pick 1-3 of the most CE-relevant ones. SKIP a signature when its \`skip_if\` predicate is satisfied OR when the DRD genuinely lacks the data behind it. Record skipped signatures in \`dropped\` with a one-line reason.

Signature questions for this subcategory:
${signatures.length > 0 ? JSON.stringify(signatures, null, 2) : "(none — bootstrap signatures via proposed_hero[])"}

Available chart archetypes (you may only use these ids; do NOT invent new ones): ${archetypeIds.join(", ")}

${writerTopics.length > 0 ? `Writer-supplied hero topics that MUST be turned into selected questions: ${writerTopics.join("; ")}` : ""}

After filtering, propose 0-2 ADDITIONAL hero questions tailored to THIS specific CE (e.g. a famous named room, a signature ride, a sunset slot) — anchored in the DRD, not invented. These go in proposed_hero[]. Each must carry kind:"signature".

Also produce a 2-sentence visitor-facing summary of the CE and pick a single emoji.

Return JSON ONLY (no markdown), shape:
{
  "summary": "...",
  "emoji": "📍",
  "selected": [
    { "question": "...", "archetype": "<one of the ids>", "kind": "standard"|"signature", "topic_id": "..."|null, "rationale": "one line" },
    ...
  ],
  "dropped": [ { "question": "...", "reason": "one line" }, ... ],
  "proposed_hero": [ { "question": "...", "recommended_archetype": "...", "kind": "signature", "notes": "..." }, ... ]
}

Rules:
- Sentence case for all visitor-facing copy.
- Reference the CE by name in summary.
- DO NOT enforce uniqueness by archetype — multiple selected questions MAY share the same archetype (e.g. a weekly_pattern for crowd AND a weekly_pattern for price availability).
- Keep the S1a/S1b crowd_timing pair together; never split.
- Output \`topic_id\` exactly as it appears on the source question, or null if none.

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

  parsed.dropped = Array.isArray(parsed.dropped) ? parsed.dropped : [];
  parsed.proposed_hero = Array.isArray(parsed.proposed_hero)
    ? parsed.proposed_hero
    : [];

  // Build authoritative lookups for kind inference. Standards are
  // matched by exact question text; signatures by exact text against
  // the curated bank. Anything not in either list is treated as a
  // proposed_hero (kind:"signature").
  const standardQuestionTexts = new Set(standards.map((s) => s.question));
  const signatureQuestionTexts = new Set(
    bank.questions.map((q) => q.question),
  );

  // Filter selections: drop unknown archetypes; gate unimplemented archetypes
  // (record them in `dropped` with viz_not_yet_built so writers see the
  // reason in the triage view).
  parsed.selected = parsed.selected.filter((s) => {
    if (!archetypeIds.includes(s.archetype)) {
      parsed.dropped.push({
        question: s.question,
        reason: `unknown archetype "${s.archetype}" — dropped`,
      });
      return false;
    }
    if (!isImplementedArchetype(s.archetype)) {
      parsed.dropped.push({
        question: s.question,
        reason: `viz_not_yet_built: archetype "${s.archetype}" is reserved but its renderer hasn't landed yet`,
      });
      return false;
    }
    // Authoritative kind inference: don't trust the LLM's `kind` flag
    // alone. Match the question text against the curated lists so a
    // standard never gets misclassified as a signature (which would
    // skip the S1 pairing path and the kind-tagged provenance).
    if (standardQuestionTexts.has(s.question)) {
      s.kind = "standard";
      // Restore topic_id from the canonical standard if the LLM dropped it.
      if (!s.topic_id) {
        const std = standards.find((q) => q.question === s.question);
        if (std?.topic_id) s.topic_id = std.topic_id;
      }
    } else if (signatureQuestionTexts.has(s.question)) {
      s.kind = "signature";
    } else if (s.kind !== "standard" && s.kind !== "signature") {
      // Proposed-hero or otherwise unknown — treat as signature.
      s.kind = "signature";
    }
    return true;
  });

  /* ---------- Deterministic post-LLM enforcement ---------- */

  // Helper: did the LLM record an explicit dropped reason for this question?
  const droppedQuestions = new Set(parsed.dropped.map((d) => d.question));

  // (1) Re-add any STANDARD the LLM silently omitted (i.e. didn't pick AND
  // didn't record in `dropped`). The orchestrator contract is "all four
  // standards minus explicit skips" — it isn't allowed to vanish a standard
  // by accident. Skipped peers in a topic_id pair are handled in step (2).
  const selectedQuestions = new Set(parsed.selected.map((s) => s.question));
  for (const std of standards) {
    if (selectedQuestions.has(std.question)) continue;
    if (droppedQuestions.has(std.question)) continue;
    if (!isImplementedArchetype(std.recommended_archetype)) continue;
    parsed.selected.push({
      question: std.question,
      archetype: std.recommended_archetype,
      rationale: "auto-restored standard (LLM neither kept nor explicitly skipped)",
      kind: "standard",
      ...(std.topic_id ? { topic_id: std.topic_id } : {}),
    });
    selectedQuestions.add(std.question);
  }

  // (2) Enforce S1a/S1b co-emission: if either crowd_timing entry survived,
  // keep both (or drop both). Belt-and-braces over the prompt rule.
  const standardCrowdTopic = standards.filter(
    (q) => q.topic_id === "crowd_timing",
  );
  if (standardCrowdTopic.length === 2) {
    const haveByArchetype = new Map(
      parsed.selected
        .filter((s) => s.kind === "standard" && s.topic_id === "crowd_timing")
        .map((s) => [s.archetype, s] as const),
    );
    const someKept = haveByArchetype.size > 0;
    const allKept = haveByArchetype.size === 2;
    if (someKept && !allKept) {
      for (const peer of standardCrowdTopic) {
        if (
          !haveByArchetype.has(peer.recommended_archetype) &&
          isImplementedArchetype(peer.recommended_archetype)
        ) {
          parsed.selected.push({
            question: peer.question,
            archetype: peer.recommended_archetype,
            rationale: "co-emitted with crowd_timing peer",
            kind: "standard",
            topic_id: "crowd_timing",
          });
          // Remove from dropped if the LLM placed it there.
          parsed.dropped = parsed.dropped.filter(
            (d) => d.question !== peer.question,
          );
        }
      }
    }
  }

  // (3) Cap signatures at 3, deterministically. LLMs sometimes pick more
  // when many curated questions look applicable. Keep the first three in
  // selection order (the LLM's ranking) and push the rest into `dropped`
  // with a budget reason so they show up in the writer's triage view.
  const standardSelections = parsed.selected.filter(
    (s) => s.kind === "standard",
  );
  let signatureSelections = parsed.selected.filter(
    (s) => s.kind !== "standard",
  );
  const SIGNATURE_MIN = 1;
  const SIGNATURE_MAX = 3;
  if (signatureSelections.length > SIGNATURE_MAX) {
    const kept = signatureSelections.slice(0, SIGNATURE_MAX);
    const dropped = signatureSelections.slice(SIGNATURE_MAX);
    for (const d of dropped) {
      parsed.dropped.push({
        question: d.question,
        reason: `signature_budget: capped at ${SIGNATURE_MAX} per CE`,
      });
    }
    signatureSelections = kept;
  }

  // (4) Enforce signature MINIMUM: every CE deck needs at least one
  // CE-specific question. If the LLM kept zero, pull the highest-ranked
  // bank candidate (or proposed_hero) whose archetype is implemented and
  // wasn't explicitly skipped via `dropped`. If we still can't find one,
  // log a warning — generation will proceed standards-only and the
  // writer's triage view will show the gap.
  if (signatureSelections.length < SIGNATURE_MIN) {
    const droppedQs = new Set(parsed.dropped.map((d) => d.question));
    const candidates = [
      ...bank.questions.map((q) => ({
        question: q.question,
        archetype: q.recommended_archetype,
      })),
      ...parsed.proposed_hero.map((p) => ({
        question: p.question,
        archetype: p.recommended_archetype,
      })),
    ];
    for (const c of candidates) {
      if (signatureSelections.length >= SIGNATURE_MIN) break;
      if (droppedQs.has(c.question)) continue;
      if (!archetypeIds.includes(c.archetype)) continue;
      if (!isImplementedArchetype(c.archetype)) continue;
      signatureSelections.push({
        question: c.question,
        archetype: c.archetype,
        rationale:
          "auto-restored signature (deck needs >=1 CE-specific question)",
        kind: "signature",
      });
    }
    if (signatureSelections.length < SIGNATURE_MIN) {
      logger.warn(
        { slug: input.ce.slug, subcategoryId: input.subcategoryId },
        "Research pipeline: could not satisfy signature_min — bank empty or all candidates skipped",
      );
    }
  }

  parsed.selected = [...standardSelections, ...signatureSelections];

  // (5) Enforce 4–7 total budget. We don't pad beyond what the bank
  // can support, but we DO trim and we DO log when we're under-budget
  // so the writer's triage view surfaces the contract miss.
  const TOTAL_MIN = 4;
  const TOTAL_MAX = 7;
  if (parsed.selected.length > TOTAL_MAX) {
    const overflow = parsed.selected.slice(TOTAL_MAX);
    parsed.selected = parsed.selected.slice(0, TOTAL_MAX);
    for (const d of overflow) {
      parsed.dropped.push({
        question: d.question,
        reason: `total_budget: capped at ${TOTAL_MAX} per CE`,
      });
    }
  }
  if (parsed.selected.length < TOTAL_MIN) {
    logger.warn(
      {
        slug: input.ce.slug,
        subcategoryId: input.subcategoryId,
        kept: parsed.selected.length,
        target_min: TOTAL_MIN,
      },
      "Research pipeline: under total_budget min — bank/DRD didn't yield enough viable questions",
    );
  }

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

/* -------------------------------------------------------------------------- */
/* Step 2b — Grouped generation for the S1 crowd_timing pair                  */
/* -------------------------------------------------------------------------- */

/**
 * One Gemini call that returns BOTH the weekly_pattern and hourly_heatmap
 * specs for the same CE, so the two views of "when do the crowds show?"
 * stay numerically consistent (e.g. if Monday is the weekly low, the
 * Monday row of the heatmap should agree).
 *
 * Falls back to two independent `generateOneChart` calls if the grouped
 * call fails to produce both valid specs.
 */
export async function generateCrowdTimingPair(
  input: ResearchPipelineInput,
  weeklyQuestion: string,
  hourlyQuestion: string,
): Promise<{ weekly: GeneratedChart; hourly: GeneratedChart }> {
  const weeklyBlock = ARCHETYPE_PROMPT["weekly_pattern"];
  const hourlyBlock = ARCHETYPE_PROMPT["hourly_heatmap"];

  const prompt = `Design TWO charts that together answer "when do the crowds show?" for ${input.ce.name}. They MUST be numerically consistent — the weekly view's quietest day should be the heatmap's quietest day, opening hours should match, etc.

Question A (weekly view): "${weeklyQuestion}"
Required archetype A: weekly_pattern
Schema A:
${weeklyBlock}

Question B (hourly view): "${hourlyQuestion}"
Required archetype B: hourly_heatmap
Schema B:
${hourlyBlock}

Grounding rules (apply to BOTH charts):
1. PREFER numbers from the Deep Research Doc below. Capture the exact phrase you used in provenance.drd_snippets.
2. If the DRD doesn't cover it AND you can ground it via Google Search, use the search result and capture the source URL in provenance.web_sources.
3. Otherwise produce an HONEST estimate a Headout local guide would broadly agree with — list which fields you estimated in provenance.estimates.
4. Set provenance.status to "drd_grounded" if every numeric field came from the DRD; "web_grounded" if at least one came from web search; "estimated" otherwise.
5. The two charts MUST agree: same opening/closing hours, same weekly pattern (the quietest day in A is the quietest row in B).

Output STRICT JSON (no markdown), shape:
{
  "weekly": {
    "chart": { "slug": "kebab-case", "question": "...", "title": "...", "subtitle": "...", "insight": "...", "spec": { ...weekly_pattern spec... } },
    "provenance": { "status": "...", "drd_snippets": [...], "web_sources": [...], "estimates": [...], "verifier_notes": "" }
  },
  "hourly": {
    "chart": { "slug": "kebab-case", "question": "...", "title": "...", "subtitle": "...", "insight": "...", "spec": { ...hourly_heatmap spec... } },
    "provenance": { "status": "...", "drd_snippets": [...], "web_sources": [...], "estimates": [...], "verifier_notes": "" }
  }
}

Today is ${new Date().toISOString().slice(0, 10)}.

Deep Research Doc:
"""
${truncate(input.drdMarkdown, 14000)}
"""`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      temperature: 0.5,
      maxOutputTokens: 8192,
      tools: [{ googleSearch: {} }],
    },
  });

  const raw = response.text ?? "";
  if (!raw) throw new Error("Crowd-timing pair generation returned empty");

  const parsed = safeJson<{
    weekly?: { chart: unknown; provenance?: ChartProvenance };
    hourly?: { chart: unknown; provenance?: ChartProvenance };
  }>(raw);
  if (!parsed?.weekly?.chart || !parsed?.hourly?.chart) {
    throw new Error("Crowd-timing pair generation produced malformed JSON");
  }

  const weeklyChart = aiChartSchema.safeParse(parsed.weekly.chart);
  const hourlyChart = aiChartSchema.safeParse(parsed.hourly.chart);
  if (!weeklyChart.success || !hourlyChart.success) {
    throw new Error("Crowd-timing pair failed schema validation");
  }
  if (
    weeklyChart.data.spec.type !== "weekly_pattern" ||
    hourlyChart.data.spec.type !== "hourly_heatmap"
  ) {
    throw new Error("Crowd-timing pair returned wrong spec types");
  }

  return {
    weekly: {
      spec: weeklyChart.data,
      provenance: normalizeProvenance(parsed.weekly.provenance, response),
    },
    hourly: {
      spec: hourlyChart.data,
      provenance: normalizeProvenance(parsed.hourly.provenance, response),
    },
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

  /* ------- Grouped generation for the S1 crowd_timing pair (S1a + S1b) ----- */
  // Take the pair OUT of the main loop and emit them via a single Gemini
  // call so the two views stay numerically consistent. They're inserted
  // FIRST so they sit adjacent at the top of the deck.
  const crowdPair = selection.selected.filter(
    (s) => s.kind === "standard" && s.topic_id === "crowd_timing",
  );
  const remaining = selection.selected.filter(
    (s) => !(s.kind === "standard" && s.topic_id === "crowd_timing"),
  );

  if (crowdPair.length === 2) {
    const weeklySel = crowdPair.find((s) => s.archetype === "weekly_pattern");
    const hourlySel = crowdPair.find((s) => s.archetype === "hourly_heatmap");
    if (weeklySel && hourlySel) {
      try {
        logger.info(
          { slug: input.ce.slug, topic_id: "crowd_timing" },
          "Research pipeline: generating crowd_timing pair (grouped)",
        );
        const pair = await generateCrowdTimingPair(
          input,
          weeklySel.question,
          hourlySel.question,
        );
        for (const [sel, gen] of [
          [weeklySel, pair.weekly] as const,
          [hourlySel, pair.hourly] as const,
        ]) {
          const verified = await verifyChart(input, gen.spec, gen.provenance);
          charts.push({
            ...gen.spec,
            recommended_archetype: sel.archetype,
            source_question: sel.question,
            provenance: {
              ...verified,
              kind: "standard",
              topic_id: "crowd_timing",
            },
          });
        }
      } catch (err) {
        // Fall back to two independent calls if the grouped path fails —
        // we still get adjacent insertion order.
        logger.warn(
          { err, slug: input.ce.slug },
          "Crowd-timing grouped generation failed; falling back to per-chart",
        );
        for (const sel of [weeklySel, hourlySel]) {
          try {
            const generated = await generateOneChart(
              input,
              sel.question,
              sel.archetype,
            );
            const verified = await verifyChart(
              input,
              generated.spec,
              generated.provenance,
            );
            charts.push({
              ...generated.spec,
              recommended_archetype: sel.archetype,
              source_question: sel.question,
              provenance: {
                ...verified,
                kind: "standard",
                topic_id: "crowd_timing",
              },
            });
          } catch (err2) {
            logger.warn(
              { err: err2, archetype: sel.archetype },
              "Research pipeline: crowd-timing fallback failed",
            );
          }
        }
      }
    }
  } else {
    // Pair was incomplete — process whatever the orchestrator kept via the
    // normal loop (defensive; selectQuestions normally enforces this).
    remaining.unshift(...crowdPair);
  }

  for (const sel of remaining) {
    // Belt-and-braces: never call Gemini for an unimplemented archetype.
    // selectQuestions already filters these out, but a stray entry from
    // proposed_hero or a future code path shouldn't slip through.
    if (!isImplementedArchetype(sel.archetype)) {
      selection.dropped.push({
        question: sel.question,
        reason: `viz_not_yet_built: archetype "${sel.archetype}" is reserved`,
      });
      continue;
    }
    try {
      logger.info(
        {
          slug: input.ce.slug,
          archetype: sel.archetype,
          question: sel.question,
          kind: sel.kind,
          topic_id: sel.topic_id,
        },
        "Research pipeline: generating chart",
      );
      const generated = await generateOneChart(
        input,
        sel.question,
        sel.archetype,
      );
      const verified = await verifyChart(
        input,
        generated.spec,
        generated.provenance,
      );
      const provenance: ChartProvenance = {
        ...verified,
        kind: sel.kind,
        ...(sel.topic_id ? { topic_id: sel.topic_id } : {}),
      };
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

  // De-dupe slugs deterministically. With v3 we no longer enforce
  // uniqueness-by-archetype (e.g. two weekly_pattern charts can co-exist),
  // so suffix the archetype first, then a numeric counter if still colliding.
  const seenSlugs = new Set<string>();
  for (const c of charts) {
    let candidate = c.slug;
    if (seenSlugs.has(candidate)) {
      candidate = `${c.slug}-${c.recommended_archetype}`;
    }
    let n = 2;
    while (seenSlugs.has(candidate)) {
      candidate = `${c.slug}-${c.recommended_archetype}-${n++}`;
    }
    c.slug = candidate;
    seenSlugs.add(candidate);
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
