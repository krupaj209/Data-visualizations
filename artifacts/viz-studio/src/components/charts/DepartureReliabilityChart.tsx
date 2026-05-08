import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { CALLOUT_PILL, CHART_TYPE } from "@/lib/chart-system";
import {
  CalloutPill,
  ChartTooltip,
  SourcesFooter,
} from "@/components/charts/system";
import {
  MONTH_LABELS,
  MONTH_ORDER,
  type ChartProvenanceLite,
  type DepartureReliabilitySpec,
} from "@/lib/chart-spec";

interface Props {
  spec: DepartureReliabilitySpec;
  context?: string;
  compact?: boolean;
  provenance?: ChartProvenanceLite | null;
}

function fillFor(pct: number): { soft: string; bold: string } {
  if (pct >= 90) return { soft: BRAND.bgMint, bold: BRAND.okayGreen };
  if (pct >= 70) return { soft: BRAND.holaSoft, bold: BRAND.hola };
  return { soft: BRAND.candySoft, bold: BRAND.candy };
}

export function DepartureReliabilityChart({
  spec,
  context,
  compact,
  provenance,
}: Props) {
  const data = useMemo(() => {
    const byMonth = new Map(spec.months.map((m) => [m.month, m]));
    return MONTH_ORDER.map((m) => {
      const row = byMonth.get(m);
      return {
        month: m,
        label: MONTH_LABELS[m],
        pct: row?.pct_ran ?? 0,
        note: row?.note ?? null,
        reasons: row?.cancellation_reasons ?? [],
      };
    });
  }, [spec.months]);

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const peakIdx = data.reduce(
    (best, d, i) => (d.pct > data[best].pct ? i : best),
    0,
  );
  const lowIdx = data.reduce(
    (best, d, i) => (d.pct < data[best].pct ? i : best),
    0,
  );
  const target = spec.target_pct;

  return (
    <ChartCard
      context={context ?? "Scheduled departures that ran"}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className="relative flex-1 grid items-end min-h-0"
          style={{
            gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
            columnGap: "clamp(5px, 1cqi, 11px)",
            paddingTop: compact ? 14 : 26,
          }}
        >
          {/* Optional target line. */}
          {target !== undefined && target > 0 && target <= 100 && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: 0,
                right: 0,
                bottom: `${target}%`,
                borderTop: `1.5px dashed ${BRAND.purps}`,
              }}
            >
              {!compact && (
                <span
                  style={{
                    position: "absolute",
                    right: 0,
                    top: -16,
                    background: BRAND.purpsSoft,
                    color: BRAND.purps,
                    padding: "2px 6px",
                    borderRadius: 999,
                    fontSize: 9,
                    fontWeight: 800,
                  }}
                >
                  Target {target}%
                </span>
              )}
            </div>
          )}

          {data.map((d, i) => {
            const heightPct = Math.max(d.pct, 4);
            const isPeak = i === peakIdx;
            const isLow = i === lowIdx;
            const tone = fillFor(d.pct);
            const fill = isPeak || isLow ? tone.bold : tone.soft;

            return (
              <div
                key={d.month}
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
                        {d.label} · {Math.round(d.pct)}% ran
                      </div>
                      {d.reasons.length > 0 && (
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 10,
                            fontWeight: 600,
                            opacity: 0.9,
                            textAlign: "left",
                          }}
                        >
                          <div
                            style={{
                              opacity: 0.7,
                              marginBottom: 1,
                              fontWeight: 700,
                            }}
                          >
                            Cancelled because of:
                          </div>
                          {d.reasons.slice(0, 4).map((r, idx) => (
                            <div key={idx}>
                              · {r.reason} {Math.round(r.share)}%
                            </div>
                          ))}
                        </div>
                      )}
                      {d.note && (
                        <div
                          style={{
                            marginTop: 2,
                            fontSize: 10,
                            opacity: 0.85,
                          }}
                        >
                          {d.note}
                        </div>
                      )}
                    </div>
                  </ChartTooltip>
                )}
                {!compact && (isPeak || isLow) && hoverIdx !== i && (
                  <div
                    className="absolute z-10 left-1/2 -translate-x-1/2 pointer-events-none"
                    style={{ bottom: `calc(${heightPct}% + 6px)` }}
                  >
                    <div
                      style={{
                        background: tone.bold,
                        color: "white",
                        padding: `${CALLOUT_PILL.paddingY}px ${CALLOUT_PILL.paddingX}px`,
                        borderRadius: CALLOUT_PILL.radius,
                        fontSize: CALLOUT_PILL.fontSize,
                        fontWeight: CALLOUT_PILL.fontWeight,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {Math.round(d.pct)}%
                    </div>
                  </div>
                )}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%`, backgroundColor: fill }}
                  transition={{
                    duration: 0.6,
                    delay: 0.04 + i * 0.02,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    width: "100%",
                    maxWidth: 22,
                    margin: "0 auto",
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                    borderBottomLeftRadius: 3,
                    borderBottomRightRadius: 3,
                  }}
                />
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
          {data.map((d, i) => (
            <div
              key={d.month}
              className="text-center"
              style={{
                fontSize: CHART_TYPE.axisTick.fontSize,
                color:
                  i === peakIdx
                    ? BRAND.okayInk
                    : i === lowIdx
                      ? BRAND.candy
                      : BRAND.slate900,
                fontWeight: CHART_TYPE.axisTick.fontWeight,
              }}
            >
              {d.label}
            </div>
          ))}
        </div>

        {!compact && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {spec.best_months.length > 0 && (
              <CalloutPill bg={BRAND.bgMint} fg={BRAND.okayInk}>
                Most reliable · {spec.best_months.join(", ")}
              </CalloutPill>
            )}
            {spec.worst_months.length > 0 && (
              <CalloutPill bg={BRAND.candySoft} fg={BRAND.candy}>
                Most cancellations · {spec.worst_months.join(", ")}
              </CalloutPill>
            )}
          </div>
        )}

        <SourcesFooter provenance={provenance} compact={compact} />
      </div>
    </ChartCard>
  );
}
