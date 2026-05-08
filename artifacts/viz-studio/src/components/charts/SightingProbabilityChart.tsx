import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import { ACCENT_FILL, ACCENT_SOFT, BRAND, type AccentKey } from "@/lib/brand";
import { CALLOUT_PILL, CHART_TYPE } from "@/lib/chart-system";
import {
  CalloutPill,
  ChartTooltip,
  Legend,
  LegendItem,
  SourcesFooter,
} from "@/components/charts/system";
import {
  MONTH_LABELS,
  MONTH_ORDER,
  type ChartProvenanceLite,
  type SightingProbabilitySpec,
} from "@/lib/chart-spec";

interface Props {
  spec: SightingProbabilitySpec;
  context?: string;
  compact?: boolean;
  provenance?: ChartProvenanceLite | null;
}

const ACCENT_ROTATION: AccentKey[] = ["purps", "candy", "hola", "okay"];

export function SightingProbabilityChart({
  spec,
  context,
  compact,
  provenance,
}: Props) {
  const series = useMemo(
    () =>
      spec.series.map((s, i) => ({
        ...s,
        accent: (s.accent ?? ACCENT_ROTATION[i % ACCENT_ROTATION.length]) as AccentKey,
        // Pad / truncate to exactly 12 — guards against schema drift.
        monthly: Array.from(
          { length: 12 },
          (_, idx) => s.monthly?.[idx] ?? 0,
        ),
      })),
    [spec.series],
  );

  const display: SightingProbabilitySpec["display"] =
    series.length === 1 ? "single" : spec.display;

  // Best/worst markers based on the lead series (first one).
  const lead = series[0];
  const peakIdx = lead
    ? lead.monthly.reduce((best, v, i) => (v > lead.monthly[best] ? i : best), 0)
    : -1;
  const lowIdx = lead
    ? lead.monthly.reduce((best, v, i) => (v < lead.monthly[best] ? i : best), 0)
    : -1;

  // Y-scale: stacked needs sum, otherwise just 100.
  const maxY =
    display === "stacked"
      ? Math.max(
          ...MONTH_ORDER.map((_, i) =>
            series.reduce((s, ser) => s + ser.monthly[i], 0),
          ),
          1,
        )
      : 100;

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  return (
    <ChartCard
      context={context ?? "Sighting probability by month"}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className="flex-1 grid items-end min-h-0"
          style={{
            gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
            columnGap: "clamp(5px, 1cqi, 11px)",
            paddingTop: compact ? 14 : 26,
          }}
        >
          {MONTH_ORDER.map((month, i) => {
            const totalPct = series.reduce(
              (s, ser) => s + ser.monthly[i],
              0,
            );
            const heightPct = Math.max((totalPct / maxY) * 100, 4);
            return (
              <div
                key={month}
                className="relative h-full flex flex-col items-center justify-end"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() =>
                  setHoverIdx((h) => (h === i ? null : h))
                }
                onTouchStart={() => setHoverIdx(i)}
                onTouchEnd={() => setHoverIdx(null)}
              >
                {hoverIdx === i && (
                  <ChartTooltip
                    anchorXPct={50}
                    placement="above"
                    offset={6}
                    style={{ bottom: `calc(${heightPct}% + 6px)` }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: 800 }}>
                        {MONTH_LABELS[month]}
                      </div>
                      {series.map((ser) => (
                        <div
                          key={ser.name}
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            opacity: 0.9,
                          }}
                        >
                          {ser.name}: {Math.round(ser.monthly[i])}%
                        </div>
                      ))}
                    </div>
                  </ChartTooltip>
                )}
                {!compact && i === peakIdx && lead && (
                  <div
                    className="absolute z-10 left-1/2 -translate-x-1/2 pointer-events-none"
                    style={{ bottom: `calc(${heightPct}% + 6px)` }}
                  >
                    <div
                      style={{
                        background: ACCENT_FILL[lead.accent],
                        color: "white",
                        padding: `${CALLOUT_PILL.paddingY}px ${CALLOUT_PILL.paddingX}px`,
                        borderRadius: CALLOUT_PILL.radius,
                        fontSize: CALLOUT_PILL.fontSize,
                        fontWeight: CALLOUT_PILL.fontWeight,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {Math.round(lead.monthly[i])}%
                    </div>
                  </div>
                )}

                {/* Stacked / single column. For "grouped", we render N skinny
                    bars side-by-side instead of one stacked column. */}
                {display === "grouped" ? (
                  <div
                    className="w-full flex items-end justify-center"
                    style={{
                      height: "100%",
                      gap: 1,
                      maxWidth: 28,
                      margin: "0 auto",
                    }}
                  >
                    {series.map((ser, sIdx) => {
                      const v = ser.monthly[i];
                      const h = Math.max((v / 100) * 100, 2);
                      const isLead = sIdx === 0;
                      return (
                        <motion.div
                          key={ser.name}
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{
                            duration: 0.6,
                            delay: 0.04 + i * 0.02,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          style={{
                            flex: 1,
                            background:
                              i === peakIdx && isLead
                                ? ACCENT_FILL[ser.accent]
                                : ACCENT_SOFT[ser.accent],
                            borderTopLeftRadius: 4,
                            borderTopRightRadius: 4,
                          }}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className="w-full flex flex-col-reverse"
                    style={{
                      height: `${heightPct}%`,
                      maxWidth: 22,
                      margin: "0 auto",
                      borderTopLeftRadius: 8,
                      borderTopRightRadius: 8,
                      overflow: "hidden",
                      borderBottomLeftRadius: 3,
                      borderBottomRightRadius: 3,
                    }}
                  >
                    {series.map((ser, sIdx) => {
                      const v = ser.monthly[i];
                      if (v <= 0) return null;
                      // For "single" series, segment fills the whole bar.
                      const segPct =
                        display === "stacked"
                          ? (v / Math.max(totalPct, 1)) * 100
                          : 100;
                      const isLead = sIdx === 0;
                      const useAccent = i === peakIdx && isLead;
                      return (
                        <motion.div
                          key={ser.name}
                          initial={{ flexGrow: 0 }}
                          animate={{ flexGrow: segPct }}
                          transition={{
                            duration: 0.6,
                            delay: 0.04 + i * 0.02,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          style={{
                            background: useAccent
                              ? ACCENT_FILL[ser.accent]
                              : ACCENT_SOFT[ser.accent],
                            flexBasis: 0,
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          className="grid mt-1.5"
          style={{
            gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
            columnGap: "clamp(5px, 1cqi, 11px)",
            borderTop: `1px solid ${BRAND.slate100}`,
            paddingTop: 5,
          }}
        >
          {MONTH_ORDER.map((m, i) => (
            <div
              key={m}
              className="text-center"
              style={{
                fontSize: CHART_TYPE.axisTick.fontSize,
                color:
                  i === peakIdx
                    ? BRAND.purps
                    : i === lowIdx
                      ? BRAND.slate500
                      : BRAND.slate900,
                fontWeight: CHART_TYPE.axisTick.fontWeight,
              }}
            >
              {MONTH_LABELS[m]}
            </div>
          ))}
        </div>

        {!compact && (
          <>
            {series.length > 1 && (
              <Legend>
                {series.map((s) => (
                  <LegendItem
                    key={s.name}
                    color={ACCENT_FILL[s.accent]}
                    label={s.name}
                  />
                ))}
              </Legend>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {spec.best_months.length > 0 && (
                <CalloutPill bg={BRAND.bgMint} fg={BRAND.okayInk}>
                  Best · {spec.best_months.join(", ")}
                </CalloutPill>
              )}
              {spec.worst_months.length > 0 && (
                <CalloutPill bg={BRAND.slate100} fg={BRAND.slate700}>
                  Worst · {spec.worst_months.join(", ")}
                </CalloutPill>
              )}
              {spec.confidence_note && (
                <span
                  style={{
                    fontSize: "clamp(9px, 1cqi, 11px)",
                    color: BRAND.slate500,
                    fontWeight: 600,
                  }}
                >
                  {spec.confidence_note}
                </span>
              )}
            </div>
          </>
        )}

        <SourcesFooter provenance={provenance} compact={compact} />
      </div>
    </ChartCard>
  );
}
