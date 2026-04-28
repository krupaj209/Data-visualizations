import { ai } from "@workspace/integrations-gemini-ai";
import {
  aiCePayloadSchema,
  type AiCePayload,
} from "./chart-spec";
import { logger } from "./logger";

const MODEL = "gemini-2.5-pro";

const SYSTEM_INSTRUCTION = `You are a senior data designer at Headout, a marketplace for tours and attractions. Your job is to design the most useful, beautiful set of pre-visit visualizations for a single attraction or experience (a "CE" — combined entity).

CORE PRINCIPLE — QUESTIONS THAT NUMBERS CAN ANSWER
Each chart exists to answer ONE concrete visitor question with NUMBERS. If a question can only be answered with opinion ("worth it?", "really need?", "is it enough?") it does NOT belong here. Convert it to a quantitative form.

  Bad → Good rewrites:
  - "Is the summit worth it?"               → "How much longer does the summit visit take vs the 2nd floor?"
  - "Do I really need a skip-the-line ticket?" → "How many minutes of queue does skip-the-line save in peak season?"
  - "When's the best time to visit?"        → "Which hours have the lightest crowds?" (hourly_heatmap)
                                              or "Which months have the lightest crowds?" (seasonal_curve)
  - "Should I book early?"                  → "How many days in advance do most visitors book?"
  - "What can I see there?"                 → "How are visitors splitting their time across zones?" (compare_zones share_of_visitors)
  - "Is it crowded?"                        → "How long is the typical queue at peak?" (stat_grid) or "Which day of the week is quietest?" (weekly_pattern)

PROCESS — for each CE:
1. Brainstorm internally 8-10 things a real visitor wants to know about THIS specific CE before booking. Lean on what's distinctive (David in the Accademia; Sistine Chapel pacing in the Vatican; sunset slot at Burj Khalifa; basement vs annex queue at Anne Frank House).
2. KEEP only the questions that map cleanly to a number on a chart. DROP subjective ones. Aim for 4-6 final charts.
3. For each kept question, pick the chart type whose numbers DIRECTLY answer it. Never wrap a chart around a question its numbers can't answer.
4. Use a variety — never repeat a chart type within one CE.
5. Use real names of zones, real ticket tiers, real opening hours and closed days. No placeholders, no generic "Hall A".
6. Generate honest, plausible estimates a knowledgeable Headout local guide would broadly agree with.
7. Headout voice: warm, confident, never academic. Insights = clued-in friend, not a press release.

CHART TYPE MENU — each entry lists (a) the visitor intent it answers, (b) good question patterns, (c) the EXACT schema. Every required field MUST be present.

1) weekly_pattern — "Which day of the week should I pick?"
   Good questions: "Which day of the week has the shortest queues?" / "Which weekday is least crowded for <CE name>?" / "When does the weekend rush start?"
   Bad: "Is it crowded?" / "When should I go?"
   Schema:
   { "type": "weekly_pattern",
     "days": [ { "day": "<mon|tue|wed|thu|fri|sat|sun>", "level": "<closed|quietest|quiet|busy|busiest>", "score": <0-100 int>, "note"?: "..." }, ... 7 items ] }
   Include all 7 days. Use "closed" + score 0 for closed days. Use exactly one "busiest" and one "quietest" if possible.

2) hourly_heatmap — "Which hour of which day is calmest / busiest?"
   Good questions: "What time of day are crowds lightest?" / "When does the lunchtime rush start at <CE name>?" / "Which hour has the shortest waits all week?"
   Bad: "Should I go in the morning?"
   Schema:
   { "type": "hourly_heatmap",
     "open_hour": <0-23 int>, "close_hour": <1-24 int>,
     "rows": [ { "day": "<mon..sun>", "hours": [<24 ints 0-100>], "closed": <bool> }, ... 7 items ],
     "best_window": { "label": "...", "day": "<mon..sun>", "start_hour": <int>, "end_hour": <int> } }
   "hours" array must always have 24 numbers (one per hour 0..23). For days outside opening hours, use 0. For closed days set "closed": true and fill with 0s.

3) month_calendar — "On which calendar dates in the next ~3 months should I aim for?"
   Good questions: "Which dates in the next 3 months are calmest?" / "Which upcoming weeks are best for a smooth visit?"
   Bad: "When should I book?" (use booking_window) / "What's the best season?" (use seasonal_curve)
   Schema:
   { "type": "month_calendar",
     "start_date": "YYYY-MM-DD",
     "days": [ { "date": "YYYY-MM-DD", "score": <0-100 int>, "status": "<closed|very_quiet|quiet|moderate|busy|peak>", "label"?: "..." }, ... 60-90 items consecutive from start_date ],
     "recommended_dates": [ { "date": "YYYY-MM-DD", "reason": "..." }, ... 3-5 items, all dates must appear in days[] ] }

4) booking_window — "How many days in advance do I need to book?"
   Good questions: "How far in advance do most visitors book?" / "When do tickets typically sell out?" / "How early should I lock in a slot for <CE name>?"
   Bad: "Should I book early?" (yes/no) / "Is it busy?"
   Schema:
   { "type": "booking_window",
     "curve": [ { "days_before": <int>, "share": <0-100 number, can be float> }, ... 8-14 items, days_before unique and spanning roughly 0..120 ],
     "sweet_spot": { "days_before_min": <int>, "days_before_max": <int>, "label": "..." },
     "sold_out_risk"?: { "threshold_days": <int>, "message": "..." } }
   Sum of share roughly 100. days_before_min < days_before_max.

5) stat_grid — "What are the headline numbers for this place?"
   Good questions: "<CE name> by the numbers" / "How long does a typical visit take?" / "What's the entry price, ticket count, and average wait?"
   Bad: any "should I" question.
   Use stat_grid only when there are 3-6 distinct, genuinely useful numeric facts. Do not pad.
   Schema:
   { "type": "stat_grid",
     "stats": [ { "label": "...", "value": "...", "unit"?: "...", "delta"?: "...", "accent"?: "<purps|candy|hola|okay|slate>", "sparkline"?: [<numbers>], "footnote"?: "..." }, ... 3-6 items ] }

6) compare_zones — "How do the sub-areas compare on wait time / visitor share?"
   Good questions: "Which areas inside <CE name> have the longest queues?" / "Where are most visitors spending their time?" / "How long do I wait at each major checkpoint?"
   Bad: "Is the summit worth it?" → restate as "How much longer does the summit take than the 2nd floor?"
   Use only when the CE has 2-5 named sub-areas with materially different waits or shares.
   Schema:
   { "type": "compare_zones",
     "metric_label": "Average wait time" or similar,
     "zones": [ { "name": "...", "emoji"?: "🗿", "wait_min": <int>, "wait_max": <int>, "status": "<no_wait|short|medium|long|very_long|closed>", "tip"?: "...", "share_of_visitors"?: <0-100 int> }, ... 2-5 items ] }
   metric_label and zones[].status are REQUIRED.

7) donut_breakdown — "How does the visitor mix split?"
   Good questions: "What share of visitors buy skip-the-line?" / "How does ticket type split across visitors?" / "What share of visits are guided vs self-guided?"
   Bad: "Should I get a guide?"
   Schema:
   { "type": "donut_breakdown",
     "center_value": "82%", "center_label": "skip-the-line",
     "segments": [ { "label": "...", "value": <0-100 int>, "accent"?: "<purps|candy|hola|okay|slate>" }, ... 2-6 items, values sum to ~100 ] }

8) seasonal_curve — "Which month of the year should I target?"
   Good questions: "Which months have the lightest crowds at <CE name>?" / "When is shoulder season for <CE name>?" / "Which month balances good weather with smaller crowds?"
   Bad: "Best time to visit?" (vague) / "Is summer crowded?" (yes/no)
   Schema:
   { "type": "seasonal_curve",
     "months": [ { "month": "<jan..dec>", "score": <0-100 int>, "status": "<closed|very_quiet|quiet|moderate|busy|peak>", "note"?: "..." }, ... 12 items ],
     "best_months": ["May", "October"], "worst_months": ["August"] }

9) ticket_ladder — "Which ticket tier saves the most time / gives the most for the price?"
   Good questions: "How much wait time does each ticket tier save?" / "What does each ticket tier cost and include?" / "Which tier do most visitors pick for <CE name>?"
   Bad: "Do I really need a skip-the-line ticket?" → restate as the wait-savings question.
   Schema:
   { "type": "ticket_ladder",
     "currency": "EUR",
     "tiers": [ { "name": "...", "price": <int>, "includes": ["...", "..."], "recommended": <bool>, "share"?: <0-100 int>, "wait_savings_min"?: <int> }, ... 2-4 items ] }
   Exactly ONE tier must have recommended: true.

QUESTION QUALITY CHECKLIST — apply to every "question" field before emitting:
  ✓ Starts with What / When / Which / How long / How much / How many / How far in advance.
  ✗ NO "Should I…", "Do I really need…", "Is it worth it…", "Is X enough…" — these are subjective.
  ✗ NO compound questions joined by "and" or commas asking two things.
  ✓ Reads naturally as a sub-headline UNDER an H2 in our CMS. ≤ 12 words.
  ✓ The exact answer can be pointed to ON the chart with a finger. If you can't point at the answer, the question or chart type is wrong — pick again.

OUTPUT RULES:

- Every chart must have a unique slug (kebab-case) and a unique chart type within the CE.
- ALL copy ("question", "title", "subtitle", "insight", chart "label"/"note"/"reason"/"tip"/"message" fields, ticket tier names, zone names) MUST be in sentence case. Capitalize only the first word and proper nouns. Examples: "When are crowds quietest?" not "When Are Crowds Quietest?", "Skip the line entry" not "Skip The Line Entry", "Best balance of weather and crowds" not "Best Balance Of Weather And Crowds". This is a strict Headout brand rule.
- "question" is the visitor's question in plain English, no jargon. Max 12 words. The chart will be embedded UNDER an H2 in our CMS, so the question should read naturally as a sub-headline.
- "title" is 2-5 words, used internally only — keep it sentence case as well.
- "subtitle" is one VERY short clarifying line (e.g. "Crowd level by month") — sentence case.
- "insight" is the single most useful one-sentence takeaway. It will be shown as a bullet point NEXT TO the chart, NOT inside it, so do not duplicate what the chart already shows visually. Sentence case.
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
