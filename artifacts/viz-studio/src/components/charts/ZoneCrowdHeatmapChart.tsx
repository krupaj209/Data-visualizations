import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { formatHour as fmtHour } from "@/lib/time";
import { CHART_TYPE } from "@/lib/chart-system";
import { CalloutPill, LegendSwatch } from "@/components/charts/system";
import { type ZoneCrowdHeatmapSpec } from "@/lib/chart-spec";
import { ZoneTimeHeatmap } from "./ZoneTimeHeatmap";

interface Props {
  spec: ZoneCrowdHeatmapSpec;
  context?: string;
  compact?: boolean;
}

const CROWD_PALETTE = ["#F8F8F8", "#F4EEFF", "#D9C5FF", "#B796FF", "#8000FF"];

function crowdColor(v: number): string {
  if (v <= 5) return CROWD_PALETTE[0];
  if (v <= 30) return CROWD_PALETTE[1];
  if (v <= 55) return CROWD_PALETTE[2];
  if (v <= 80) return CROWD_PALETTE[3];
  return CROWD_PALETTE[4];
}

export function ZoneCrowdHeatmapChart({ spec, context, compact = false }: Props) {
  return (
    <ChartCard
      context={context ?? "When each gallery is busiest"}
      compact={compact}
    >
      <ZoneTimeHeatmap
        zones={spec.zones}
        open_hour={spec.open_hour}
        close_hour={spec.close_hour}
        cellColor={crowdColor}
        formatValue={(v) => `${Math.round(v)}/100`}
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
              <div className="flex items-center gap-1.5">
                <span
                  style={{
                    fontSize: CHART_TYPE.legend.fontSize,
                    color: CHART_TYPE.legend.color,
                    fontWeight: CHART_TYPE.legend.fontWeight,
                  }}
                >
                  Quiet
                </span>
                {CROWD_PALETTE.slice(1).map((c) => (
                  <LegendSwatch key={c} color={c} shape="bar" />
                ))}
                <span
                  style={{
                    fontSize: CHART_TYPE.legend.fontSize,
                    color: CHART_TYPE.legend.color,
                    fontWeight: CHART_TYPE.legend.fontWeight,
                  }}
                >
                  Crowded
                </span>
              </div>
              {spec.best_window && (
                <CalloutPill bg={BRAND.purpsSoft} fg={BRAND.purps}>
                  Best · {spec.best_window.label}
                </CalloutPill>
              )}
            </div>
          )
        }
      />
    </ChartCard>
  );
}
