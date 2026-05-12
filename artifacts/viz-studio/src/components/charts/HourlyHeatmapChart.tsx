import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { CHART_TYPE } from "@/lib/chart-system";
import { CalloutPill, LegendSwatch } from "@/components/charts/system";
import {
  DAY_LABELS,
  DAY_ORDER,
  type HourlyHeatmapSpec,
} from "@/lib/chart-spec";
import { formatHour } from "@/lib/time";

interface Props {
  spec: HourlyHeatmapSpec;
  context?: string;
  compact?: boolean;
}

const HEAT_PALETTE = ["#F4EEFF", "#D9C5FF", "#B796FF", "#8000FF"];

function intensityToColor(value: number, closed: boolean) {
  if (closed) return BRAND.slate100;
  if (value <= 5) return "#F8F8F8";
  if (value <= 30) return HEAT_PALETTE[0];
  if (value <= 55) return HEAT_PALETTE[1];
  if (value <= 80) return HEAT_PALETTE[2];
  return HEAT_PALETTE[3];
}

export function HourlyHeatmapChart({ spec, context, compact }: Props) {
  const rowsByDay = new Map(spec.rows.map((r) => [r.day, r]));
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <ChartCard context={context ?? "Hourly crowd intensity"} compact={compact}>
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 grid min-h-0" style={{ gridTemplateColumns: "auto 1fr", columnGap: 10 }}>
          <div className="flex flex-col justify-around" style={{ paddingTop: 18 }}>
            {DAY_ORDER.map((d) => (
              <div
                key={d}
                style={{
                  fontSize: CHART_TYPE.axisTick.fontSize,
                  fontWeight: CHART_TYPE.axisTick.fontWeight,
                  color: CHART_TYPE.axisTick.color,
                }}
              >
                {DAY_LABELS[d]}
              </div>
            ))}
          </div>
          <div className="flex flex-col min-h-0">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(24, minmax(0, 1fr))`,
                gap: 3,
                paddingBottom: 4,
              }}
            >
              {hours.map((h) => (
                <div
                  key={h}
                  style={{
                    fontSize: CHART_TYPE.axisTick.fontSize,
                    color: BRAND.slate500,
                    fontWeight: CHART_TYPE.axisTick.fontWeight,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "visible",
                  }}
                >
                  {h % 3 === 0 ? formatHour(h) : ""}
                </div>
              ))}
            </div>
            <div className="flex-1 flex flex-col gap-1">
              {DAY_ORDER.map((day) => {
                const row = rowsByDay.get(day);
                const closed = row?.closed ?? false;
                const values = row?.hours ?? Array.from({ length: 24 }, () => 0);
                return (
                  <div
                    key={day}
                    className="grid flex-1"
                    style={{
                      gridTemplateColumns: `repeat(24, minmax(0, 1fr))`,
                      gap: 3,
                    }}
                  >
                    {values.map((v, h) => {
                      const beforeOpen = h < spec.open_hour || h >= spec.close_hour;
                      const isClosed = closed || beforeOpen;
                      return (
                        <div
                          key={h}
                          style={{
                            background: intensityToColor(v, isClosed),
                            borderRadius: 5,
                            opacity: isClosed ? 0.55 : 1,
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="mt-3 flex items-center justify-between flex-wrap gap-2"
          style={{ borderTop: `1px solid ${BRAND.slate100}`, paddingTop: 10 }}
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
            {HEAT_PALETTE.map((c) => (
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
              Best window · {spec.best_window.label}
            </CalloutPill>
          )}
        </div>
      </div>
    </ChartCard>
  );
}
