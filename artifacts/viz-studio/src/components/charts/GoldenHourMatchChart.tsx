import { useState } from "react";
import { Check } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { CHART_TYPE } from "@/lib/chart-system";
import { ChartTooltip } from "@/components/charts/system";
import {
  MONTH_LABELS,
  MONTH_ORDER,
  type GoldenHourMatchSpec,
  type MonthCode,
} from "@/lib/chart-spec";

interface Props {
  spec: GoldenHourMatchSpec;
  context?: string;
  compact?: boolean;
}

function alignedFill(sub_rating: number | undefined): string {
  if (sub_rating === undefined) return BRAND.bgMint;
  if (sub_rating >= 80) return BRAND.okayGreen;
  if (sub_rating >= 50) return BRAND.subtleGreen;
  return BRAND.bgMint;
}

export function GoldenHourMatchChart({ spec, context, compact = false }: Props) {
  const [hovered, setHovered] = useState<{ m: number; s: number } | null>(null);
  const monthRow = (mc: MonthCode) =>
    spec.months.find((m) => m.month === mc);

  const labelColWidth = compact ? 40 : 56;
  const cellRadius = compact ? 4 : 6;
  const cellGap = compact ? 3 : 5;

  const monthLabel = (mc: MonthCode) =>
    compact ? MONTH_LABELS[mc][0] : MONTH_LABELS[mc];

  return (
    <ChartCard
      context={
        context ?? `Golden-hour alignment at ${spec.location_label}`
      }
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className="flex-1 grid min-h-0"
          style={{
            gridTemplateColumns: `${labelColWidth}px 1fr`,
            columnGap: compact ? 6 : 10,
          }}
        >
          {/* Top-left empty cell + slot header */}
          <div />
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${spec.slots.length}, minmax(0, 1fr))`,
              gap: cellGap,
              paddingBottom: 6,
            }}
          >
            {spec.slots.map((slot) => (
              <div
                key={slot.label}
                style={{
                  fontSize: CHART_TYPE.catLabel.fontSize,
                  fontWeight: CHART_TYPE.catLabel.fontWeight,
                  color: CHART_TYPE.catLabel.color,
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={slot.label}
              >
                {slot.label}
              </div>
            ))}
          </div>

          {/* Body rows */}
          <div className="flex flex-col" style={{ gap: cellGap }}>
            {MONTH_ORDER.map((mc) => (
              <div
                key={mc}
                className="flex items-center"
                style={{
                  fontSize: CHART_TYPE.axisTick.fontSize,
                  fontWeight: CHART_TYPE.axisTick.fontWeight,
                  color: CHART_TYPE.axisTick.color,
                  flex: 1,
                  minHeight: 0,
                }}
              >
                {monthLabel(mc)}
              </div>
            ))}
          </div>
          <div className="flex flex-col" style={{ gap: cellGap }}>
            {MONTH_ORDER.map((mc, mi) => {
              const row = monthRow(mc);
              return (
                <div
                  key={mc}
                  className="grid relative flex-1"
                  style={{
                    gridTemplateColumns: `repeat(${spec.slots.length}, minmax(0, 1fr))`,
                    gap: cellGap,
                    minHeight: 0,
                  }}
                >
                  {spec.slots.map((slot, si) => {
                    const cell = row?.cells[si];
                    const aligned = cell?.aligned ?? false;
                    const fill = aligned
                      ? alignedFill(cell?.sub_rating)
                      : BRAND.slate100;
                    const isHovered =
                      hovered?.m === mi && hovered?.s === si;
                    return (
                      <div
                        key={slot.label}
                        onMouseEnter={() => setHovered({ m: mi, s: si })}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                          background: fill,
                          borderRadius: cellRadius,
                          position: "relative",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: isHovered
                            ? `inset 0 0 0 1.5px ${BRAND.slate900}`
                            : "none",
                        }}
                      >
                        {aligned && !compact && (
                          <Check
                            size={12}
                            strokeWidth={3}
                            color={BRAND.okayInk}
                          />
                        )}
                        {isHovered && (
                          <ChartTooltip
                            anchorXPct={
                              ((si + 0.5) / spec.slots.length) * 100
                            }
                            offset={6}
                          >
                            {MONTH_LABELS[mc]} · {slot.label} ·{" "}
                            {aligned
                              ? cell?.sub_rating !== undefined
                                ? `aligned · ${cell.sub_rating}/100`
                                : "aligned"
                              : "no match"}
                          </ChartTooltip>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {!compact && (
          <div
            className="mt-3 flex items-center justify-between flex-wrap gap-2"
            style={{
              borderTop: `1px solid ${BRAND.slate100}`,
              paddingTop: 10,
            }}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: BRAND.okayGreen,
                    display: "inline-block",
                  }}
                />
                <span
                  style={{
                    fontSize: CHART_TYPE.legend.fontSize,
                    color: CHART_TYPE.legend.color,
                    fontWeight: CHART_TYPE.legend.fontWeight,
                  }}
                >
                  Golden hour
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: BRAND.bgMint,
                    display: "inline-block",
                  }}
                />
                <span
                  style={{
                    fontSize: CHART_TYPE.legend.fontSize,
                    color: CHART_TYPE.legend.color,
                    fontWeight: CHART_TYPE.legend.fontWeight,
                  }}
                >
                  Soft light
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: BRAND.slate100,
                    display: "inline-block",
                  }}
                />
                <span
                  style={{
                    fontSize: CHART_TYPE.legend.fontSize,
                    color: CHART_TYPE.legend.color,
                    fontWeight: CHART_TYPE.legend.fontWeight,
                  }}
                >
                  No match
                </span>
              </div>
            </div>
            {spec.helper && (
              <span
                style={{
                  fontSize: CHART_TYPE.legend.fontSize,
                  color: BRAND.slate500,
                  fontWeight: 600,
                }}
              >
                {spec.helper}
              </span>
            )}
          </div>
        )}
      </div>
    </ChartCard>
  );
}
