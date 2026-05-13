/**
 * Evidence-kind taxonomy (Task #63).
 *
 * Every provenance citation (web source, DRD snippet, intelligence fact,
 * generator estimate) carries an EvidenceKind so writers can see at a
 * glance WHAT TYPE of evidence backs each chart's numbers.
 *
 *   official    — operator/official site, government, museum, transit op
 *   marketplace — OTA / reseller (GetYourGuide, Viator, Headout, Klook…)
 *   review      — review platform / forum / community (TripAdvisor, Reddit…)
 *   inferred    — DRD analyst inference / educated extrapolation
 *   estimate    — generator (LLM) estimate, no external source
 *   unknown     — legacy or unclassifiable; UI surfaces neutrally
 */
export const EVIDENCE_KINDS = [
  "official",
  "marketplace",
  "review",
  "inferred",
  "estimate",
  "unknown",
] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export function isEvidenceKind(v: unknown): v is EvidenceKind {
  return typeof v === "string" && (EVIDENCE_KINDS as readonly string[]).includes(v);
}

/* -------------------------------------------------------------------------- */
/* Domain → kind heuristic                                                     */
/* -------------------------------------------------------------------------- */

const MARKETPLACE_DOMAINS = [
  "getyourguide.",
  "viator.",
  "headout.",
  "klook.",
  "tiqets.",
  "musement.",
  "ticketmaster.",
  "civitatis.",
  "expedia.",
  "booking.com",
];

const REVIEW_DOMAINS = [
  "tripadvisor.",
  "yelp.",
  "reddit.com",
  "quora.com",
  "lonelyplanet.",
  "timeout.",
  "thecrazytourist.",
  "afar.",
  "fodors.",
  "frommers.",
];

const OFFICIAL_DOMAIN_HINTS = [
  ".gov",
  ".gob.",
  ".gouv.",
  "europa.eu",
  ".museum",
  "tourism.",
  "visit",
];

/**
 * Best-effort URL → EvidenceKind classifier. Used to back-fill `kind` on
 * grounding sources Gemini surfaced (where the model didn't tag them) and
 * on legacy author citations. Returns "unknown" when nothing matches —
 * never guesses "official" without a strong hint.
 */
export function kindFromUrl(url: string | undefined | null): EvidenceKind {
  if (!url || typeof url !== "string") return "unknown";
  const lower = url.toLowerCase();
  for (const d of MARKETPLACE_DOMAINS) {
    if (lower.includes(d)) return "marketplace";
  }
  for (const d of REVIEW_DOMAINS) {
    if (lower.includes(d)) return "review";
  }
  for (const d of OFFICIAL_DOMAIN_HINTS) {
    if (lower.includes(d)) return "official";
  }
  return "unknown";
}

/* -------------------------------------------------------------------------- */
/* Intelligence-adapter source → kind                                          */
/* -------------------------------------------------------------------------- */

/**
 * Default EvidenceKind for each intelligence-adapter source. The orchestrator
 * uses this to tag IntelFacts at fetch time so downstream UIs (writer
 * citations popover, sources footer) can colour-code without re-deriving.
 */
export const INTEL_SOURCE_KIND: Record<string, EvidenceKind> = {
  official_site: "official",
  tripadvisor: "review",
  reddit: "review",
  getyourguide: "marketplace",
  viator: "marketplace",
  headout: "marketplace",
};

export function kindFromIntelSource(source: string | undefined): EvidenceKind {
  if (!source) return "unknown";
  return INTEL_SOURCE_KIND[source] ?? "unknown";
}

/* -------------------------------------------------------------------------- */
/* DRD-section → kind                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Heuristic DRD-section classifier. The orchestrator scans the DRD markdown
 * once and slices it into kind-tagged buckets. When a snippet quotes back
 * the DRD verbatim, this lookup tells us which bucket it came from so we
 * can colour-code the citation.
 *
 * Lowercased section heading text → kind.
 */
const DRD_HEADING_KIND_RULES: { match: RegExp; kind: EvidenceKind }[] = [
  // Official / operator / government
  { match: /(official|operator|ticketing|opening hours|hours|programme|admission)/i, kind: "official" },
  // Marketplace / OTA / reseller / pricing
  { match: /(getyourguide|viator|headout|marketplace|ota|operator pricing|tour operators)/i, kind: "marketplace" },
  // Reviews / sentiment / community
  { match: /(review|sentiment|reddit|tripadvisor|forum|community|visitor tips|q&a)/i, kind: "review" },
  // Inferred / analyst / honest gaps / synthesis
  { match: /(honest gap|inference|inferred|synthesis|analyst|hypothesis|estimate|low confidence)/i, kind: "inferred" },
];

/**
 * Walk a DRD markdown blob and produce { kind → joined text } so the
 * pipeline can grep snippets back to the section they came from. The walk
 * is heading-driven (## / ### headings); content under untagged headings
 * falls into "unknown".
 */
export function partitionDrdByKind(drdMarkdown: string): Record<EvidenceKind, string> {
  const out: Record<EvidenceKind, string> = {
    official: "",
    marketplace: "",
    review: "",
    inferred: "",
    estimate: "",
    unknown: "",
  };
  if (!drdMarkdown) return out;

  const lines = drdMarkdown.split(/\r?\n/);
  let current: EvidenceKind = "unknown";
  for (const line of lines) {
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
    if (heading) {
      const text = heading[2] ?? "";
      const rule = DRD_HEADING_KIND_RULES.find((r) => r.match.test(text));
      current = rule ? rule.kind : "unknown";
      continue;
    }
    out[current] += line + "\n";
  }
  return out;
}

/**
 * Given a DRD snippet (verbatim phrase the model claims to have used),
 * find which kind-bucket of the partitioned DRD contains it. Falls back
 * to "unknown" when the snippet can't be located (paraphrase, drift).
 */
export function classifyDrdSnippet(
  snippet: string,
  partitioned: Record<EvidenceKind, string>,
): EvidenceKind {
  const needle = snippet.trim().slice(0, 60).toLowerCase();
  if (needle.length < 8) return "unknown";
  for (const k of EVIDENCE_KINDS) {
    if (k === "estimate" || k === "unknown") continue;
    if (partitioned[k].toLowerCase().includes(needle)) return k;
  }
  return "unknown";
}
