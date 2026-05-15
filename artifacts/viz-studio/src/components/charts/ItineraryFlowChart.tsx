import { motion } from "framer-motion";
import {
  ArrowRight,
  Bus,
  Flag,
  MapPin,
  Ship,
  Sparkles,
} from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { ACCENT_FG, ACCENT_FILL, ACCENT_SOFT, BRAND } from "@/lib/brand";
import { CALLOUT_PILL } from "@/lib/chart-system";
import { type ItineraryFlowSpec } from "@/lib/chart-spec";

interface Props {
  spec: ItineraryFlowSpec;
  context?: string;
  compact?: boolean;
}

const MODE_ICON: Record<ItineraryFlowSpec["mode"], typeof Bus> = {
  walk: Flag,
  bus: Bus,
  boat: Ship,
  mixed: Sparkles,
  day_trip: Bus,
};

const TRANSIT_ICON: Record<
  NonNullable<ItineraryFlowSpec["transits"][number]["mode"]>,
  typeof Bus
> = {
  walk: Flag,
  bus: Bus,
  boat: Ship,
  mixed: ArrowRight,
  transfer: ArrowRight,
};

const KIND_ACCENT: Record<
  ItineraryFlowSpec["stops"][number]["kind"],
  "candy" | "purps" | "okay" | "slate"
> = {
  start: "okay",
  highlight: "candy",
  stop: "slate",
  end: "purps",
};

function fmtMin(m?: number) {
  if (m == null) return null;
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}

export function ItineraryFlowChart({
  spec,
  context,
  compact = false,
}: Props) {
  const { mode, stops, transits, total_duration_min, callout } = spec;
  const ModeIcon = MODE_ICON[mode];
  const totalLabel = fmtMin(total_duration_min);

  return (
    <ChartCard
      context={context ?? "Stops, dwell, and transit"}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {!compact && (
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: 10, gap: 8 }}
          >
            <div className="flex items-center gap-2">
              <span
                className="flex items-center justify-center"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  background: ACCENT_SOFT.purps,
                  color: ACCENT_FG.purps,
                }}
              >
                <ModeIcon size={14} strokeWidth={2.5} />
              </span>
              <span
                style={{
                  fontSize: "clamp(11px, 1.3cqi, 14px)",
                  fontWeight: 800,
                  color: BRAND.slate950,
                  textTransform: "capitalize",
                }}
              >
                {mode.replace("_", " ")} itinerary
              </span>
            </div>
            {totalLabel && (
              <span
                style={{
                  fontSize: "clamp(10px, 1.1cqi, 12px)",
                  fontWeight: 700,
                  color: BRAND.slate700,
                }}
              >
                {totalLabel} total
              </span>
            )}
          </div>
        )}

        <div
          className="flex-1 flex flex-col min-h-0"
          style={{
            gap: 0,
            justifyContent: "space-around",
          }}
        >
          {stops.map((s, i) => {
            const accent = KIND_ACCENT[s.kind];
            const dwell = fmtMin(s.dwell_min);
            const transit = transits[i];
            const isLast = i === stops.length - 1;
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
                    style={{ width: compact ? 18 : 22, flexShrink: 0 }}
                  >
                    <span
                      className="flex items-center justify-center"
                      style={{
                        width: compact ? 14 : 16,
                        height: compact ? 14 : 16,
                        borderRadius: 999,
                        background: ACCENT_FILL[accent],
                        color: "#fff",
                        boxShadow: `0 0 0 2px #fff, 0 0 0 3px ${ACCENT_FILL[accent]}`,
                        marginTop: 3,
                      }}
                    >
                      {s.kind === "start" || s.kind === "end" ? (
                        <Flag size={compact ? 8 : 10} strokeWidth={3} />
                      ) : s.kind === "highlight" ? (
                        <Sparkles size={compact ? 8 : 10} strokeWidth={3} />
                      ) : (
                        <MapPin size={compact ? 8 : 10} strokeWidth={3} />
                      )}
                    </span>
                  </div>
                  <div
                    style={{
                      minWidth: 0,
                      flex: 1,
                      paddingBottom: compact ? 2 : 4,
                    }}
                  >
                    <div
                      className="flex items-baseline justify-between"
                      style={{ gap: 6 }}
                    >
                      <span
                        style={{
                          fontSize: compact
                            ? "clamp(10px, 1.1cqi, 12px)"
                            : "clamp(11px, 1.25cqi, 13px)",
                          fontWeight: s.kind === "highlight" ? 800 : 700,
                          color: BRAND.slate950,
                          lineHeight: 1.2,
                        }}
                      >
                        {s.name}
                      </span>
                      {dwell && (
                        <span
                          style={{
                            fontSize: "clamp(9px, 1cqi, 11px)",
                            fontWeight: 700,
                            color: ACCENT_FG[accent],
                            background: ACCENT_SOFT[accent],
                            padding: "1px 7px",
                            borderRadius: 999,
                            flexShrink: 0,
                          }}
                        >
                          {dwell}
                        </span>
                      )}
                    </div>
                    {!compact && s.note && (
                      <div
                        style={{
                          fontSize: "clamp(9px, 1cqi, 11px)",
                          fontWeight: 600,
                          color: BRAND.slate700,
                          marginTop: 1,
                          lineHeight: 1.3,
                        }}
                      >
                        {s.note}
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Transit segment between this stop and the next */}
                {!isLast && transit && (
                  <div
                    className="flex items-center"
                    style={{
                      gap: compact ? 8 : 10,
                      paddingLeft: 2,
                    }}
                  >
                    <div
                      className="flex flex-col items-center"
                      style={{ width: compact ? 18 : 22, flexShrink: 0 }}
                    >
                      <span
                        style={{
                          width: 2,
                          height: compact ? 14 : 18,
                          background: BRAND.slate200,
                        }}
                      />
                    </div>
                    <div
                      className="flex items-center"
                      style={{
                        gap: 6,
                        fontSize: compact
                          ? "clamp(8px, 0.95cqi, 10px)"
                          : "clamp(9px, 1cqi, 11px)",
                        fontWeight: 700,
                        color: BRAND.slate700,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        paddingTop: 2,
                        paddingBottom: 2,
                      }}
                    >
                      {(() => {
                        const TIcon = transit.mode
                          ? TRANSIT_ICON[transit.mode]
                          : ArrowRight;
                        return (
                          <TIcon
                            size={compact ? 10 : 12}
                            strokeWidth={2.5}
                            style={{ color: BRAND.slate500 }}
                          />
                        );
                      })()}
                      <span>{transit.minutes}m</span>
                      {!compact && transit.mode && (
                        <span style={{ color: BRAND.slate500 }}>
                          · {transit.mode}
                        </span>
                      )}
                      {!compact && transit.note && (
                        <span
                          style={{
                            color: BRAND.slate500,
                            textTransform: "none",
                            letterSpacing: 0,
                            fontWeight: 600,
                          }}
                        >
                          {transit.note}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!compact && callout && (
          <div className="flex justify-center" style={{ marginTop: 10 }}>
            <span
              style={{
                background: ACCENT_SOFT.candy,
                color: BRAND.candy,
                padding: `${CALLOUT_PILL.paddingY}px ${CALLOUT_PILL.paddingX}px`,
                borderRadius: CALLOUT_PILL.radius,
                fontSize: CALLOUT_PILL.fontSize,
                fontWeight: CALLOUT_PILL.fontWeight,
                lineHeight: 1.3,
                textAlign: "center",
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
