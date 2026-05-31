/**
 * LLM Signal Pre-pass — supplementary Gemini call that detects nuanced
 * context signals a DRD may express in natural language rather than the
 * keyword patterns the regex extractor looks for.
 *
 * Gate: only runs when ENABLE_LLM_SIGNAL_PREPASS=true (env var). Defaults
 * to false so existing pipelines are unaffected until opted in.
 *
 * Results are OR-merged with the regex extraction: if EITHER the regex OR
 * the LLM detects a signal, the signal fires. The LLM never deactivates a
 * signal the regex already set.
 *
 * In-memory cache keyed by a SHA-256 content hash of the DRD markdown. The
 * cache resets on server restart, so large throughput deployments may want to
 * add a DB column later — for now this is sufficient.
 */

import { createHash } from "node:crypto";
import type { ContextSignals } from "@workspace/question-bank";

// Lazy-import the Gemini client used by the rest of the api-server.
// We import at call-time to avoid circular-dep issues during startup.
type GeminiClient = {
  models: {
    generateContent(args: {
      model: string;
      contents: { role: string; parts: { text: string }[] }[];
      config: { temperature: number; maxOutputTokens: number; responseMimeType: string };
    }): Promise<{ text?: string | null }>;
  };
};

const ENABLED = process.env.ENABLE_LLM_SIGNAL_PREPASS === "true";

const cache = new Map<string, Partial<ContextSignals>>();

function hashDrd(markdown: string): string {
  return createHash("sha256").update(markdown).digest("hex");
}

/**
 * Subset of ContextSignals that are guaranteed to be `boolean` and that the
 * LLM can meaningfully evaluate from DRD text. Non-boolean fields
 * (sub_products, typical_visit_minutes) are intentionally excluded.
 */
type BooleanSignalKey = Extract<
  keyof ContextSignals,
  | "has_long_queues"
  | "has_skip_the_line"
  | "has_timed_entry"
  | "has_seasonal_variation"
  | "has_historical_significance"
  | "has_weather_sensitivity"
  | "has_multiple_sub_products"
  | "has_photography_windows"
  | "has_famous_highlights"
  | "has_multiple_entrances"
  | "has_named_gallery_zones"
  | "has_evening_program"
  | "has_guided_tours"
  | "has_dress_code"
  | "has_accessibility_concerns"
  | "has_audio_guide"
  | "has_security_screening"
  | "has_ride_attractions"
  | "has_fixed_itinerary"
  | "has_scheduled_shows"
  | "has_dynamic_pricing"
  | "has_wildlife_sighting"
>;

/** Boolean signal keys we ask the LLM to evaluate. */
const BOOLEAN_SIGNALS: ReadonlyArray<BooleanSignalKey> = [
  "has_long_queues",
  "has_skip_the_line",
  "has_timed_entry",
  "has_seasonal_variation",
  "has_historical_significance",
  "has_weather_sensitivity",
  "has_multiple_sub_products",
  "has_photography_windows",
  "has_famous_highlights",
  "has_multiple_entrances",
  "has_named_gallery_zones",
  "has_evening_program",
  "has_guided_tours",
  "has_dress_code",
  "has_accessibility_concerns",
  "has_audio_guide",
  "has_security_screening",
  "has_wildlife_sighting",
];

const SIGNAL_DESCRIPTIONS: Partial<Record<BooleanSignalKey, string>> = {
  has_long_queues:
    "visitors experience notable queues, waiting times, or security/ticket lines at this attraction — even if described indirectly (e.g. 'elevator queue', 'security queue', 'expect to wait')",
  has_skip_the_line:
    "a skip-the-line, fast-track, priority, or reserved-entry product exists for this attraction",
  has_timed_entry:
    "the attraction uses timed-entry slots, time-stamped tickets, or entry windows",
  has_seasonal_variation:
    "visitor numbers, availability, or experience meaningfully change across seasons or months",
  has_historical_significance:
    "the attraction has notable historical, cultural, or heritage significance",
  has_weather_sensitivity:
    "operations or visitor experience are affected by weather — including closures due to wind, rain, fog, summit conditions, sea state, or outdoor activities",
  has_multiple_sub_products:
    "multiple distinct ticket types, tiers, or entry options are available (e.g. standard, fast-track, guided, summit-access, combo)",
  has_photography_windows:
    "there are optimal times or spots for photography — e.g. golden hour, sunrise, low crowd windows, or specific viewpoints",
  has_famous_highlights:
    "the attraction has specific well-known highlights, must-see items, or iconic spots that visitors should prioritise",
  has_multiple_entrances:
    "the attraction has more than one entrance, gate, or access point",
  has_named_gallery_zones:
    "the attraction has distinct named areas, galleries, floors, or zones",
  has_evening_program:
    "the attraction offers a distinct evening, night, or after-hours program",
  has_guided_tours:
    "guided tours — audio, self-guided, or led by a person — are a meaningful part of the offering",
  has_dress_code:
    "visitors must follow a dress code or clothing restriction",
  has_accessibility_concerns:
    "accessibility concerns (wheelchair, mobility, stairs, lift) are documented",
  has_audio_guide:
    "an audio guide, self-guided audio tour, or app-based guide is available",
  has_security_screening:
    "security screening, bag check, or metal detector is present at entry",
  has_wildlife_sighting:
    "the attraction involves wildlife, animal sightings, or safari-type encounters",
};

const PROMPT_INTRO = `You are a structured data extractor. Read the following Deep Research Document (DRD) for a tourist attraction and evaluate each signal below. Return ONLY a valid JSON object with the signal keys and boolean values. Do not explain — output the JSON object only.

Signals to evaluate (be liberal — if the DRD implies the signal even indirectly, return true):`;

function buildPrompt(drdMarkdown: string): string {
  const sigLines = BOOLEAN_SIGNALS.map((sig) => {
    const desc = SIGNAL_DESCRIPTIONS[sig] ?? sig;
    return `  "${sig}": ${desc}`;
  }).join("\n");

  // Truncate DRD to keep the prompt within token budget.
  const truncated = drdMarkdown.length > 12000
    ? drdMarkdown.slice(0, 12000) + "\n\n[... DRD truncated for length ...]"
    : drdMarkdown;

  return `${PROMPT_INTRO}\n${sigLines}\n\nDeep Research Document:\n"""\n${truncated}\n"""\n\nReturn ONLY the JSON object. Example:\n{"has_long_queues":true,"has_skip_the_line":false,...}`;
}

function parseResponse(text: string): Partial<ContextSignals> {
  try {
    // Strip any markdown code fences the model may have added.
    const cleaned = text.replace(/^```[a-z]*\n?/m, "").replace(/```$/m, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const result: Partial<ContextSignals> = {};
    // Cast is safe: we only set keys that are boolean in ContextSignals
    // and we're assigning a boolean value confirmed by typeof check.
    const mutable = result as unknown as Record<string, boolean>;
    for (const sig of BOOLEAN_SIGNALS) {
      if (typeof parsed[sig] === "boolean") {
        mutable[sig] = parsed[sig] as boolean;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Run the LLM signal pre-pass against a DRD.
 *
 * Returns a partial ContextSignals map. Callers should OR-merge the result
 * with the regex-extracted signals (regex wins on any conflict).
 *
 * Returns {} when:
 * - ENABLE_LLM_SIGNAL_PREPASS is not "true"
 * - drdMarkdown is empty
 * - the Gemini call fails (soft-fail — never throws)
 *
 * Results are cached in-memory by DRD content hash for the lifetime of the
 * server process.
 */
export async function llmSignalPrePass(
  drdMarkdown: string,
  geminiClient: GeminiClient,
  model: string,
): Promise<Partial<ContextSignals>> {
  if (!ENABLED) return {};
  if (!drdMarkdown || drdMarkdown.trim().length === 0) return {};

  const hash = hashDrd(drdMarkdown);
  const cached = cache.get(hash);
  if (cached) return cached;

  try {
    const response = await geminiClient.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: buildPrompt(drdMarkdown) }] }],
      config: {
        temperature: 0.1,
        maxOutputTokens: 512,
        responseMimeType: "application/json",
      },
    });
    const text = response.text?.trim() ?? "";
    const signals = parseResponse(text);
    cache.set(hash, signals);
    return signals;
  } catch {
    return {};
  }
}
