import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { formatHour as fmtHour } from "@/lib/time";
import { CHART_TYPE } from "@/lib/chart-system";
import { CalloutPill, LegendSwatch } from "@/components/charts/system";
import { type ZoneWaitHeatmapSpec } from "@/lib/chart-spec";
import { ZoneTimeHeatmap } from "./ZoneTimeHeatmap";

interface Props {
  spec: ZoneWaitHeatmapSpec;
  context?: string;
  compact?: boolean;
}

const WAIT_PALETTE = [
  BRAND.bgMint,
  BRAND.bgSage,
  BRAND.bgCream,
  BRAND.holaSoft,
  BRAND.candySoft,
  BRAND.candy,
];

const WAIT_LEGEND = [
  { color: WAIT_PALETTE[0], label: "<5" },
  { color: WAIT_PALETTE[1], label: "5–15" },
  { color: WAIT_PALETTE[2], label: "15–30" },
  { color: WAIT_PALETTE[3], label: "30–60" },
  { color: WAIT_PALETTE[4], label: "60–120" },
  { color: WAIT_PALETTE[5], label: "120+" },
];

function waitColor(v: number): string {
  if (v < 5) return WAIT_PALETTE[0];
  if (v < 15) return WAIT_PALETTE[1];
  if (v < 30) return WAIT_PALETTE[2];
  if (v < 60) return WAIT_PALETTE[3];
  if (v < 120) return WAIT_PALETTE[4];
  return WAIT_PALETTE[5];
}

export function ZoneWaitHeatmapChart({ spec, context, compact = false }: Props) {
  const unit = spec.unit || "min";
  return (
    <ChartCard
      context={context ?? "Typical wait by land × hour"}
      compact={compact}
    >
      <ZoneTimeHeatmap
        zones={spec.zones}
        open_hour={spec.open_hour}
        close_hour={spec.close_hour}
        cellColor={waitColor}
        formatValue={(v) => `${Math.round(v)} ${unit}`}
        formatHour={fmtHour}
        compact={compact}
        footer={
          !compact && (
            <div
              className="mt-3 flex items-center justify-between flex-wrap gap-2"
              style={{
                borderTop: `1px solid ${BRAND.slate100}`,
                paddingTop: 10,
              }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  style={{
                    fontSize: CHART_TYPE.legend.fontSize,
                    color: CHART_TYPE.legend.color,
                    fontWeight: CHART_TYPE.legend.fontWeight,
                  }}
                >
                  Wait ({unit})
                </span>
                {WAIT_LEGEND.map((l) => (
                  <div key={l.label} className="flex items-center gap-1">
                    <LegendSwatch color={l.color} shape="square" />
                    <span
                      style={{
                        fontSize: CHART_TYPE.legend.fontSize,
                        color: CHART_TYPE.legend.color,
                        fontWeight: CHART_TYPE.legend.fontWeight,
                      }}
                    >
                      {l.label}
                    </span>
                  </div>
                ))}
              </div>
              {spec.best_window && (
                <CalloutPill bg={BRAND.bgMint} fg={BRAND.okayInk}>
                  Best · {spec.best_window.zone}{" "}
                  {fmtHour(spec.best_window.start_hour)}–
                  {fmtHour(spec.best_window.end_hour)}
                </CalloutPill>
              )}
            </div>
          )
        }
      />
    </ChartCard>
  );
}
