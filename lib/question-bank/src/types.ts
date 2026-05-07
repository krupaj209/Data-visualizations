/**
 * Stable identifiers for the chart archetypes Viz Studio currently supports.
 * Mirror of the discriminator strings in
 * `artifacts/api-server/src/lib/chart-spec.ts`.
 */
export type ChartArchetypeId =
  | "weekly_pattern"
  | "hourly_heatmap"
  | "month_calendar"
  | "booking_window"
  | "stat_grid"
  | "compare_zones"
  | "donut_breakdown"
  | "seasonal_curve"
  | "ticket_ladder";

export interface ChartArchetype {
  id: ChartArchetypeId;
  /** Short human label used in admin UIs and prompt construction. */
  label: string;
  /** Plain-English description of the visitor question this archetype answers. */
  answers: string;
  /** Bullet list of the data shape required to populate the spec. */
  data_shape: string[];
  /**
   * Subcategories where this archetype is typically a strong fit. The pipeline
   * uses these as soft hints when no explicit `recommended_archetype` is given
   * by a question-bank entry.
   */
  typical_subcategories: SubcategoryId[];
  /** Whether the chart supports interactive overlays (hover, focus tooltip, etc.). */
  interactive: boolean;
}

/**
 * Subcategory identifiers (Headout taxonomy). Keep slugs stable — the
 * `subcategories` table on the platform side will use the same ids.
 */
export type SubcategoryId =
  | "landmarks"
  | "museums"
  | "sightseeing_cruises"
  | "day_trips"
  | "guided_tours"
  | "theme_parks"
  | "walking_tours"
  | "hop_on_hop_off"
  | "plays"
  | "helicopter_tours"
  | "cooking_classes"
  | "wineries"
  | "spa"
  | "outdoor_activities"
  | "combos";

export interface SubcategoryMeta {
  id: SubcategoryId;
  label: string;
  /** Short prose context fed to the LLM when adapting the bank to a specific CE. */
  description: string;
}

export interface BankQuestion {
  /** Visitor-facing phrasing of the question. ≤ 12 words, sentence case. */
  question: string;
  /** Preferred archetype to answer this question. */
  recommended_archetype: ChartArchetypeId;
  /**
   * Optional gating clause in plain English. The orchestrator passes this to
   * the LLM which decides whether the condition holds for the specific CE
   * given its DRD.
   */
  applies_when?: string;
  /** Editorial notes for both the LLM and a human writer reviewing later. */
  notes?: string;
}

export interface SubcategoryBank {
  subcategory: SubcategoryMeta;
  /** Curated questions specific to the subcategory. */
  questions: BankQuestion[];
  /**
   * If true, this subcategory has no curated bank yet — only cross-cutting
   * questions inherited from `CROSS_CUTTING_QUESTIONS` are seeded, and the
   * orchestrator is expected to bootstrap a draft set from the DRD.
   */
  unratified: boolean;
}
