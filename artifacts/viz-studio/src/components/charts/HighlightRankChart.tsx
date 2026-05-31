import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { type HighlightRankSpec } from "@/lib/chart-spec";

interface Props {
  spec: HighlightRankSpec;
  context?: string;
  compact?: boolean;
}

/**
 * Horizontal ranked-bar chart of named artworks / rides / exhibits sorted
 * highest visitor-priority-score first.
 *
 * Color banding:
 *   score ≥ 70  → purps  (top tier)
 *   score 40–69 → okay amber  (mid tier)
 *   score < 40  → slate  (lower tier)
 *
 * The item with `highlight: true` gets a purps ring around its name + bar.
 * Badge renders as a small pill to the right of the item name.
 *
 * Compact mode: drops badges, insight, tightens bar heights to 12px.
 */
export function HighlightRankChart({ spec, context, compact = false }: Props) {
  const { items, score_label, insight } = spec;

  const sorted = [...items].sort((a, b) => b.score - a.score);

  const colorFor = (score: number) => {
    if (score >= 70)
      return { fill: BRAND.purps, soft: BRAND.purpsSoft, fg: "white" };
    if (score >= 40)
      return { fill: BRAND.hola, soft: BRAND.holaSoft, fg: BRAND.hola };
    return { fill: BRAND.slate500, soft: BRAND.slate100, fg: BRAND.slate700 };
  };

  const BAR_HEIGHT = compact
    ? "12px"
    : "clamp(20px, 2.6cqi, 30px)";

  return (
    <ChartCard context={context ?? score_label} compact={compact}>
      <div className="flex-1 flex flex-col min-h-0">
        {!compact && (
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div
              style={{
                color: BRAND.slate900,
                fontSize: "clamp(11px, 1.2cqi, 13px)",
                fontWeight: 800,
              }}
            >
              {score_label}
            </div>
            <div className="flex items-center gap-1.5">
              <span
                style={{
                  background: BRAND.purpsSoft,
                  color: BRAND.purps,
                  fontSize: "clamp(9px, 1cqi, 11px)",
                  fontWeight: 700,
                  borderRadius: 6,
                  padding: "2px 7px",
                }}
              >
                Top tier ≥ 70
              </span>
              <span
                style={{
                  background: BRAND.holaSoft,
                  color: BRAND.hola,
                  fontSize: "clamp(9px, 1cqi, 11px)",
                  fontWeight: 700,
                  borderRadius: 6,
                  padding: "2px 7px",
                }}
              >
                Mid 40–69
              </span>
              <span
                style={{
                  background: BRAND.slate100,
                  color: BRAND.slate700,
                  fontSize: "clamp(9px, 1cqi, 11px)",
                  fontWeight: 700,
                  borderRadius: 6,
                  padding: "2px 7px",
                }}
              >
                Lower &lt; 40
              </span>
            </div>
          </div>
        )}

        <div
          className="flex-1 flex flex-col"
          style={{ gap: compact ? "5px" : "clamp(6px, 0.9cqi, 10px)", minHeight: 0 }}
        >
          {sorted.map((item, i) => {
            const c = colorFor(item.score);
            const widthPct = Math.max((item.score / 100) * 100, 4);
            const isHighlight = item.highlight === true;

            return (
              <div
                key={`${item.name}-${i}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 38%) 1fr",
                  columnGap: 10,
                  alignItems: "center",
                  borderRadius: isHighlight ? 10 : 0,
                  outline: isHighlight
                    ? `2px solid ${BRAND.purps}`
                    : undefined,
                  outlineOffset: isHighlight ? 2 : undefined,
                  padding: isHighlight ? "3px 4px" : undefined,
                }}
              >
                <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                  <div
                    style={{
                      color: BRAND.slate900,
                      fontWeight: 800,
                      fontSize: "clamp(11px, 1.25cqi, 14px)",
                      lineHeight: 1.15,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.name}
                  </div>
                  {!compact && item.badge && (
                    <span
                      style={{
                        background: BRAND.purpsSoft,
                        color: BRAND.purps,
                        fontSize: "clamp(8px, 0.9cqi, 10px)",
                        fontWeight: 700,
                        borderRadius: 5,
                        padding: "1px 5px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>

                <div className="relative" style={{ height: BAR_HEIGHT }}>
                  <div
                    className="absolute inset-0"
                    style={{ background: BRAND.slate100, borderRadius: 8 }}
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPct}%` }}
                    transition={{
                      duration: 0.85,
                      delay: 0.1 + i * 0.06,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="absolute h-full flex items-center justify-end pr-2"
                    style={{ background: c.fill, borderRadius: 8 }}
                  >
                    <span
                      style={{
                        color: "white",
                        fontWeight: 800,
                        fontSize: "clamp(10px, 1.1cqi, 12px)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.score}
                    </span>
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>

        {!compact && insight && (
          <div
            className="mt-3"
            style={{
              color: BRAND.slate700,
              fontSize: "clamp(10px, 1.1cqi, 12px)",
              fontWeight: 600,
              lineHeight: 1.35,
            }}
          >
            {insight}
          </div>
        )}
      </div>
    </ChartCard>
  );
}
