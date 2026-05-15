import {
  CHART_ARCHETYPES,
  type ChartArchetypeId,
} from "@workspace/question-bank";

/**
 * Structured representation of "don't do X" / "must do Y" hints the writer
 * leaves in the regen feedback box. Lives on the CE row (jsonb) so a
 * follow-up regen without new feedback inherits the same bans.
 */
export interface RegenConstraints {
  /** Archetype ids the writer asked us to drop (e.g. "ticket_ladder"). */
  bannedArchetypes: ChartArchetypeId[];
  /** Topic keywords / topic_ids the writer asked us to drop. */
  bannedTopics: string[];
  /**
   * Lowercased question-phrase fragments. If a candidate question
   * contains any of these substrings, it's dropped.
   */
  bannedQuestionPhrases: string[];
  /** Topics the writer wants us to lean into. */
  mustIncludeTopics: string[];
  /** Free-text tone / direction hints (kept for the prompt). */
  toneNotes: string[];
  /**
   * True when the writer signalled the deck is too generic / repeats /
   * needs a refresh. Triggers the diversification rule.
   */
  diversifyRequested: boolean;
  updatedAt: string;
}

export function emptyRegenConstraints(): RegenConstraints {
  return {
    bannedArchetypes: [],
    bannedTopics: [],
    bannedQuestionPhrases: [],
    mustIncludeTopics: [],
    toneNotes: [],
    diversifyRequested: false,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * True when the constraint set carries no ban / inclusion / diversify
 * signal. Used to short-circuit prompt + post-processing branches.
 */
export function isEmptyConstraints(c: RegenConstraints): boolean {
  return (
    c.bannedArchetypes.length === 0 &&
    c.bannedTopics.length === 0 &&
    c.bannedQuestionPhrases.length === 0 &&
    c.mustIncludeTopics.length === 0 &&
    c.toneNotes.length === 0 &&
    !c.diversifyRequested
  );
}

/**
 * Defensive load: a row from `cesTable.regenConstraints` may be null,
 * partial, or from an older shape. Normalize to a fully-populated
 * RegenConstraints, dropping unknown archetypes silently.
 */
export function loadRegenConstraints(
  raw: unknown,
): RegenConstraints {
  const empty = emptyRegenConstraints();
  if (!raw || typeof raw !== "object") return empty;
  const r = raw as Record<string, unknown>;
  const knownArchetypes = new Set(Object.keys(CHART_ARCHETYPES));
  return {
    bannedArchetypes: asStringArray(r["bannedArchetypes"]).filter((a) =>
      knownArchetypes.has(a),
    ) as ChartArchetypeId[],
    bannedTopics: asStringArray(r["bannedTopics"]).map((s) =>
      s.toLowerCase(),
    ),
    bannedQuestionPhrases: asStringArray(r["bannedQuestionPhrases"]).map(
      (s) => s.toLowerCase(),
    ),
    mustIncludeTopics: asStringArray(r["mustIncludeTopics"]),
    toneNotes: asStringArray(r["toneNotes"]),
    diversifyRequested: r["diversifyRequested"] === true,
    updatedAt:
      typeof r["updatedAt"] === "string" ? (r["updatedAt"] as string) : empty.updatedAt,
  };
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/* -------------------------------------------------------------------------- */
/* Free-text → structured constraints (rule-based)                            */
/* -------------------------------------------------------------------------- */

/**
 * Rough phrase → archetype map covering the ways writers refer to charts
 * in the feedback box. Order matters only insofar as we union all
 * matches into the banned set, so multi-archetype phrases (e.g. "ticket
 * comparison") fan out to every plausible archetype.
 */
const ARCHETYPE_PHRASES: Array<{
  pattern: RegExp;
  archetypes: ChartArchetypeId[];
  topic?: string;
}> = [
  // Price / ticket / fare comparisons.
  {
    pattern:
      /\b(price|pricing|fare|cost)\s+(comparison|chart|comparisons|breakdown|curve)\b/,
    archetypes: ["ticket_ladder", "price_curve", "savings_breakdown"],
    topic: "price_comparison",
  },
  {
    pattern: /\bticket\s+(ladder|comparison|tiers|tier\s+chart)\b/,
    archetypes: ["ticket_ladder"],
    topic: "ticket_tiers",
  },
  { pattern: /\bprice[- ]?curve\b/, archetypes: ["price_curve"], topic: "price_curve" },
  {
    pattern: /\bsavings?\s+(breakdown|chart)\b/,
    archetypes: ["savings_breakdown"],
    topic: "savings",
  },
  // Crowd / queue / wait charts.
  {
    pattern: /\b(crowd|crowds|crowding|crowd\s+chart|crowd\s+charts)\b/,
    archetypes: ["weekly_pattern", "hourly_heatmap", "seasonal_curve"],
    topic: "crowd_timing",
  },
  {
    pattern: /\b(queue|queues|wait\s+time|wait[- ]times?)\s*(comparison|chart)?\b/,
    archetypes: ["queue_compare", "compare_zones", "zone_wait_heatmap"],
    topic: "queue",
  },
  // Booking-window.
  {
    pattern: /\bbooking[- ]?(window|curve|chart)\b/,
    archetypes: ["booking_window"],
    topic: "booking_window",
  },
  // Seasonal / monthly.
  {
    pattern: /\b(seasonal|month(?:ly)?|when\s+to\s+visit)\s*(curve|chart)?\b/,
    archetypes: ["seasonal_curve", "month_calendar"],
    topic: "seasonality",
  },
  // Weekly pattern.
  {
    pattern: /\b(weekly|day[- ]of[- ]week|weekday)\s*(pattern|chart)?\b/,
    archetypes: ["weekly_pattern"],
    topic: "weekly_pattern",
  },
  // Hourly heatmap.
  {
    pattern: /\b(hourly|hour[- ]by[- ]hour|by[- ]hour)\s*(heatmap|chart|map)?\b/,
    archetypes: ["hourly_heatmap"],
    topic: "hourly",
  },
  // Duration.
  {
    pattern: /\b(duration|how\s+long|time[- ]to[- ]visit)\s*(profile|profiles|chart)?\b/,
    archetypes: ["duration_stat"],
    topic: "duration",
  },
  // Slot compare.
  {
    pattern: /\bslot\s+(compare|comparison)\b/,
    archetypes: ["slot_compare"],
    topic: "slot_compare",
  },
  // History timeline.
  {
    pattern: /\b(history|historical|timeline)\s*(timeline|chart)?\b/,
    archetypes: ["history_timeline"],
    topic: "history",
  },
];

/**
 * "Drop X" / "remove X" / "no X" / "stop showing X" sentence templates
 * that take a chart-noun on the right-hand side.
 */
const NEGATIVE_LEADERS =
  /\b(no|don['’]?t|do\s+not|stop|skip|drop|remove|without|avoid|ditch|kill|exclude|hide|less)\b/i;

/** "Make it about X" / "more about X" / "include X" / "lean into X" / "we want X". */
const POSITIVE_LEADERS =
  /\b(make\s+it\s+(?:more\s+)?about|more\s+about|focus\s+on|lean\s+(?:in)?to|include|we\s+want|we'd\s+like|highlight|emphasize|show\s+more)\b/i;

const DIVERSIFY_HINTS = [
  /\bgeneric\b/i,
  /\b(?:looks|feels|seems)\s+the\s+same\b/i,
  /\bsame\s+(?:as\s+)?(?:before|last\s+time|previous)\b/i,
  /\bweak\b/i,
  /\bbland\b/i,
  /\bboring\b/i,
  /\bmix\s+it\s+up\b/i,
  /\bdifferent\b/i,
  /\bfresh(?:er)?\s+(?:angle|take)\b/i,
  /\bnot\s+(?:helpful|useful)\b/i,
  /\baccademia[- ]?level\b/i,
];

export interface ParsedFeedback {
  parsed: RegenConstraints;
  /**
   * Human-readable lines describing what was honored. Surfaced to the
   * writer so they trust the parser landed on the right intent.
   */
  honored: string[];
}

/**
 * Parse a single feedback string into a fresh RegenConstraints object.
 * Pure / deterministic — does not call out to any LLM. Designed so that
 * an LLM-pass can later refine the result without changing the contract.
 */
export function parseFeedback(feedback: string | undefined): ParsedFeedback {
  const result = emptyRegenConstraints();
  const honored: string[] = [];
  const text = (feedback ?? "").trim();
  if (!text) return { parsed: result, honored };

  result.toneNotes.push(text);

  const lowered = text.toLowerCase();

  // Sentence-ish split so leading polarity (no/drop/include) can be
  // matched against the chart-noun on the right-hand side without
  // dragging in unrelated clauses from other sentences.
  const clauses = lowered
    .split(/[.!?\n;,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const clause of clauses) {
    const isNegative = NEGATIVE_LEADERS.test(clause);
    const isPositive = POSITIVE_LEADERS.test(clause);

    for (const entry of ARCHETYPE_PHRASES) {
      if (!entry.pattern.test(clause)) continue;
      if (isNegative) {
        for (const a of entry.archetypes) {
          if (!result.bannedArchetypes.includes(a)) {
            result.bannedArchetypes.push(a);
          }
        }
        if (entry.topic && !result.bannedTopics.includes(entry.topic)) {
          result.bannedTopics.push(entry.topic);
        }
        // Capture the chart-noun phrase too so a question whose text
        // contains the same words is dropped even if its archetype
        // wasn't on the list.
        const m = clause.match(entry.pattern);
        if (m && m[0]) {
          const phrase = m[0].trim();
          if (
            phrase.length >= 3 &&
            !result.bannedQuestionPhrases.includes(phrase)
          ) {
            result.bannedQuestionPhrases.push(phrase);
          }
        }
        honored.push(
          `Suppressed ${entry.topic ?? entry.archetypes.join("/")} on writer request`,
        );
      } else if (isPositive) {
        if (entry.topic && !result.mustIncludeTopics.includes(entry.topic)) {
          result.mustIncludeTopics.push(entry.topic);
          honored.push(`Leaning into ${entry.topic}`);
        }
      }
    }

    // "drop X chart" / "drop the X chart" — generic catch-all that
    // pulls the noun phrase as a banned question phrase, so even
    // archetypes our phrase list doesn't recognise still get filtered.
    if (isNegative) {
      const m =
        clause.match(/\b(?:drop|remove|no|skip|kill|hide|exclude)\s+(?:the\s+)?([a-z][a-z0-9 \-_/]{2,40})\b/);
      if (m && m[1]) {
        const phrase = m[1].trim().replace(/\s+chart$/, "");
        if (
          phrase.length >= 3 &&
          !result.bannedQuestionPhrases.includes(phrase)
        ) {
          result.bannedQuestionPhrases.push(phrase);
          honored.push(`Suppressed any chart matching "${phrase}"`);
        }
      }
    }
  }

  if (DIVERSIFY_HINTS.some((re) => re.test(lowered))) {
    result.diversifyRequested = true;
    honored.push(
      "Will diversify the deck — at least half the picks must change",
    );
  }

  // Always diversify when the writer left non-empty feedback at all —
  // the first-pass UX expectation is that "I clicked regen with feedback"
  // already implies "give me something different".
  if (text.length > 0 && !result.diversifyRequested) {
    result.diversifyRequested = true;
  }

  return { parsed: result, honored: dedupe(honored) };
}

function dedupe(xs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

/**
 * Merge two constraint sets. The "incoming" set is the freshly-parsed
 * feedback from the current click; the "stored" set is the prior
 * constraints persisted on the CE row. The merged set is what we
 * persist back so the next click inherits the union.
 *
 * Positive / negative collisions: if a topic is in stored.bannedTopics
 * but in incoming.mustIncludeTopics, the new feedback wins (writer just
 * said "actually I do want that"). Same for archetypes.
 */
export function mergeConstraints(
  stored: RegenConstraints,
  incoming: RegenConstraints,
): RegenConstraints {
  const bannedArchetypes = unionArr(
    stored.bannedArchetypes,
    incoming.bannedArchetypes,
  ).filter(
    (a) => !incoming.mustIncludeTopics.some((t) => topicMatchesArchetype(t, a)),
  );
  const bannedTopics = unionArr(stored.bannedTopics, incoming.bannedTopics)
    .filter((t) => !incoming.mustIncludeTopics.includes(t));
  const bannedQuestionPhrases = unionArr(
    stored.bannedQuestionPhrases,
    incoming.bannedQuestionPhrases,
  );
  const mustIncludeTopics = unionArr(
    stored.mustIncludeTopics,
    incoming.mustIncludeTopics,
  );
  const toneNotes = unionArr(stored.toneNotes, incoming.toneNotes).slice(-6);
  return {
    bannedArchetypes: bannedArchetypes as ChartArchetypeId[],
    bannedTopics,
    bannedQuestionPhrases,
    mustIncludeTopics,
    toneNotes,
    diversifyRequested:
      stored.diversifyRequested || incoming.diversifyRequested,
    updatedAt: new Date().toISOString(),
  };
}

function unionArr<T>(a: T[], b: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const x of [...a, ...b]) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

function topicMatchesArchetype(topic: string, archetype: string): boolean {
  // Loose: the topic phrase appears in (or matches) the archetype id.
  // Used to honor "make it more about price" undoing a stored ban on
  // price_curve / ticket_ladder.
  const t = topic.toLowerCase();
  const a = archetype.toLowerCase();
  return a.includes(t) || t.includes(a);
}
