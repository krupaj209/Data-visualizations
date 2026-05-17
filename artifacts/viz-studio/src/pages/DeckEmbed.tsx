import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Loader2 } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { ChartRenderer } from "@/components/charts";
import { type ChartSpec } from "@/lib/chart-spec";

/**
 * Page-deck-aware embed: /embed/:ceSlug/:pageType/:sectionId
 *
 * Fetches the resolved deck from the new /api/page-decks endpoint and
 * renders the single matching section. Falls back to a friendly stub when
 * the section's chart is still "pending-generation" (i.e. the section's
 * question maps to a chart type we don't have a renderer for yet).
 *
 * The legacy /embed/:id route (single-chart, chart-id-addressed) is
 * unchanged — this route is purely additive so live CMS embeds keep
 * resolving.
 */

interface ResolvedSection {
  id: string;
  archetype: string;
  name: string;
  chartType: string;
  chartSpec: { status?: string; type?: string; spec?: unknown } | Record<string, unknown>;
  editorial: {
    headline: string;
    subheadline: string;
    cta?: string;
    confidenceBadge: "high" | "medium" | "low";
    lastUpdated: string;
    personalizationNote?: string;
  };
  layout: string;
}

interface ResolvedDeck {
  ceSlug: string;
  pageType: string;
  sections: ResolvedSection[];
  metadata: {
    totalSections: number;
    totalCharts: number;
    estimatedReadTime: number;
    personalizationApplied: boolean;
    lastGenerated: string;
    drdVersion: string;
  };
  missingSections: Array<{ archetype: string; reason: string; fallbackMessage: string }>;
}

export default function DeckEmbed() {
  const params = useParams<{
    ceSlug: string;
    pageType: string;
    sectionId: string;
  }>();
  const { ceSlug, pageType, sectionId } = params;

  const [deck, setDeck] = useState<ResolvedDeck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.classList.add("embed-mode");
    return () => document.body.classList.remove("embed-mode");
  }, []);

  useEffect(() => {
    if (!ceSlug || !pageType) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(
      `/api/page-decks/${encodeURIComponent(ceSlug)}/${encodeURIComponent(pageType)}`,
    )
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data: ResolvedDeck) => {
        if (!cancelled) {
          setDeck(data);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ceSlug, pageType]);

  if (loading) {
    return (
      <FullCenter>
        <Loader2 className="animate-spin" color={BRAND.purps} size={20} />
      </FullCenter>
    );
  }
  if (error || !deck) {
    return <FullCenter>Deck unavailable{error ? ` — ${error}` : "."}</FullCenter>;
  }

  const section = deck.sections.find((s) => s.id === sectionId);
  if (!section) {
    return (
      <FullCenter>
        <div style={{ padding: 16, textAlign: "center" }}>
          <div>Section not found.</div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
            Available: {deck.sections.map((s) => s.id).join(", ") || "(none)"}
          </div>
        </div>
      </FullCenter>
    );
  }

  const status =
    typeof section.chartSpec === "object" &&
    section.chartSpec !== null &&
    "status" in section.chartSpec
      ? (section.chartSpec as { status?: string }).status
      : undefined;

  const isPending = status === "pending-generation";

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "white",
        display: "flex",
        flexDirection: "column",
        padding: 12,
        boxSizing: "border-box",
        fontFamily: "Manrope, system-ui, sans-serif",
        color: BRAND.slate700,
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>
          {section.editorial.headline}
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          {section.editorial.subheadline}
        </div>
        {section.editorial.personalizationNote && (
          <div style={{ fontSize: 11, color: BRAND.purps, marginTop: 2 }}>
            {section.editorial.personalizationNote}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {isPending ? (
          <PendingStub
            chartType={section.chartType}
            archetype={section.archetype}
          />
        ) : (
          <ChartRenderer spec={section.chartSpec as unknown as ChartSpec} />
        )}
      </div>
    </div>
  );
}

function PendingStub({
  chartType,
  archetype,
}: {
  chartType: string;
  archetype: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
        background: "#FAF8FF",
        borderRadius: 12,
        border: `1px dashed ${BRAND.purps}33`,
        color: BRAND.slate700,
        textAlign: "center",
        padding: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 24 }}>⏳</div>
        <div style={{ fontWeight: 600, marginTop: 4 }}>
          Chart pending generation
        </div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
          {archetype} · {chartType}
        </div>
      </div>
    </div>
  );
}

function FullCenter({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "grid",
        placeItems: "center",
        background: "white",
        color: BRAND.slate700,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}
