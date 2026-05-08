import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, bankSuggestionsTable, type BankSuggestion } from "@workspace/db";
import {
  CHART_ARCHETYPES,
  CHART_ARCHETYPE_IDS,
  STANDARD_QUESTIONS,
  SUBCATEGORY_IDS,
  getSubcategoryBank,
} from "@workspace/question-bank";

const KNOWN_SUBCATEGORY_IDS = new Set<string>([
  ...SUBCATEGORY_IDS,
  "_general",
]);
const KNOWN_ARCHETYPE_IDS = new Set<string>(CHART_ARCHETYPE_IDS);

const router: IRouter = Router();

/**
 * GET /api/question-bank
 * Full read-only snapshot of the question bank for the public browse page.
 * Includes archetype registry, the four standard questions, and every
 * subcategory's signature questions.
 */
router.get("/question-bank", (_req, res): void => {
  const subcategories = SUBCATEGORY_IDS.map((id) => {
    const bank = getSubcategoryBank(id);
    return {
      id,
      label: bank.subcategory.label,
      family: bank.subcategory.family ?? null,
      description: bank.subcategory.description,
      unratified: bank.unratified,
      questions: bank.questions,
    };
  });
  res.json({
    archetypes: CHART_ARCHETYPES,
    standardQuestions: STANDARD_QUESTIONS,
    subcategories,
  });
});

const suggestionBody = z.object({
  subcategoryId: z
    .string()
    .max(80)
    .transform((s) => s.trim())
    .refine(
      (s) => KNOWN_SUBCATEGORY_IDS.has(s),
      "subcategoryId must be a known subcategory or '_general'",
    ),
  question: z
    .string()
    .max(400)
    .transform((s) => s.trim())
    .refine((s) => s.length >= 4, "question must be at least 4 characters"),
  recommendedArchetype: z
    .string()
    .max(80)
    .transform((s) => s.trim())
    .refine(
      (s) => s === "" || KNOWN_ARCHETYPE_IDS.has(s),
      "recommendedArchetype must be a known archetype id",
    )
    .optional(),
  note: z
    .string()
    .max(2000)
    .transform((s) => s.trim())
    .optional(),
  suggestedBy: z
    .string()
    .max(120)
    .transform((s) => s.trim())
    .optional(),
});

const SUGGESTION_STATUSES = ["open", "accepted", "dismissed"] as const;
type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

function serializeSuggestion(row: BankSuggestion) {
  return {
    id: row.id,
    subcategoryId: row.subcategoryId,
    question: row.question,
    recommendedArchetype: row.recommendedArchetype,
    note: row.note,
    suggestedBy: row.suggestedBy,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * POST /api/question-bank/suggestions
 * Anyone with the URL can propose a question. No auth.
 */
router.post("/question-bank/suggestions", async (req, res): Promise<void> => {
  const parsed = suggestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(bankSuggestionsTable)
    .values({
      subcategoryId: parsed.data.subcategoryId,
      question: parsed.data.question,
      recommendedArchetype: parsed.data.recommendedArchetype || null,
      note: parsed.data.note || null,
      suggestedBy: (parsed.data.suggestedBy || "anonymous").slice(0, 120),
    })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Failed to record suggestion" });
    return;
  }
  res.status(201).json(serializeSuggestion(row));
});

/**
 * GET /api/question-bank/suggestions
 * Staff-facing list. Optional ?status=open|accepted|dismissed.
 */
router.get("/question-bank/suggestions", async (req, res): Promise<void> => {
  const rawStatus = req.query["status"];
  let status: SuggestionStatus | null = null;
  if (typeof rawStatus === "string" && rawStatus.length > 0) {
    if (!SUGGESTION_STATUSES.includes(rawStatus as SuggestionStatus)) {
      res
        .status(400)
        .json({ error: `status must be one of ${SUGGESTION_STATUSES.join(", ")}` });
      return;
    }
    status = rawStatus as SuggestionStatus;
  }
  const rows = status
    ? await db
        .select()
        .from(bankSuggestionsTable)
        .where(eq(bankSuggestionsTable.status, status))
        .orderBy(desc(bankSuggestionsTable.createdAt))
    : await db
        .select()
        .from(bankSuggestionsTable)
        .orderBy(desc(bankSuggestionsTable.createdAt));
  res.json(rows.map(serializeSuggestion));
});

const patchBody = z.object({
  status: z.enum(["open", "accepted", "dismissed"]),
});

/**
 * PATCH /api/question-bank/suggestions/:id
 * Move a suggestion through triage states.
 */
router.patch(
  "/question-bank/suggestions/:id",
  async (req, res): Promise<void> => {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const parsed = patchBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [row] = await db
      .update(bankSuggestionsTable)
      .set({ status: parsed.data.status })
      .where(eq(bankSuggestionsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(serializeSuggestion(row));
  },
);

export default router;
