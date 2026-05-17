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
  signals: ContextSignals,
  usedArchetypes: Set<ChartArchetypeId>,
  retired: Set<ChartArchetypeId>,
  preferUnused: Set<ChartArchetypeId>,
  dropped: DroppedQuestion[],
  ceName: string,
): { candidate: BundleCandidate; reason: string } | null {
  // First pass: prefer candidates whose archetype isn't already in the deck
  // AND isn't in the "existingArchetypes" set from a prior draft.
  const passes: BundleCandidate[][] = [
    bundle.candidates.filter(
      (c) => !usedArchetypes.has(c.archetype) && !preferUnused.has(c.archetype),
    ),
    bundle.candidates.filter((c) => !usedArchetypes.has(c.archetype)),
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

export function assembleDeck(input: AssembleInput): AssembledDeck {
  const pageType = input.pageType ?? DEFAULT_PAGE_TYPE;
  const template = getPageTemplate(pageType);
  const retired = new Set<ChartArchetypeId>(input.retireArchetypes ?? []);
  const existing = new Set<ChartArchetypeId>(input.existingArchetypes ?? []);
  const usedArchetypes = new Set<ChartArchetypeId>();
  const usedBundles = new Set<BundleId>();
  const selected: AssembledQuestion[] = [];
  const dropped: DroppedQuestion[] = [];
  const audit: AssembledDeck["bundle_audit"] = [];

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
