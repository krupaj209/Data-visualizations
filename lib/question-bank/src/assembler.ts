/**
 * Deck Assembler — deterministic intent-driven selection.
 *
 *   Visitor Intent → Context Signals → Question Bundles → Page Deck
 *
 * No LLM is called here. Given a signal record + page-type, the assembler
 * returns an ordered SelectedQuestion[] equivalent to what the old
 * `selectQuestions` function used to produce, plus rich provenance about
 * which bundle each chart came from and which signals triggered it.
 */

import { QUESTION_BUNDLES, type BundleCandidate, type BundleId, type QuestionBundle } from "./bundles";
import { countSignalMatches, type ContextSignals } from "./signals";
import { getPageTemplate, type PageType, DEFAULT_PAGE_TYPE } from "./page-templates";
import type { VisitorIntentId } from "./intents";
import type { BankQuestionKind, ChartArchetypeId } from "./types";
import { isImplementedArchetype } from "./archetypes";
import { getMandatoryArchetypes } from "./bank";

/* -------------------------------------------------------------------------- */
/* Overrides                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A single override action. Shape mirrors `QuestionOverrideAction` in
 * `@workspace/db/schema/question-overrides` — duplicated here as a plain
 * interface so the question-bank lib stays db-free.
 */
export type OverrideAction =
  | {
      /** DB primary key of the override row. Optional for tests/in-memory use. */
      id?: number;
      action: "edit";
      bundleId: string;
      archetype: string;
      questionTemplate: string;
    }
  | {
      id?: number;
      action: "add";
      bundleId: string;
      archetype: string;
      questionTemplate: string;
      kind?: BankQuestionKind;
    }
  | {
      id?: number;
      action: "mute";
      bundleId: string;
      archetype: string;
    };

/** Origin layer for a candidate after override merging. */
export type OverrideSource = "code" | "category" | "ce";

/**
 * Internal: a bundle candidate carrying provenance about which override
 * layer (if any) last touched it.
 */
interface AnnotatedCandidate extends BundleCandidate {
  __source: OverrideSource;
  __muted: boolean;
  /** DB id of the override row that last shaped this candidate, if any. */
  __overrideId?: number;
}

function annotateBundle(bundle: QuestionBundle): {
  bundle: QuestionBundle;
  candidates: AnnotatedCandidate[];
} {
  return {
    bundle,
    candidates: bundle.candidates.map((c) => ({
      ...c,
      __source: "code",
      __muted: false,
    })),
  };
}

function applyOverrideLayer(
  candidates: AnnotatedCandidate[],
  actions: OverrideAction[],
  bundleId: string,
  layer: Exclude<OverrideSource, "code">,
): AnnotatedCandidate[] {
  let next = candidates.slice();
  for (const a of actions) {
    if (a.bundleId !== bundleId) continue;
    if (a.action === "mute") {
      next = next.map((c) =>
        c.archetype === a.archetype
          ? { ...c, __muted: true, __source: layer, __overrideId: a.id }
          : c,
      );
    } else if (a.action === "edit") {
      next = next.map((c) =>
        c.archetype === a.archetype
          ? {
              ...c,
              question_template: a.questionTemplate,
              __muted: false,
              __source: layer,
              __overrideId: a.id,
            }
          : c,
      );
    } else if (a.action === "add") {
      // "add" appends at the end so code defaults still win when both viable.
      // If a candidate with the same archetype already exists, treat it as an
      // edit-unmute (writer intends to re-introduce a previously-muted slot).
      const existingIdx = next.findIndex((c) => c.archetype === a.archetype);
      if (existingIdx >= 0) {
        const existing = next[existingIdx]!;
        next[existingIdx] = {
          ...existing,
          question_template: a.questionTemplate,
          kind: a.kind ?? existing.kind,
          __muted: false,
          __source: layer,
          __overrideId: a.id,
        };
      } else {
        next.push({
          archetype: a.archetype as ChartArchetypeId,
          question_template: a.questionTemplate,
          kind: a.kind ?? "signature",
          __source: layer,
          __muted: false,
          __overrideId: a.id,
        });
      }
    }
  }
  return next;
}

/**
 * Merge code defaults → category overrides → CE overrides for a single
 * bundle. Exported for unit tests; the assembler calls it internally.
 */
export function mergeBundleOverrides(
  bundle: QuestionBundle,
  categoryActions: OverrideAction[],
  ceActions: OverrideAction[],
): { bundle: QuestionBundle; candidates: AnnotatedCandidate[] } {
  const base = annotateBundle(bundle);
  const afterCategory = applyOverrideLayer(
    base.candidates,
    categoryActions,
    bundle.id,
    "category",
  );
  const afterCe = applyOverrideLayer(afterCategory, ceActions, bundle.id, "ce");
  return { bundle, candidates: afterCe };
}

export interface AssembledQuestion {
  question: string;
  archetype: ChartArchetypeId;
  rationale: string;
  kind: BankQuestionKind;
  /** Bundle id this chart was drawn from ("narrative" for forced-archetype slots). */
  bundle_id: string;
  /** Visitor intent the bundle answers ("narrative" for forced slots). */
  intent_id: string;
  /** Bundle score (0-N) at assembly time. */
  bundle_score: number;
  /** Signal keys that triggered/preferred this bundle. */
  triggering_signals: string[];
  /** Shared id for backwards-compatible topic grouping in provenance. */
  topic_id: string;
  /** Which override layer this candidate came from. */
  override_source: OverrideSource;
  /** DB id of the override row that shaped this candidate, when applicable. */
  override_id?: number;
  /**
   * True when this chart fills a template-forced or `required` slot
   * (mandatory — always part of the deck). False for optional bundle slots
   * (dynamic — the writer can opt out on the intel-first review step).
   */
  mandatory: boolean;
}

export interface DroppedQuestion {
  question: string;
  reason: string;
}

export interface AssembleInput {
  ceName: string;
  signals: ContextSignals;
  pageType?: PageType;
  /**
   * Archetypes that should never be emitted this run (e.g. a chronically-
   * weak archetype the writer just told us to retire). Bundle candidates
   * matching one of these are skipped with a drop note.
   */
  retireArchetypes?: ChartArchetypeId[];
  /**
   * Archetypes already present in an existing draft. Used during regen to
   * de-duplicate (the assembler will prefer a different archetype within
   * the same bundle when possible).
   */
  existingArchetypes?: ChartArchetypeId[];
  /**
   * Category-scope override actions, looked up by the caller against the
   * Headout subcategory id. Merged before CE overrides.
   */
  categoryOverrides?: OverrideAction[];
  /** CE-scope override actions, looked up by ce slug. Wins over category. */
  ceOverrides?: OverrideAction[];
  /**
   * Subcategory id used to look up mandatory archetypes from the question
   * bank. When provided, mandatory archetypes are emitted first (before the
   * normal slot loop), guaranteeing they appear in the deck regardless of
   * signal coverage.
   */
  subcategoryId?: string;
}

export interface AssembledDeck {
  pageType: PageType;
  selected: AssembledQuestion[];
  dropped: DroppedQuestion[];
  /** Bundle-level audit so the IntelPanel can render bundle chips with scores. */
  bundle_audit: {
    bundle_id: BundleId | "narrative";
    intent: VisitorIntentId | "narrative";
    fired: boolean;
    score: number;
    triggering_signals: string[];
    chosen_archetype: ChartArchetypeId | null;
    notes: string[];
  }[];
}

function scoreBundle(
  bundle: QuestionBundle,
  signals: ContextSignals,
): { score: number; triggered: string[]; gates_pass: boolean } {
  const counts = countSignalMatches(
    signals,
    bundle.required_signals,
    bundle.preferred_signals,
  );
  const triggered = [
    ...bundle.required_signals.filter((s) => Boolean(signals[s])),
    ...bundle.preferred_signals.filter((s) => Boolean(signals[s])),
  ];
  // Base 1.0 ensures non-zero ordering when no signals match.
  const score = 1 + counts.requiredHits * 2 + counts.preferredHits;
  return {
    score,
    triggered,
    gates_pass: counts.allRequired,
  };
}

function pickCandidate(
  bundle: QuestionBundle,
  candidates: AnnotatedCandidate[],
  signals: ContextSignals,
  usedArchetypes: Set<ChartArchetypeId>,
  retired: Set<ChartArchetypeId>,
  preferUnused: Set<ChartArchetypeId>,
  dropped: DroppedQuestion[],
  ceName: string,
): { candidate: AnnotatedCandidate; reason: string } | null {
  const viable = candidates.filter((c) => !c.__muted);
  // First pass: prefer candidates whose archetype isn't already in the deck
  // AND isn't in the "existingArchetypes" set from a prior draft.
  const passes: AnnotatedCandidate[][] = [
    viable.filter(
      (c) => !usedArchetypes.has(c.archetype) && !preferUnused.has(c.archetype),
    ),
    viable.filter((c) => !usedArchetypes.has(c.archetype)),
  ];
  // Walk each pass; only short-circuit when we actually return a candidate.
  // Previously this broke out of the loop whenever the first pass was
  // non-empty, which silently dropped viable fallback candidates when every
  // entry in the preferred-pass was retired / unimplemented / signal-gated.
  const seenInEarlierPass = new Set<ChartArchetypeId>();
  for (const pass of passes) {
    for (const c of pass) {
      if (seenInEarlierPass.has(c.archetype)) continue;
      seenInEarlierPass.add(c.archetype);
      if (retired.has(c.archetype)) {
        dropped.push({
          question: c.question_template.replace(/\{\{ceName\}\}/g, ceName),
          reason: `retired_archetype: ${c.archetype} was suppressed for this run`,
        });
        continue;
      }
      if (!isImplementedArchetype(c.archetype)) {
        dropped.push({
          question: c.question_template.replace(/\{\{ceName\}\}/g, ceName),
          reason: `viz_not_yet_built: archetype "${c.archetype}" reserved but renderer not landed`,
        });
        continue;
      }
      const requires = c.requires ?? [];
      const missing = requires.filter((s) => !signals[s]);
      if (missing.length > 0) {
        dropped.push({
          question: c.question_template.replace(/\{\{ceName\}\}/g, ceName),
          reason: `signal_missing: archetype "${c.archetype}" needs ${missing.join(", ")}`,
        });
        continue;
      }
      return {
        candidate: c,
        reason: `bundle "${bundle.id}" selected via signals: ${[
          ...(c.prefers ?? []).filter((s) => signals[s]),
          ...(c.requires ?? []),
        ].join(", ") || "no specific signal — bundle default"}`,
      };
    }
  }
  return null;
}

/**
 * Scan all bundles for a question template matching the given archetype.
 * Used to give mandatory archetypes a meaningful question string.
 */
function findQuestionTemplate(archetype: ChartArchetypeId): string {
  for (const bundle of Object.values(QUESTION_BUNDLES)) {
    for (const c of bundle.candidates) {
      if (c.archetype === archetype) return c.question_template;
    }
  }
  return `What are the key patterns at {{ceName}}?`;
}

export function assembleDeck(input: AssembleInput): AssembledDeck {
  const pageType = input.pageType ?? DEFAULT_PAGE_TYPE;
  const template = getPageTemplate(pageType);
  const retired = new Set<ChartArchetypeId>(input.retireArchetypes ?? []);
  const existing = new Set<ChartArchetypeId>(input.existingArchetypes ?? []);
  const categoryActions = input.categoryOverrides ?? [];
  const ceActions = input.ceOverrides ?? [];
  const usedArchetypes = new Set<ChartArchetypeId>();
  const usedBundles = new Set<BundleId>();
  const selected: AssembledQuestion[] = [];
  const dropped: DroppedQuestion[] = [];
  const audit: AssembledDeck["bundle_audit"] = [];

  // ── Mandatory archetypes pass ────────────────────────────────────────────
  // These fill slots before bundle scoring runs, ensuring subcategory-level
  // floor archetypes appear in the deck regardless of DRD signal coverage.
  if (input.subcategoryId) {
    const mandatories = getMandatoryArchetypes(input.subcategoryId);
    for (const arch of mandatories) {
      if (selected.length >= template.maxCharts) break;
      if (retired.has(arch)) {
        dropped.push({
          question: findQuestionTemplate(arch).replace(/\{\{ceName\}\}/g, input.ceName),
          reason: `mandatory_retired: ${arch} is in retireArchetypes — skipped even though mandatory for ${input.subcategoryId}`,
        });
        continue;
      }
      if (!isImplementedArchetype(arch)) {
        dropped.push({
          question: findQuestionTemplate(arch).replace(/\{\{ceName\}\}/g, input.ceName),
          reason: `mandatory_not_implemented: ${arch} is mandatory for ${input.subcategoryId} but renderer not yet landed`,
        });
        continue;
      }
      if (usedArchetypes.has(arch)) continue;
      const question = findQuestionTemplate(arch).replace(/\{\{ceName\}\}/g, input.ceName);
      selected.push({
        question,
        archetype: arch,
        rationale: `subcategory mandatory: "${arch}" always present for "${input.subcategoryId}"`,
        kind: "standard",
        bundle_id: "mandatory",
        intent_id: "mandatory",
        bundle_score: 10,
        triggering_signals: ["subcategory_mandatory"],
        topic_id: `mandatory:${arch}`,
        override_source: "code",
        override_id: undefined,
        mandatory: true,
      });
      usedArchetypes.add(arch);
      audit.push({
        bundle_id: "narrative",
        intent: "narrative",
        fired: true,
        score: 10,
        triggering_signals: ["subcategory_mandatory"],
        chosen_archetype: arch,
        notes: [`mandatory archetype for subcategory "${input.subcategoryId}"`],
      });
    }
  }

  for (const slot of template.slots) {
    if (selected.length >= template.maxCharts) break;

    // Forced-archetype slot (history page).
    if (slot.forcedArchetype) {
      const arch = slot.forcedArchetype;
      if (retired.has(arch) || !isImplementedArchetype(arch)) {
        audit.push({
          bundle_id: "narrative",
          intent: "narrative",
          fired: false,
          score: 0,
          triggering_signals: [],
          chosen_archetype: null,
          notes: ["forced archetype retired or not implemented"],
        });
        continue;
      }
      const question = (slot.forcedQuestionTemplate ?? "Tell the story of {{ceName}}.")
        .replace(/\{\{ceName\}\}/g, input.ceName);
      selected.push({
        question,
        archetype: arch,
        rationale: `page template forced archetype for ${pageType}`,
        kind: "signature",
        bundle_id: "narrative",
        intent_id: "narrative",
        bundle_score: 10,
        triggering_signals: ["page_template_forced"],
        topic_id: `${pageType}:narrative`,
        override_source: "code",
        override_id: undefined,
        mandatory: true,
      });
      usedArchetypes.add(arch);
      audit.push({
        bundle_id: "narrative",
        intent: "narrative",
        fired: true,
        score: 10,
        triggering_signals: ["page_template_forced"],
        chosen_archetype: arch,
        notes: [],
      });
      continue;
    }

    if (!slot.bundleId) continue;
    if (usedBundles.has(slot.bundleId)) {
      audit.push({
        bundle_id: slot.bundleId,
        intent: QUESTION_BUNDLES[slot.bundleId].intent,
        fired: false,
        score: 0,
        triggering_signals: [],
        chosen_archetype: null,
        notes: ["bundle already fired earlier in deck"],
      });
      continue;
    }

    const bundle = QUESTION_BUNDLES[slot.bundleId];
    const merged = mergeBundleOverrides(bundle, categoryActions, ceActions);
    const scored = scoreBundle(bundle, input.signals);
    if (!scored.gates_pass) {
      audit.push({
        bundle_id: bundle.id,
        intent: bundle.intent,
        fired: false,
        score: scored.score,
        triggering_signals: scored.triggered,
        chosen_archetype: null,
        notes: ["bundle required_signals not satisfied by DRD"],
      });
      if (slot.required) {
        dropped.push({
          question: `Required ${bundle.id} bundle for ${pageType}`,
          reason: `bundle_gate_missing: ${bundle.required_signals.join(", ")} not present in DRD signals`,
        });
      }
      continue;
    }

    const picked = pickCandidate(
      bundle,
      merged.candidates,
      input.signals,
      usedArchetypes,
      retired,
      existing,
      dropped,
      input.ceName,
    );
    if (!picked) {
      audit.push({
        bundle_id: bundle.id,
        intent: bundle.intent,
        fired: false,
        score: scored.score,
        triggering_signals: scored.triggered,
        chosen_archetype: null,
        notes: ["no viable candidate in bundle (all retired, missing signal, or already used)"],
      });
      continue;
    }

    const question = picked.candidate.question_template.replace(
      /\{\{ceName\}\}/g,
      input.ceName,
    );
    selected.push({
      question,
      archetype: picked.candidate.archetype,
      rationale: picked.reason,
      kind: picked.candidate.kind ?? "signature",
      bundle_id: bundle.id,
      intent_id: bundle.intent,
      bundle_score: scored.score,
      triggering_signals: scored.triggered,
      topic_id: bundle.id,
      override_source: picked.candidate.__source,
      override_id: picked.candidate.__overrideId,
      mandatory: slot.required === true,
    });
    usedArchetypes.add(picked.candidate.archetype);
    usedBundles.add(bundle.id);
    audit.push({
      bundle_id: bundle.id,
      intent: bundle.intent,
      fired: true,
      score: scored.score,
      triggering_signals: scored.triggered,
      chosen_archetype: picked.candidate.archetype,
      notes: [],
    });
  }

  // Trim if over the cap (defensive — slot loop already respects maxCharts).
  if (selected.length > template.maxCharts) {
    const overflow = selected.splice(template.maxCharts);
    for (const o of overflow) {
      dropped.push({
        question: o.question,
        reason: `page_cap: ${pageType} caps at ${template.maxCharts} charts`,
      });
    }
  }

  return {
    pageType,
    selected,
    dropped,
    bundle_audit: audit,
  };
}
