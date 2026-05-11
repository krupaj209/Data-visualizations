export interface CuratedCe {
  ce: {
    slug: string;
    name: string;
    city: string;
    country: string;
    category: string;
    summary: string;
    emoji: string;
  };
  charts: Array<{
    slug: string;
    question: string;
    title: string;
    subtitle: string;
    insight: string;
    chart_type: string;
    spec: Record<string, unknown>;
    /**
     * Optional curated provenance — sources + per-field estimate notes
     * surfaced to writers so they can audit hand-curated numbers.
     */
    provenance?: Record<string, unknown>;
  }>;
}
