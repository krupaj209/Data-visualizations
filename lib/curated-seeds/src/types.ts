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
  }>;
}
