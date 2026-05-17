import { motion } from "framer-motion";
import { Flag, MapPin, Sparkles, Star } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { ACCENT_FG, ACCENT_FILL, ACCENT_SOFT, BRAND } from "@/lib/brand";
import { type FloorPlanFlowSpec } from "@/lib/chart-spec";

interface Props {
  spec: FloorPlanFlowSpec;
  context?: string;
  compact?: boolean;
}

const KIND_ACCENT: Record<
  FloorPlanFlowSpec["stops"][number]["kind"],
  "purps" | "candy" | "okay" | "slate"
> = {
  start: "okay",
  highlight: "candy",
  stop: "purps",
  end: "slate",
};

function fmtMin(m?: number): string | null {
  if (m == null) return null;
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}

export function FloorPlanFlowChart({
  spec,
  context,
  compact = false,
}: Props) {
  const { stops, total_min, start_label, callout } = spec;
  const totalLabel = fmtMin(total_min);

  return (
    <ChartCard
      context={context ?? "Suggested room-by-room flow"}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top strip with start label + total time. Both hidden in compact —
            embed hosts typically write the duration in their own caption. */}
        {!compact && (start_label || totalLabel) && (
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: 8, gap: 8, flexShrink: 0 }}
          >
            {start_label && (
              <span
                style={{
                  fontSize: "clamp(10px, 1.1cqi, 12px)",
                  fontWeight: 700,
                  color: BRAND.slate700,
                }}
              >
                Start: {start_label}
              </span>
            )}
            {totalLabel && (
              <span
                style={{
                  fontSize: "clamp(10px, 1.1cqi, 12px)",
                  fontWeight: 800,
                  color: BRAND.purps,
                  background: BRAND.purpsSoft,
                  padding: "2px 8px",
                  borderRadius: 999,
                }}
              >
                ~{totalLabel} total
              </span>
            )}
          </div>
        )}

        <div
          className="flex-1 flex flex-col min-h-0"
          style={{ justifyContent: "space-around" }}
        >
          {stops.map((s, i) => {
            const accent = s.accent ?? KIND_ACCENT[s.kind];
            const dwell = fmtMin(s.dwell_min);
            const isLast = i === stops.length - 1;
            const isHighlight = s.kind === "highlight";
            return (
              <div key={i} style={{ minWidth: 0 }}>
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.05 * i,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex items-start"
                  style={{ gap: compact ? 8 : 10 }}
                >
                  <div
                    className="flex flex-col items-center"
                    style={{ width: compact ? 22 : 26, flexShrink: 0 }}
                  >
                    <span
                      className="flex items-center justify-center"
                      style={{
                        width: compact ? 18 : 22,
                        height: compact ? 18 : 22,
                        borderRadius: 999,
                        background: ACCENT_FILL[accent],
                        color: "white",
                        boxShadow: `0 0 0 2px white, 0 0 0 3px ${ACCENT_FILL[accent]}`,
                      }}
                    >
                      {s.kind === "start" || s.kind === "end" ? (
                        <Flag size={compact ? 9 : 11} strokeWidth={3} />
                      ) : isHighlight ? (
                        <Star size={compact ? 9 : 11} strokeWidth={3} fill="white" />
                      ) : (
                        <span
                          style={{
                            fontSize: compact ? 9 : 11,
                            fontWeight: 800,
                          }}
                        >
                          {i}
                        </span>
                      )}
                    </span>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      className="flex items-baseline"
                      style={{ gap: 6, flexWrap: "wrap" }}
                    >
                      <span
                        style={{
                          fontSize: compact
                            ? "clamp(11px, 1.2cqi, 13px)"
                            : "clamp(12px, 1.3cqi, 14px)",
                          fontWeight: isHighlight ? 800 : 700,
                          color: BRAND.slate950,
                          lineHeight: 1.2,
                        }}
                      >
                        {s.name}
                      </span>
                      {s.level && (
                        <span
                          style={{
                            fontSize: "clamp(9px, 1cqi, 11px)",
                            fontWeight: 700,
                            color: BRAND.slate700,
                          }}
                        >
                          · {s.level}
                        </span>
                      )}
                      {dwell && (
                        <span
                          style={{
                            fontSize: "clamp(9px, 1cqi, 11px)",
                            fontWeight: 700,
                            color: ACCENT_FG[accent],
                            background: ACCENT_SOFT[accent],
                            padding: "1px 7px",
                            borderRadius: 999,
                          }}
                        >
                          {dwell}
                        </span>
                      )}
                      {!compact && isHighlight && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            color: BRAND.candy,
                          }}
                        >
                          Must see
                        </span>
                      )}
                    </div>
                    {!compact && s.note && (
                      <div
                        style={{
                          fontSize: "clamp(9px, 1cqi, 11px)",
                          fontWeight: 600,
                          color: BRAND.slate700,
                          marginTop: 2,
                          lineHeight: 1.35,
                        }}
                      >
                        {s.note}
                      </div>
                    )}
                  </div>
                  {s.kind !== "start" && s.kind !== "end" && (
                    <MapPin
                      size={compact ? 12 : 14}
                      color={BRAND.slate300}
                      aria-hidden="true"
                      style={{ flexShrink: 0, marginTop: 4 }}
                    />
                  )}
                </motion.div>
                {!isLast && (
                  <div
                    className="flex items-center"
                    style={{ paddingLeft: compact ? 9 : 11 }}
                  >
                    <span
                      style={{
                        width: 2,
                        height: compact ? 10 : 14,
                        background: BRAND.slate200,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!compact && callout && (
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
              {callout}
            </span>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
