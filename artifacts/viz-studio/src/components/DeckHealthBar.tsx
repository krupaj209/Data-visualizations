import { BRAND } from "@/lib/brand";
import type { DeckHealth } from "@/lib/deck-health";
import { deckVerdict } from "@/lib/deck-health";

interface SegmentDef {
  key: keyof DeckHealth["firstChartId"];
  label: string;
  color: string;
  textColor: string;
  softColor: string;
}

const SEGMENTS: SegmentDef[] = [
  {
    key: "verified",
    label: "Verified",
    color: BRAND.okayGreen,
    textColor: BRAND.okayInk,
    softColor: BRAND.bgMint,
  },
  {
    key: "estimated",
    label: "Estimated",
    color: BRAND.candy,
    textColor: BRAND.candy,
    softColor: BRAND.candySoft,
  },
  {
    key: "needsAttention",
    label: "Needs attention",
    color: BRAND.hola,
    textColor: BRAND.hola,
    softColor: BRAND.holaSoft,
  },
];

interface Props {
  health: DeckHealth;
  isLocked: boolean;
  isGenerating: boolean;
  /** Called with the first chart ID in that bucket when a segment is clicked. */
  onScrollTo: (chartId: number) => void;
}

/**
 * Horizontal segmented health bar shown at the top of the CE detail page.
 * Segments: mint = verified, candy = estimated, amber = needs attention.
 * Clicking a segment scrolls to the first chart in that bucket.
 * On locked CEs the needs-attention segment is hidden (curated charts can't
 * be regenerated so surfacing it would be misleading).
 */
export function DeckHealthBar({
  health,
  isLocked,
  isGenerating,
  onScrollTo,
}: Props) {
  if (health.total === 0 && !isGenerating) return null;

  const verdict = deckVerdict(health, isGenerating, isLocked);
  const isReady =
    !isGenerating && health.needsAttention === 0 && health.verified === health.total && health.total > 0;
  const hasAttention = !isLocked && health.needsAttention > 0;

  const visibleSegments = isLocked
    ? SEGMENTS.filter((s) => s.key !== "needsAttention")
    : SEGMENTS;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        background: "white",
        border: `1px solid ${hasAttention ? BRAND.holaSoft : BRAND.slate200}`,
        borderRadius: 14,
        marginBottom: 20,
      }}
    >
      {isGenerating ? (
        <div
          style={{
            flex: 1,
            height: 8,
            borderRadius: 4,
            background: BRAND.slate100,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(90deg, ${BRAND.slate100} 0%, ${BRAND.purpsSoft} 50%, ${BRAND.slate100} 100%)`,
              backgroundSize: "200% 100%",
              animation: "deckHealthShimmer 1.4s ease-in-out infinite",
            }}
          />
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            height: 8,
            borderRadius: 4,
            background: BRAND.slate100,
            overflow: "hidden",
            display: "flex",
            gap: 2,
          }}
          role="group"
          aria-label="Deck health"
        >
          {visibleSegments.map((seg) => {
            const count =
              seg.key === "verified"
                ? health.verified
                : seg.key === "estimated"
                  ? health.estimated
                  : health.needsAttention;
            if (count === 0) return null;
            const pct = (count / health.total) * 100;
            const firstId = health.firstChartId[seg.key];
            return (
              <button
                key={seg.key}
                type="button"
                title={`${count} ${seg.label.toLowerCase()} — click to scroll`}
                aria-label={`${count} ${seg.label.toLowerCase()}`}
                onClick={() => {
                  if (firstId !== null) onScrollTo(firstId);
                }}
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: seg.color,
                  border: "none",
                  padding: 0,
                  cursor: firstId !== null ? "pointer" : "default",
                  borderRadius: 4,
                  transition: "opacity 120ms",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "0.75";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "1";
                }}
              />
            );
          })}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        {!isGenerating &&
          visibleSegments.map((seg) => {
            const count =
              seg.key === "verified"
                ? health.verified
                : seg.key === "estimated"
                  ? health.estimated
                  : health.needsAttention;
            if (count === 0) return null;
            const firstId = health.firstChartId[seg.key];
            return (
              <button
                key={seg.key}
                type="button"
                onClick={() => {
                  if (firstId !== null) onScrollTo(firstId);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: seg.softColor,
                  color: seg.textColor,
                  border: "none",
                  padding: "2px 8px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.01em",
                  cursor: firstId !== null ? "pointer" : "default",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: seg.color,
                    flexShrink: 0,
                  }}
                />
                {count} {seg.label.toLowerCase()}
              </button>
            );
          })}

        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: isReady
              ? BRAND.okayInk
              : hasAttention
                ? BRAND.hola
                : BRAND.slate700,
            whiteSpace: "nowrap",
          }}
        >
          {verdict}
        </span>
      </div>

      <style>{`
        @keyframes deckHealthShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
