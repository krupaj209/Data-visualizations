import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { CalloutPill } from "@/components/charts/system";
import { type OpeningHourRankSpec } from "@/lib/chart-spec";

interface Props {
  spec: OpeningHourRankSpec;
  context?: string;
  compact?: boolean;
}

/**
 * Horizontal ranked-bar chart of named subjects (rides, slides, …)
 * ordered shortest to longest opening-hour wait. Bars wear a red /
 * amber / green band keyed off `bands.green_max` and `bands.amber_max`.
 *
 * Compact mode hides the header strip (band legend + axis label) and
 * the bottom insight footer, matching the embed contract's 340px
 * auto-collapse rule.
 */
export function OpeningHourRankChart({
  spec,
  context,
  compact = false,
}: Props) {
  const {
    subjects,
    bands,
    unit,
    hour_label,
    insight,
    subject_label,
  } = spec;
  void subject_label;

  const sorted = [...subjects].sort((a, b) => a.wait_minutes - b.wait_minutes);
  const maxWait = Math.max(...sorted.map((s) => s.wait_minutes), 1);
  const scaleMax = Math.max(maxWait, bands.amber_max) * 1.05;

  const colorFor = (mins: number) => {
    if (mins <= bands.green_max)
      return { fill: BRAND.okayGreen, soft: BRAND.bgMint, fg: BRAND.okayInk };
    if (mins <= bands.amber_max)
      return { fill: BRAND.hola, soft: BRAND.holaSoft, fg: BRAND.hola };
    return { fill: BRAND.candy, soft: BRAND.candySoft, fg: BRAND.candy };
  };

  return (
    <ChartCard context={context ?? hour_label} compact={compact}>
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
              {hour_label}
            </div>
            <div className="flex items-center gap-1.5">
              <CalloutPill bg={BRAND.bgMint} fg={BRAND.okayInk}>
                ≤ {bands.green_max} {unit}
              </CalloutPill>
              <CalloutPill bg={BRAND.holaSoft} fg={BRAND.hola}>
                ≤ {bands.amber_max} {unit}
              </CalloutPill>
              <CalloutPill bg={BRAND.candySoft} fg={BRAND.candy}>
                {">"} {bands.amber_max} {unit}
              </CalloutPill>
            </div>
          </div>
        )}

        <div
          className="flex-1 flex flex-col"
          style={{ gap: "clamp(6px, 0.9cqi, 10px)", minHeight: 0 }}
        >
          {sorted.map((s, i) => {
            const c = colorFor(s.wait_minutes);
            const widthPct = Math.max((s.wait_minutes / scaleMax) * 100, 4);
            return (
              <div
                key={`${s.name}-${i}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 32%) 1fr",
                  columnGap: 12,
                  alignItems: "center",
                }}
              >
                <div className="min-w-0">
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
                    {s.name}
                  </div>
                  {s.note && !compact && (
                    <div
                      style={{
                        color: BRAND.slate700,
                        fontSize: "clamp(9px, 1cqi, 11px)",
                        fontWeight: 600,
                        lineHeight: 1.2,
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.note}
                    </div>
                  )}
                </div>
                <div
                  className="relative"
                  style={{ height: "clamp(22px, 2.8cqi, 32px)" }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background: BRAND.slate100,
                      borderRadius: 8,
                    }}
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPct}%` }}
                    transition={{
                      duration: 0.85,
                      delay: 0.12 + i * 0.06,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="absolute h-full flex items-center justify-end pr-2.5"
                    style={{ background: c.fill, borderRadius: 8 }}
                  >
                    <span
                      style={{
                        color: "white",
                        fontWeight: 800,
                        fontSize: "clamp(10px, 1.15cqi, 13px)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.wait_minutes} {unit}
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
