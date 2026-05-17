import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Trophy } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { ACCENT_FG, ACCENT_FILL, ACCENT_SOFT, BRAND } from "@/lib/brand";
import { type TimeValueMatrixSpec } from "@/lib/chart-spec";

interface Props {
  spec: TimeValueMatrixSpec;
  context?: string;
  compact?: boolean;
}

export function TimeValueMatrixChart({
  spec,
  context,
  compact = false,
}: Props) {
  const { scenarios, dimensions, summary, insight } = spec;

  // Compact rule: shrink to the top-3 highest-average scenarios so a tiny
  // embed doesn't try to render 5 columns of 6 rows at 280px wide. Default
  // mode keeps every scenario.
  const visibleScenarios = useMemo(() => {
    if (!compact || scenarios.length <= 3) return scenarios;
    const avg = scenarios.map((_, si) => {
      const sum = dimensions.reduce((a, d) => a + (d.scores[si] ?? 0), 0);
      return { si, avg: sum / Math.max(dimensions.length, 1) };
    });
    avg.sort((a, b) => b.avg - a.avg);
    const keep = new Set(avg.slice(0, 3).map((x) => x.si));
    return scenarios.filter((_, i) => keep.has(i));
  }, [compact, scenarios, dimensions]);
  const visibleIndices = visibleScenarios.map((s) =>
    scenarios.findIndex((x) => x.id === s.id),
  );

  const bestIdx = scenarios.findIndex(
    (s) => s.id === summary.best_value_scenario,
  );
  const cols = visibleScenarios.length;
  const gridCols = `minmax(110px, 1.3fr) repeat(${cols}, minmax(70px, 1fr))`;

  return (
    <ChartCard
      context={context ?? summary.headline ?? "Time vs value by scenario"}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowX: "auto",
            overflowY: "visible",
          }}
        >
          {/* Scenario header row */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: gridCols,
              minWidth: 110 + cols * 70,
              gap: compact ? 4 : 8,
              marginBottom: compact ? 6 : 10,
            }}
          >
            <div
              style={{
                position: "sticky",
                left: 0,
                background: "white",
                zIndex: 2,
              }}
            />
            {visibleScenarios.map((s, i) => {
              const isBest = scenarios[visibleIndices[i]!]?.id === scenarios[bestIdx]?.id;
              return (
                <div
                  key={s.id}
                  className="flex flex-col items-center"
                  style={{
                    background: isBest ? ACCENT_SOFT[s.accent] : "transparent",
                    border: isBest
                      ? `1.5px solid ${ACCENT_FILL[s.accent]}`
                      : `1px solid ${BRAND.slate200}`,
                    borderRadius: 10,
                    padding: compact ? "4px 6px" : "6px 8px",
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: ACCENT_FILL[s.accent],
                      marginBottom: 3,
                    }}
                  />
                  <span
                    style={{
                      fontSize: compact
                        ? "clamp(9px, 1.05cqi, 11px)"
                        : "clamp(10px, 1.15cqi, 12px)",
                      fontWeight: 800,
                      color: BRAND.slate950,
                      lineHeight: 1.15,
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "100%",
                    }}
                  >
                    {s.label}
                  </span>
                  {(s.time_label || s.price_label) && (
                    <span
                      style={{
                        fontSize: "clamp(8px, 0.95cqi, 10px)",
                        fontWeight: 700,
                        color: BRAND.slate700,
                        marginTop: 2,
                        textAlign: "center",
                      }}
                    >
                      {[s.time_label, s.price_label].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  {!compact && isBest && (
                    <span
                      className="flex items-center"
                      style={{
                        gap: 3,
                        marginTop: 3,
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: ACCENT_FG[s.accent],
                      }}
                    >
                      <Trophy size={9} strokeWidth={3} />
                      Best value
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dimension rows */}
          <div
            className="flex flex-col"
            style={{ gap: compact ? 4 : 6 }}
          >
            {dimensions.map((dim, di) => {
              const visibleScores = visibleIndices.map(
                (si) => dim.scores[si] ?? 0,
              );
              const winner = visibleScores.indexOf(Math.max(...visibleScores));
              return (
                <div
                  key={di}
                  className="grid items-center"
                  style={{
                    gridTemplateColumns: gridCols,
                    minWidth: 110 + cols * 70,
                    gap: compact ? 4 : 8,
                    paddingTop: compact ? 3 : 5,
                    paddingBottom: compact ? 3 : 5,
                    borderTop: `1px solid ${BRAND.slate100}`,
                  }}
                >
                  <div
                    style={{
                      position: "sticky",
                      left: 0,
                      background: "white",
                      zIndex: 1,
                      paddingRight: 6,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: compact
                          ? "clamp(9px, 1.05cqi, 11px)"
                          : "clamp(10px, 1.15cqi, 12px)",
                        fontWeight: 800,
                        color: BRAND.slate950,
                        lineHeight: 1.2,
                      }}
                    >
                      {dim.label}
                    </div>
                    {!compact && dim.note && (
                      <div
                        style={{
                          fontSize: "clamp(9px, 1cqi, 11px)",
                          fontWeight: 600,
                          color: BRAND.slate700,
                          marginTop: 1,
                          lineHeight: 1.3,
                        }}
                      >
                        {dim.note}
                      </div>
                    )}
                  </div>
                  {visibleScenarios.map((s, ai) => {
                    const score = Math.max(0, Math.min(100, visibleScores[ai] ?? 0));
                    const isWin = ai === winner;
                    return (
                      <div
                        key={ai}
                        style={{ minWidth: 0, position: "relative" }}
                      >
                        <div
                          style={{
                            background: BRAND.slate100,
                            borderRadius: 6,
                            height: compact ? 14 : 18,
                            overflow: "hidden",
                            position: "relative",
                          }}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${score}%` }}
                            transition={{
                              duration: 0.65,
                              delay: 0.05 * (di * cols + ai),
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            style={{
                              height: "100%",
                              background: ACCENT_FILL[s.accent],
                              borderRadius: 6,
                              opacity: isWin ? 1 : 0.55,
                            }}
                          />
                          <span
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "clamp(9px, 1cqi, 11px)",
                              fontWeight: 800,
                              color: BRAND.slate950,
                              mixBlendMode: "luminosity",
                            }}
                          >
                            {score}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {!compact && insight && (
          <div
            className="flex items-start gap-2"
            style={{ marginTop: 10, flexShrink: 0 }}
          >
            <Sparkles
              size={14}
              strokeWidth={2.5}
              style={{ color: BRAND.candy, marginTop: 1, flexShrink: 0 }}
            />
            <span
              style={{
                color: BRAND.slate900,
                fontSize: "clamp(10px, 1.1cqi, 12px)",
                fontWeight: 600,
                lineHeight: 1.35,
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
