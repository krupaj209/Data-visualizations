import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { Legend, LegendItem } from "@/components/charts/system";
import { type StopFrequencySpec } from "@/lib/chart-spec";

interface Props {
  spec: StopFrequencySpec;
  context?: string;
  compact?: boolean;
}

const PEAK_COLOR = BRAND.purps;
const OFF_COLOR = BRAND.purpsSoft;

function niceCeil(v: number): number {
  if (v <= 10) return 10;
  if (v <= 20) return 20;
  if (v <= 30) return 30;
  if (v <= 45) return 45;
  if (v <= 60) return 60;
  return Math.ceil(v / 30) * 30;
}

export function StopFrequencyChart({ spec, context, compact = false }: Props) {
  const stops = spec.stops;
  const rawMax = Math.max(
    ...stops.map((s) => Math.max(s.peak_headway_min, s.offpeak_headway_min)),
    10,
  );
  const maxHeadway = niceCeil(rawMax);
  const tickStep = maxHeadway >= 60 ? 15 : maxHeadway >= 30 ? 10 : 5;
  const ticks: number[] = [];
  for (let t = 0; t <= maxHeadway; t += tickStep) ticks.push(t);

  return (
    <ChartCard
      context={context ?? spec.route_label ?? "Bus headway by stop"}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {!compact && (
          <div className="flex items-center justify-between mb-2 gap-2">
            <div
              style={{
                fontSize: "clamp(11px, 1.25cqi, 13px)",
                color: BRAND.slate700,
                fontWeight: 700,
              }}
            >
              Minutes between buses
            </div>
            <Legend>
              <LegendItem color={PEAK_COLOR} label="Peak" />
              <LegendItem color={OFF_COLOR} label="Off-peak" />
            </Legend>
          </div>
        )}

        <div
          className="flex-1 flex min-h-0"
          style={{ gap: compact ? 4 : 8 }}
        >
          {!compact && (
            <div
              className="relative"
              style={{
                width: 32,
                flexShrink: 0,
                paddingTop: 14,
                paddingBottom: 0,
              }}
            >
              {ticks
                .slice()
                .reverse()
                .map((t) => {
                  const pct = ((maxHeadway - t) / maxHeadway) * 100;
                  return (
                    <div
                      key={t}
                      className="absolute right-0 flex items-center justify-end"
                      style={{
                        top: `calc(14px + (100% - 14px) * ${pct / 100})`,
                        transform: "translateY(-50%)",
                        fontSize: "clamp(9px, 0.95cqi, 10px)",
                        color: BRAND.slate500,
                        fontWeight: 600,
                        lineHeight: 1,
                        paddingRight: 4,
                      }}
                    >
                      {t}
                    </div>
                  );
                })}
            </div>
          )}

          <div
            className="flex-1 grid items-end min-h-0 relative"
            style={{
              gridTemplateColumns: `repeat(${stops.length}, minmax(0, 1fr))`,
              columnGap: "clamp(3px, 0.6cqi, 8px)",
              paddingTop: 14,
            }}
          >
            {!compact &&
              ticks.slice(1).map((t) => {
                const pct = (t / maxHeadway) * 100;
                return (
                  <div
                    key={t}
                    className="absolute left-0 right-0 pointer-events-none"
                    style={{
                      bottom: `calc(${pct}% * (100% - 14px) / 100%)`,
                      top: "auto",
                      borderTop: `1px dashed ${BRAND.slate100}`,
                      height: 0,
                    }}
                  />
                );
              })}

            {stops.map((s, i) => {
              const peakPct = (s.peak_headway_min / maxHeadway) * 100;
              const offPct = (s.offpeak_headway_min / maxHeadway) * 100;
              return (
                <div
                  key={i}
                  className="relative h-full flex flex-col items-center justify-end"
                >
                  <div
                    className="relative w-full flex items-end justify-center"
                    style={{ flex: 1, minHeight: 0, gap: 2 }}
                  >
                    <div
                      className="relative flex-1 flex flex-col justify-end items-center"
                      style={{ height: "100%" }}
                    >
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${peakPct}%` }}
                        transition={{
                          duration: 0.7,
                          delay: 0.03 * i,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        style={{
                          width: "100%",
                          background: PEAK_COLOR,
                          borderTopLeftRadius: 4,
                          borderTopRightRadius: 4,
                          minHeight: 2,
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: -13,
                            left: 0,
                            right: 0,
                            textAlign: "center",
                            fontSize: compact
                              ? "clamp(9px, 1cqi, 11px)"
                              : "clamp(9px, 1cqi, 11px)",
                            fontWeight: 800,
                            color: PEAK_COLOR,
                            lineHeight: 1,
                          }}
                        >
                          {s.peak_headway_min}
                        </div>
                      </motion.div>
                    </div>
                    <div
                      className="relative flex-1 flex flex-col justify-end items-center"
                      style={{ height: "100%" }}
                    >
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${offPct}%` }}
                        transition={{
                          duration: 0.7,
                          delay: 0.03 * i + 0.05,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        style={{
                          width: "100%",
                          background: OFF_COLOR,
                          borderTopLeftRadius: 4,
                          borderTopRightRadius: 4,
                          minHeight: 2,
                          position: "relative",
                        }}
                      >
                        {!compact && (
                          <div
                            style={{
                              position: "absolute",
                              top: -13,
                              left: 0,
                              right: 0,
                              textAlign: "center",
                              fontSize: "clamp(9px, 1cqi, 11px)",
                              fontWeight: 700,
                              color: BRAND.slate700,
                              lineHeight: 1,
                            }}
                          >
                            {s.offpeak_headway_min}
                          </div>
                        )}
                      </motion.div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="grid mt-1"
          style={{
            gridTemplateColumns: compact
              ? `32px repeat(${stops.length}, minmax(0, 1fr))`
              : `32px repeat(${stops.length}, minmax(0, 1fr))`,
            columnGap: compact ? 4 : 8,
            borderTop: `1px solid ${BRAND.slate100}`,
            paddingTop: 6,
          }}
        >
          <div
            style={{
              fontSize: "clamp(8px, 0.9cqi, 10px)",
              color: BRAND.slate500,
              fontWeight: 700,
              textAlign: "right",
              paddingRight: 4,
            }}
          >
            {compact ? "min" : ""}
          </div>
          <div
            style={{
              gridColumn: `2 / span ${stops.length}`,
              display: "grid",
              gridTemplateColumns: `repeat(${stops.length}, minmax(0, 1fr))`,
              columnGap: "clamp(3px, 0.6cqi, 8px)",
            }}
          >
            {stops.map((s, i) => {
              const showLabel = compact
                ? stops.length <= 4 ||
                  i % Math.ceil(stops.length / 4) === 0 ||
                  i === stops.length - 1
                : true;
              return (
                <div
                  key={i}
                  className="text-center"
                  style={{
                    fontSize: compact
                      ? "clamp(8px, 0.9cqi, 10px)"
                      : "clamp(9px, 1cqi, 11px)",
                    fontWeight: 700,
                    color: BRAND.slate700,
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={s.name}
                >
                  {showLabel ? s.name : ""}
                </div>
              );
            })}
          </div>
        </div>

        {!compact && (
          <div
            className="mt-2 text-center"
            style={{
              fontSize: "clamp(9px, 1cqi, 11px)",
              color: BRAND.slate500,
              fontWeight: 600,
            }}
          >
            {stops.length} stops · longest off-peak wait{" "}
            {Math.max(...stops.map((s) => s.offpeak_headway_min))} min
          </div>
        )}
      </div>
    </ChartCard>
  );
}
