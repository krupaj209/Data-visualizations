import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { CHART_TYPE } from "@/lib/chart-system";
import { CalloutPill, LegendSwatch } from "@/components/charts/system";
import {
  DAY_FULL,
  DAY_LABELS,
  DAY_ORDER,
  type HourlyHeatmapSpec,
} from "@/lib/chart-spec";
import { formatHour } from "@/lib/time";

import {
  applyDirection,
  resolvePalette,
  type PresentationOverrides,
} from "@/lib/presentation";

interface Props {
  spec: HourlyHeatmapSpec;
  context?: string;
  compact?: boolean;
  presentation?: PresentationOverrides;
}

const DEFAULT_HEAT_PALETTE = ["#F4EEFF", "#D9C5FF", "#B796FF", "#8000FF"];

function buildHeatPalette(
  presentation: PresentationOverrides | undefined,
): string[] {
  // Use the bottom 4 stops of the resolved ramp so the lightest tile stays
  // near-white. When no palette override is set, preserve the original
  // 4-stop look exactly.
  if (!presentation?.palette) return DEFAULT_HEAT_PALETTE;
  const ramp = resolvePalette(presentation);
  return [ramp.scale[1], ramp.scale[2], ramp.scale[3], ramp.scale[4]];
}

function intensityToColor(
  value: number,
  closed: boolean,
  palette: string[],
  presentation: PresentationOverrides | undefined,
) {
  if (closed) return BRAND.slate100;
  // `direction=low_bad` means low values should be hot (= bad). Flip the
  // 0..100 score so the colour ramp climbs the opposite direction.
  const oriented = applyDirection(value / 100, presentation) * 100;
  if (oriented <= 5) return "#F8F8F8";
  if (oriented <= 30) return palette[0];
  if (oriented <= 55) return palette[1];
  if (oriented <= 80) return palette[2];
  return palette[3];
}

export function HourlyHeatmapChart({
  spec,
  context,
  compact,
  presentation,
}: Props) {
  const rowsByDay = new Map(spec.rows.map((r) => [r.day, r]));
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const heatPalette = buildHeatPalette(presentation);
  const ramp = resolvePalette(presentation);

  // `view=strip` collapses the 7×24 grid into a single averaged row of 24
  // cells (one per hour-of-day). Useful for ultra-short embeds where the
  // weekday axis isn't actionable. Closed hours (everyone closed) stay grey.
  const stripView = presentation?.view === "strip";
  const stripValues: number[] = hours.map((h) => {
    let sum = 0;
    let n = 0;
    for (const day of DAY_ORDER) {
      const row = rowsByDay.get(day);
      if (!row || row.closed) continue;
      const beforeOpen = h < spec.open_hour || h >= spec.close_hour;
      if (beforeOpen) continue;
      sum += row.hours[h] ?? 0;
      n += 1;
    }
    return n === 0 ? 0 : sum / n;
  });
  const stripClosed: boolean[] = hours.map(
    (h) => h < spec.open_hour || h >= spec.close_hour,
  );

  // `emphasis=h-7` → highlight the 7am column with a purps ring.
  const emphasisHour: number | null = (() => {
    const e = presentation?.emphasis;
    if (!e) return null;
    const m = /^h-?(\d{1,2})$/i.exec(e);
    if (!m) return null;
    const h = Number(m[1]);
    return h >= 0 && h < 24 ? h : null;
  })();

  const emphasisRing = (h: number) =>
    emphasisHour === h
      ? { boxShadow: `0 0 0 2px ${ramp.callout}` }
      : undefined;

  return (
    <ChartCard context={context ?? "Hourly crowd intensity"} compact={compact}>
      <div className="flex-1 flex flex-col min-h-0">
        {stripView ? (
          <div className="flex-1 flex flex-col min-h-0 justify-center">
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
                  }}
                >
                  {h % 3 === 0 ? formatHour(h) : ""}
                </div>
              ))}
            </div>
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(24, minmax(0, 1fr))`,
                gap: 3,
                height: "clamp(28px, 14cqi, 64px)",
              }}
            >
              {stripValues.map((v, h) => (
                <div
                  key={h}
                  style={{
                    background: intensityToColor(
                      v,
                      stripClosed[h],
                      heatPalette,
                      presentation,
                    ),
                    borderRadius: 6,
                    opacity: stripClosed[h] ? 0.55 : 1,
                    ...emphasisRing(h),
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div
            className="flex-1 grid min-h-0"
            style={{ gridTemplateColumns: "auto 1fr", columnGap: 10 }}
          >
            <div
              className="flex flex-col justify-around"
              style={{ paddingTop: 18 }}
            >
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
                  const values =
                    row?.hours ?? Array.from({ length: 24 }, () => 0);
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
                        const beforeOpen =
                          h < spec.open_hour || h >= spec.close_hour;
                        const isClosed = closed || beforeOpen;
                        return (
                          <div
                            key={h}
                            style={{
                              background: intensityToColor(
                                v,
                                isClosed,
                                heatPalette,
                                presentation,
                              ),
                              borderRadius: 5,
                              opacity: isClosed ? 0.55 : 1,
                              ...emphasisRing(h),
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
        )}

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
              {presentation?.direction === "low_bad" ? "Crowded" : "Quiet"}
            </span>
            {heatPalette.map((c) => (
              <LegendSwatch key={c} color={c} shape="bar" />
            ))}
            <span
              style={{
                fontSize: CHART_TYPE.legend.fontSize,
                color: CHART_TYPE.legend.color,
                fontWeight: CHART_TYPE.legend.fontWeight,
              }}
            >
              {presentation?.direction === "low_bad" ? "Quiet" : "Crowded"}
            </span>
          </div>
          {spec.best_window && (
            <CalloutPill bg={ramp.primarySoft} fg={ramp.primaryFg}>
              Best window · {DAY_FULL[spec.best_window.day]}{" "}
              {formatHour(spec.best_window.start_hour)}–
              {formatHour(spec.best_window.end_hour)}
            </CalloutPill>
          )}
        </div>
      </div>
    </ChartCard>
  );
}
