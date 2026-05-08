import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { ACCENT_FG, ACCENT_FILL, ACCENT_SOFT, BRAND } from "@/lib/brand";
import { CHART_TYPE } from "@/lib/chart-system";
import { type SlotCompareSpec } from "@/lib/chart-spec";

interface Props {
  spec: SlotCompareSpec;
  context?: string;
  compact?: boolean;
}

/**
 * Renders as grouped horizontal bars (chosen over a radar). At a 320×320
 * embed, a 3-axis radar with 3 overlapping polygons becomes hard to read
 * (axes crowd, polygon strokes intersect, labels collide). Grouped bars
 * give every (slot × dimension) cell its own row + tick, scale linearly,
 * and stay legible down to ~280px wide. Documented in `replit.md`.
 */
export function SlotCompareChart({ spec, context, compact = false }: Props) {
  const { slots, dimensions, insight } = spec;

  return (
    <ChartCard
      context={context ?? "Compare your time slot"}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Slot legend */}
        {!compact && (
          <div
            className="flex flex-wrap items-center"
            style={{ gap: 8, marginBottom: 10 }}
          >
            {slots.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5"
                style={{
                  background: s.recommended
                    ? ACCENT_SOFT[s.accent]
                    : "transparent",
                  border: s.recommended
                    ? `1.5px solid ${ACCENT_FILL[s.accent]}`
                    : `1px solid ${BRAND.slate200}`,
                  borderRadius: 999,
                  padding: "4px 10px",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: ACCENT_FILL[s.accent],
                  }}
                />
                <span
                  style={{
                    fontSize: "clamp(10px, 1.1cqi, 12px)",
                    fontWeight: 800,
                    color: BRAND.slate950,
                  }}
                >
                  {s.name}
                </span>
                {s.time_window && (
                  <span
                    style={{
                      fontSize: "clamp(9px, 1cqi, 11px)",
                      color: BRAND.slate700,
                      fontWeight: 600,
                    }}
                  >
                    {s.time_window}
                  </span>
                )}
                {s.recommended && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      color: ACCENT_FG[s.accent],
                      textTransform: "uppercase",
                    }}
                  >
                    Pick
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Dimension rows */}
        <div
          className="flex-1 flex flex-col min-h-0"
          style={{ gap: compact ? 8 : 12, justifyContent: "space-around" }}
        >
          {dimensions.map((dim, dIdx) => {
            const winnerIdx = dim.scores.indexOf(Math.max(...dim.scores));
            return (
              <div key={dIdx}>
                <div
                  className="flex items-baseline justify-between"
                  style={{ marginBottom: 4 }}
                >
                  <span
                    style={{
                      fontSize: compact
                        ? "clamp(10px, 1.1cqi, 12px)"
                        : CHART_TYPE.catLabel.fontSize,
                      fontWeight: 800,
                      color: BRAND.slate900,
                      lineHeight: 1.15,
                    }}
                  >
                    {dim.label}
                  </span>
                  {!compact && (
                    <span
                      style={{
                        fontSize: "clamp(9px, 1cqi, 11px)",
                        fontWeight: 700,
                        color: ACCENT_FG[slots[winnerIdx]?.accent ?? "purps"],
                      }}
                    >
                      {slots[winnerIdx]?.name} leads
                    </span>
                  )}
                </div>
                <div
                  className="flex flex-col"
                  style={{ gap: compact ? 3 : 4 }}
                >
                  {slots.map((s, sIdx) => {
                    const score = dim.scores[sIdx] ?? 0;
                    const isWin = sIdx === winnerIdx;
                    const fill = isWin
                      ? ACCENT_FILL[s.accent]
                      : ACCENT_SOFT[s.accent];
                    const labelColor = isWin ? "white" : ACCENT_FG[s.accent];
                    return (
                      <div
                        key={sIdx}
                        className="flex items-center gap-2"
                      >
                        {!compact && (
                          <span
                            style={{
                              flexShrink: 0,
                              width: 56,
                              fontSize: "clamp(9px, 1cqi, 11px)",
                              fontWeight: 700,
                              color: BRAND.slate700,
                              textAlign: "right",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {s.name}
                          </span>
                        )}
                        <div
                          style={{
                            flex: 1,
                            height: compact ? 14 : 18,
                            background: BRAND.slate100,
                            borderRadius: 999,
                            overflow: "hidden",
                            position: "relative",
                          }}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(score, 0)}%` }}
                            transition={{
                              duration: 0.7,
                              delay: 0.1 + dIdx * 0.08 + sIdx * 0.04,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            style={{
                              height: "100%",
                              background: fill,
                              borderRadius: 999,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              paddingRight: 6,
                              color: labelColor,
                              fontSize: 10,
                              fontWeight: 800,
                            }}
                          >
                            {score >= 12 && <span>{score}</span>}
                          </motion.div>
                          {compact && (
                            <span
                              style={{
                                position: "absolute",
                                left: 6,
                                top: "50%",
                                transform: "translateY(-50%)",
                                fontSize: 9,
                                fontWeight: 800,
                                color: BRAND.slate900,
                                opacity: score < 18 ? 1 : 0,
                              }}
                            >
                              {s.name[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {!compact && insight && (
          <div
            className="flex items-start gap-2"
            style={{ marginTop: 12, flexShrink: 0 }}
          >
            <span
              className="flex items-center justify-center shrink-0"
              style={{ color: BRAND.candy, marginTop: 1 }}
            >
              <Sparkles size={14} strokeWidth={2.5} />
            </span>
            <span
              style={{
                color: BRAND.slate900,
                fontSize: "clamp(10px, 1.1cqi, 12px)",
                fontWeight: 600,
                lineHeight: 1.3,
              }}
            >
              {insight}
            </span>
          </div>
        )}
      </div>
    </ChartCard>
  );
}

