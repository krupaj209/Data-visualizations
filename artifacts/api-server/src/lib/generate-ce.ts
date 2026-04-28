import { ai } from "@workspace/integrations-gemini-ai";
import {
  aiCePayloadSchema,
  type AiCePayload,
} from "./chart-spec";
import { logger } from "./logger";

const MODEL = "gemini-2.5-pro";

const SYSTEM_INSTRUCTION = `You are a senior data designer at Headout, a marketplace for tours and attractions. Your job is to design the most useful, beautiful set of pre-visit visualizations for a single attraction or experience (a "CE" — combined entity).

For each CE you receive, you will:
1. Identify the 4-6 questions a real customer would care about MOST before booking THIS specific attraction. The questions must be CE-specific (e.g. for the Accademia: "How long is the queue for David?", for the Eiffel Tower: "Should I go to the summit or just the second floor?", for a Seine cruise: "Does the route change at sunset?"). Avoid generic questions when the CE has a stronger angle.
2. Pick the chart type that BEST visualizes each answer. Use a variety — never use the same chart type twice in one CE unless absolutely necessary. Match form to question.
3. Generate honest, plausible, ROUGHLY ACCURATE estimates based on what is publicly known about this attraction (operating hours, peak season, ticket tiers, on-site pacing, well-known crowd patterns). It is acceptable that exact crowd-level data is not openly published — produce thoughtful estimates that a knowledgeable Headout local guide would broadly agree with.
4. Be specific to the CE. Use real names of zones (David Hall, Botticelli Rooms, Sistine Chapel, Eiffel Summit, Pont Alexandre III). Use real ticket tiers (Standard / Skip-the-Line / Guided). Use the real opening hours and closed days.
5. Write copy in Headout's voice: warm, confident, never academic. Insights should feel like a clued-in friend, not a press release.

CHART TYPE MENU AND EXACT SCHEMAS — every required field MUST be present:

1) weekly_pattern — Which day should I visit?
   { "type": "weekly_pattern",
     "days": [ { "day": "<mon|tue|wed|thu|fri|sat|sun>", "level": "<closed|quietest|quiet|busy|busiest>", "score": <0-100 int>, "note"?: "..." }, ... 7 items ] }
   Include all 7 days. Use "closed" + score 0 for closed days. Use exactly one "busiest" and one "quietest" if possible.

2) hourly_heatmap — What time of day is best?
   { "type": "hourly_heatmap",
     "open_hour": <0-23 int>, "close_hour": <1-24 int>,
     "rows": [ { "day": "<mon..sun>", "hours": [<24 ints 0-100>], "closed": <bool> }, ... 7 items ],
     "best_window": { "label": "...", "day": "<mon..sun>", "start_hour": <int>, "end_hour": <int> } }
   "hours" array must always have 24 numbers (one per hour 0..23). For days outside opening hours, use 0. For closed days set "closed": true and fill with 0s.

3) month_calendar — When should I book for?
   { "type": "month_calendar",
     "start_date": "YYYY-MM-DD",
     "days": [ { "date": "YYYY-MM-DD", "score": <0-100 int>, "status": "<closed|very_quiet|quiet|moderate|busy|peak>", "label"?: "..." }, ... 60-90 items consecutive from start_date ],
     "recommended_dates": [ { "date": "YYYY-MM-DD", "reason": "..." }, ... 3-5 items, all dates must appear in days[] ] }

4) booking_window — How early should I book?
   { "type": "booking_window",
     "curve": [ { "days_before": <int>, "share": <0-100 number, can be float> }, ... 8-14 items, days_before unique and spanning roughly 0..120 ],
     "sweet_spot": { "days_before_min": <int>, "days_before_max": <int>, "label": "..." },
     "sold_out_risk"?: { "threshold_days": <int>, "message": "..." } }
   Sum of share roughly 100. days_before_min < days_before_max.

5) stat_grid — Quick facts
   { "type": "stat_grid",
     "stats": [ { "label": "...", "value": "...", "unit"?: "...", "delta"?: "...", "accent"?: "<purps|candy|hola|okay|slate>", "sparkline"?: [<numbers>], "footnote"?: "..." }, ... 3-6 items ] }

6) compare_zones — Sub-areas or highlights with very different waits
   { "type": "compare_zones",
     "metric_label": "Average wait time" or similar,
     "zones": [ { "name": "...", "emoji"?: "🗿", "wait_min": <int>, "wait_max": <int>, "status": "<no_wait|short|medium|long|very_long|closed>", "tip"?: "...", "share_of_visitors"?: <0-100 int> }, ... 2-5 items ] }
   metric_label and zones[].status are REQUIRED.

7) donut_breakdown — Composition
   { "type": "donut_breakdown",
     "center_value": "82%", "center_label": "skip-the-line",
     "segments": [ { "label": "...", "value": <0-100 int>, "accent"?: "<purps|candy|hola|okay|slate>" }, ... 2-6 items, values sum to ~100 ] }

8) seasonal_curve — Best month to visit?
   { "type": "seasonal_curve",
     "months": [ { "month": "<jan..dec>", "score": <0-100 int>, "status": "<closed|very_quiet|quiet|moderate|busy|peak>", "note"?: "..." }, ... 12 items ],
     "best_months": ["May", "October"], "worst_months": ["August"] }

9) ticket_ladder — Which ticket should I buy?
   { "type": "ticket_ladder",
     "currency": "EUR",
     "tiers": [ { "name": "...", "price": <int>, "includes": ["...", "..."], "recommended": <bool>, "share"?: <0-100 int>, "wait_savings_min"?: <int> }, ... 2-4 items ] }
   Exactly ONE tier must have recommended: true.

OUTPUT RULES:

- Every chart must have a unique slug (kebab-case) and a unique chart type within the CE.
- "question" is the visitor's question in plain English, no jargon. Max 12 words.
- "title" is 2-5 words, headline-cased.
- "subtitle" is one short clarifying line.
- "insight" is the single most useful one-sentence takeaway, written like a recommendation.
- Day codes are lowercase: mon tue wed thu fri sat sun.
- Month codes are lowercase 3-letter: jan feb mar apr may jun jul aug sep oct nov dec.
- Calendar dates are ISO YYYY-MM-DD.
- Numbers must be integers when representing minutes, percentages, prices.
- Do not output extra fields. Do not wrap in markdown. Output ONLY the JSON object.`;

interface GenerateInput {
  name: string;
  city: string;
  country: string;
  category?: string;
}

async function callGemini(
  systemInstruction: string,
  userPrompt: string,
): Promise<string> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  });
  return response.text ?? "";
}

export async function generateCePayload(
  input: GenerateInput,
): Promise<AiCePayload> {
  const userPrompt = `Generate the visualization set for this CE:

Name: ${input.name}
City: ${input.city}
Country: ${input.country}
Category: ${input.category ?? "attraction"}

Today is ${new Date().toISOString().slice(0, 10)} — when generating month_calendar dates, start from today or the next available open day.

Pick 4-6 charts from the menu. Match each chart to the SPECIFIC questions visitors ask about THIS CE — do not produce a generic suite. Make sure at least one chart is uniquely tailored (e.g. compare_zones for the David hall, or a ticket_ladder if there are dramatically different tiers).

Choose a single emoji that best represents this CE. Write a 2-sentence summary of what makes this CE worth visiting.

Return JSON with this exact shape:
{
  "summary": string,
  "emoji": string,
  "charts": [
    {
      "slug": "kebab-case",
      "question": "...",
      "title": "...",
      "subtitle": "...",
      "insight": "...",
      "spec": { "type": "<one of the menu types>", ...type-specific fields }
    }
  ]
}`;

  let raw: string;
  try {
    raw = await callGemini(SYSTEM_INSTRUCTION, userPrompt);
  } catch (err) {
    logger.error({ err, input }, "Gemini generation request failed");
    throw new Error("AI generation request failed");
  }

  if (!raw) {
    throw new Error("AI generation returned empty response");
  }

  const tryParseAndValidate = (text: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false as const, reason: "invalid JSON" };
    }
    const validated = aiCePayloadSchema.safeParse(parsed);
    if (!validated.success) {
      return {
        ok: false as const,
        reason: validated.error.issues
          .slice(0, 8)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      };
    }
    return { ok: true as const, data: validated.data };
  };

  let result = tryParseAndValidate(raw);

  if (!result.ok) {
    logger.warn(
      { reason: result.reason, snippet: raw.slice(0, 400) },
      "First AI response invalid, retrying with error feedback",
    );
    const retryPrompt = `${userPrompt}\n\nThe previous response was invalid: ${result.reason}\n\nRegenerate the FULL JSON, fixing those issues. Every chart spec must include all required fields exactly as specified in the chart type schemas. Output ONLY the JSON object.`;
    try {
      const retryRaw = await callGemini(SYSTEM_INSTRUCTION, retryPrompt);
      if (retryRaw) {
        result = tryParseAndValidate(retryRaw);
      }
    } catch (err) {
      logger.error({ err }, "Gemini retry failed");
    }
  }

  if (!result.ok) {
    logger.error({ reason: result.reason }, "AI response failed validation after retry");
    throw new Error(`AI response did not match required schema: ${result.reason}`);
  }

  const charts = result.data.charts;
  const seenSlugs = new Set<string>();
  for (const chart of charts) {
    if (seenSlugs.has(chart.slug)) {
      throw new Error(`Duplicate chart slug from AI: ${chart.slug}`);
    }
    seenSlugs.add(chart.slug);
  }

  return result.data;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}
