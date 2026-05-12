import { useState, type ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import { CHART_TYPE } from "@/lib/chart-system";
import { ChartTooltip } from "@/components/charts/system";
import { formatHour } from "@/lib/time";

export interface ZoneRow {
  name: string;
  emoji?: string;
  hours: number[];
}

interface Props {
  zones: ZoneRow[];
  open_hour: number;
  close_hour: number;
  /** Maps a cell value (within open hours) to a fill color. */
  cellColor: (value: number) => string;
  /** Returns the formatted value for the hover tooltip (e.g. "45 min", "82"). */
  formatValue: (value: number) => string;
  /** Hour label formatter. */
  formatHour?: (h: number) => string;
  compact?: boolean;
  /** Optional bottom-row legend / helper rendered below the grid. */
  footer?: ReactNode;
}

const DEFAULT_FORMAT_HOUR = formatHour;

/**
 * Shared primitive for `zone_crowd_heatmap` and `zone_wait_heatmap`. Renders
 * one labelled row per zone × 24 hour columns, with cells outside opening
 * hours dimmed to slate-100. The colour scale and unit are injected so each
 * variant can pick its own palette and label format.
 *
 * Compact mode (≥340px auto-collapse): zone names are truncated to ~10 chars,
 * hour ticks sample sparsely (~5 ticks vs ~12), the legend is dropped by the
 * caller, and outer padding tightens.
 */
export function ZoneTimeHeatmap({
  zones,
  open_hour,
  close_hour,
  cellColor,
  formatValue,
  formatHour = DEFAULT_FORMAT_HOUR,
  compact = false,
  footer,
}: Props) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const [hovered, setHovered] = useState<{ z: number; h: number } | null>(null);

  const tickStep = compact ? 5 : 3;
  const showHour = (h: number) =>
    h >= open_hour && h < close_hour && (h - open_hour) % tickStep === 0;

  const labelColWidth = compact ? 72 : 110;
  const rowGap = compact ? 2 : 4;
  const cellRadius = compact ? 3 : 5;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div
        className="flex-1 grid min-h-0"
        style={{
          gridTemplateColumns: `${labelColWidth}px 1fr`,
          columnGap: compact ? 6 : 10,
        }}
      >
        <div
          className="flex flex-col justify-around min-w-0"
          style={{ paddingTop: compact ? 0 : 18 }}
        >
          {zones.map((z) => (
            <div
              key={z.name}
              className="flex items-center gap-1 min-w-0"
              style={{
                fontSize: CHART_TYPE.axisTick.fontSize,
                fontWeight: CHART_TYPE.axisTick.fontWeight,
                color: CHART_TYPE.axisTick.color,
              }}
            >
              {z.emoji && (
                <span style={{ fontSize: "1.1em", flexShrink: 0 }}>
                  {z.emoji}
                </span>
              )}
              <span
                title={z.name}
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {z.name}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col min-w-0">
          {!compact && (
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(24, minmax(0, 1fr))`,
                gap: rowGap,
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
                  {showHour(h) ? formatHour(h) : ""}
                </div>
              ))}
            </div>
          )}

          <div
            className="flex-1 flex flex-col"
            style={{ gap: rowGap }}
          >
            {zones.map((z, zi) => (
              <div
                key={z.name}
                className="grid flex-1 relative"
                style={{
                  gridTemplateColumns: `repeat(24, minmax(0, 1fr))`,
                  gap: rowGap,
                }}
              >
                {hours.map((h) => {
                  const closed = h < open_hour || h >= close_hour;
                  const v = z.hours[h] ?? 0;
                  const isHovered =
                    hovered?.z === zi && hovered?.h === h && !closed;
                  return (
                    <div
                      key={h}
                      onMouseEnter={() =>
                        !closed && setHovered({ z: zi, h })
                      }
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        background: closed
                          ? BRAND.slate100
                          : cellColor(v),
                        borderRadius: cellRadius,
                        opacity: closed ? 0.55 : 1,
                        position: "relative",
                        cursor: closed ? "default" : "pointer",
                        boxShadow: isHovered
                          ? `inset 0 0 0 1.5px ${BRAND.slate900}`
                          : "none",
                      }}
                    >
                      {isHovered && (
                        <ChartTooltip
                          anchorXPct={(h / 23) * 100}
                          offset={6}
                        >
                          {z.name} · {formatHour(h)} · {formatValue(v)}
                        </ChartTooltip>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {compact && (
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(24, minmax(0, 1fr))`,
                gap: rowGap,
                paddingTop: 4,
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
                  {showHour(h) ? formatHour(h) : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {footer}
    </div>
  );
}
