import { CHART_ARCHETYPES } from "./archetypes";
import {
  STANDARD_QUESTIONS,
  SUBCATEGORY_IDS,
  getSubcategoryBank,
} from "./bank";
import type { BankQuestion, ChartArchetypeId, SubcategoryId } from "./types";

export type QuestionBankAuditStatus = "pass" | "warn" | "fail";

export interface SubcategoryQuestionBankAudit {
  id: SubcategoryId;
  label: string;
  family: string | null;
  status: QuestionBankAuditStatus;
  standard_question_count: number;
  signature_question_count: number;
  implemented_signature_count: number;
  implemented_archetype_count: number;
  unimplemented_archetypes: ChartArchetypeId[];
  legacy_question_count: number;
  missing: string[];
  preferred_archetypes: ChartArchetypeId[];
}

export interface QuestionBankAudit {
  generated_at: string;
  total_subcategories: number;
  pass_count: number;
  warn_count: number;
  fail_count: number;
  standard_questions: {
    count: number;
    all_implemented: boolean;
    archetypes: ChartArchetypeId[];
    unimplemented_archetypes: ChartArchetypeId[];
  };
  subcategories: SubcategoryQuestionBankAudit[];
}

const MIN_SIGNATURE_QUESTIONS = 2;

export function auditQuestionBank(now: Date = new Date()): QuestionBankAudit {
  const standardArchetypes = uniqueArchetypes(STANDARD_QUESTIONS);
  const standardUnimplemented = unimplementedArchetypes(STANDARD_QUESTIONS);

  const subcategories = SUBCATEGORY_IDS.map((id) => auditSubcategory(id));
  const pass_count = subcategories.filter((s) => s.status === "pass").length;
  const warn_count = subcategories.filter((s) => s.status === "warn").length;
  const fail_count = subcategories.filter((s) => s.status === "fail").length;

  return {
    generated_at: now.toISOString(),
    total_subcategories: subcategories.length,
    pass_count,
    warn_count,
    fail_count,
    standard_questions: {
      count: STANDARD_QUESTIONS.length,
      all_implemented: standardUnimplemented.length === 0,
      archetypes: standardArchetypes,
      unimplemented_archetypes: standardUnimplemented,
    },
    subcategories,
  };
}

function auditSubcategory(id: SubcategoryId): SubcategoryQuestionBankAudit {
  const bank = getSubcategoryBank(id);
  const signatureQuestions = bank.questions;
  const implementedSignatureCount = signatureQuestions.filter((q) =>
    isImplemented(q.recommended_archetype),
  ).length;
  const unimplemented = unimplementedArchetypes(signatureQuestions);
  const legacyCount = signatureQuestions.filter((q) => q.legacy === true).length;
  const preferredArchetypes = uniqueArchetypes([
    ...STANDARD_QUESTIONS,
    ...signatureQuestions,
  ]).filter(isImplemented);

  const missing: string[] = [];
  if (bank.unratified) missing.push("curated subcategory question bank");
  if (signatureQuestions.length < MIN_SIGNATURE_QUESTIONS) {
    missing.push(`${MIN_SIGNATURE_QUESTIONS} signature questions`);
  }
  if (implementedSignatureCount < MIN_SIGNATURE_QUESTIONS) {
    missing.push(`${MIN_SIGNATURE_QUESTIONS} implemented signature archetypes`);
  }
  if (unimplemented.length > 0) {
    missing.push(`implemented support for ${unimplemented.join(", ")}`);
  }
  if (legacyCount > 0) missing.push("v3 rewrite for legacy questions");

  const status: QuestionBankAuditStatus =
    bank.unratified ||
    signatureQuestions.length === 0 ||
    implementedSignatureCount === 0 ||
    unimplemented.length > 0
      ? "fail"
      : missing.length > 0
        ? "warn"
        : "pass";

  return {
    id,
    label: bank.subcategory.label,
    family: bank.subcategory.family ?? null,
    status,
    standard_question_count: STANDARD_QUESTIONS.length,
    signature_question_count: signatureQuestions.length,
    implemented_signature_count: implementedSignatureCount,
    implemented_archetype_count: preferredArchetypes.length,
    unimplemented_archetypes: unimplemented,
    legacy_question_count: legacyCount,
    missing,
    preferred_archetypes: preferredArchetypes,
  };
}

function uniqueArchetypes(questions: BankQuestion[]): ChartArchetypeId[] {
  return Array.from(
    new Set(questions.map((q) => q.recommended_archetype)),
  ) as ChartArchetypeId[];
}

function unimplementedArchetypes(questions: BankQuestion[]): ChartArchetypeId[] {
  return uniqueArchetypes(questions).filter((id) => !isImplemented(id));
}

function isImplemented(id: ChartArchetypeId): boolean {
  return CHART_ARCHETYPES[id]?.implemented === true;
}
