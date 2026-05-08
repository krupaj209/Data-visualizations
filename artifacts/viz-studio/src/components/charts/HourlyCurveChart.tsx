import { useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import {
  BAND_TONE,
  BRAND,
  getDotStyle,
  type BandToneKey,
} from "@/lib/brand";
import {
  CALLOUT_PILL,
  CHART_DOT,
  CHART_LAYOUT,
  CHART_TYPE,
} from "@/lib/chart-system";
import { ChartTooltip } from "@/components/charts/system";
import {
  type RideWaitCurveSpec,
  type ActivityWindowSpec,
} from "@/lib/chart-spec";

type CurveSpec = RideWaitCurveSpec | ActivityWindowSpec;

interface Props {
  spec: CurveSpec;
  context?: string;
  compact?: boolean;
}

const ZONE_BAND: Record<CurveSpec["zones"][number]["tone"], BandToneKey> = {
  best: "calm",
  peak: "loud",
  second_best: "calm",
};

function fmtClock(hour: number) {
  const h = Math.floor(hour);
  const hh = h % 12 || 12;
  const ap = h < 12 || h === 24 ? "am" : "pm";
  return `${hh}${ap}`;
}

/**
 * Shared smooth-hourly-curve renderer for `ride_wait_curve` and
 * `activity_window`. Both archetypes carry the same shape (24 hourly
 * points + zone bands + a configurable y-axis label/unit) so they share
 * a single component rather than duplicating the curve geometry.
 *
 * Compact mode (auto-flipped at iframe heights < 340px) drops the
 * subject strip and the insight footer. Default chrome shows both.
 */
export function HourlyCurveChart({ spec, context, compact = false }: Props) {
  const { hours, zones, open_hour, close_hour, subject, y_label, unit, insight } =
    spec;
  const [hovered, setHovered] = useState<number | null>(null);
  const reactId = useId().replace(/[^A-Za-z0-9_-]/g, "");
  const fillId = `hourlyCurveFill-${reactId}`;
  const clipId = `hourlyCurveReveal-${reactId}`;

  const HEADER = compact ? 22 : CHART_LAYOUT.headerStripPx;
  const X_AXIS = CHART_LAYOUT.xAxisStripPx;

  const sortedHours = useMemo(
    () => [...hours].sort((a, b) => a.hour - b.hour),
    [hours],
  );

  const { yMax, openValues } = useMemo(() => {
    // close_hour is exclusive — same convention as hourly_heatmap, where
    // open_hour=9 / close_hour=18 means hours 9..17 inclusive.
    const within = sortedHours.filter(
      (p) => p.hour >= open_hour && p.hour < close_hour,
    );
    const peak = Math.max(...within.map((p) => p.value), 1);
    return {
      yMax: Math.max(Math.ceil(peak * 1.18), peak + 1),
      openValues: within,
    };
  }, [sortedHours, open_hour, close_hour]);

  const xPct = (h: number) =>
    ((h - open_hour) / Math.max(close_hour - open_hour, 1)) * 100;
  const yPct = (v: number) => 100 - (v / yMax) * 100;

  const peakRange = useMemo<[number, number] | null>(() => {
    const peakZone = zones.find((z) => z.tone === "peak");
    if (!peakZone) return null;
    return [peakZone.start_hour, peakZone.end_hour];
  }, [zones]);
  // Zone end_hour is exclusive (matches close_hour semantics).
  const inPeak = (h: number) =>
    peakRange !== null && h >= peakRange[0] && h < peakRange[1];

  const { linePath, areaPath, coords } = useMemo(() => {
    const cs = openValues.map((p) => ({
      x: xPct(p.hour),
      y: yPct(p.value),
      hour: p.hour,
      value: p.value,
    }));
    if (cs.length < 2) {
      return {
        linePath: cs.length ? `M ${cs[0]!.x} ${cs[0]!.y}` : "",
        areaPath: "",
        coords: cs,
      };
    }
    const cmds: string[] = [`M ${cs[0]!.x.toFixed(3)} ${cs[0]!.y.toFixed(3)}`];
    const tension = 0.5;
    for (let i = 0; i < cs.length - 1; i++) {
      const p0 = cs[Math.max(i - 1, 0)]!;
      const p1 = cs[i]!;
      const p2 = cs[i + 1]!;
      const p3 = cs[Math.min(i + 2, cs.length - 1)]!;
      const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
      const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
      const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
      const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;
      cmds.push(
        `C ${cp1x.toFixed(3)} ${cp1y.toFixed(3)}, ${cp2x.toFixed(3)} ${cp2y.toFixed(3)}, ${p2.x.toFixed(3)} ${p2.y.toFixed(3)}`,
      );
    }
    const line = cmds.join(" ");
    const last = cs[cs.length - 1]!;
    const area = `${line} L ${last.x.toFixed(3)} 100 L ${cs[0]!.x.toFixed(3)} 100 Z`;
    return { linePath: line, areaPath: area, coords: cs };
  }, [openValues, open_hour, close_hour, yMax]);

  return (
    <ChartCard context={context ?? subject} compact={compact}>
      <div className="flex-1 flex flex-col min-h-0">
        {!compact && (
          <div
            className="flex items-baseline justify-between mb-2"
            style={{ gap: 12 }}
          >
            <div
              style={{
                color: BRAND.slate900,
                fontWeight: 800,
                fontSize: "clamp(12px, 1.4cqi, 15px)",
              }}
            >
              {subject}
            </div>
            <div
              style={{
                color: CHART_TYPE.axisTick.color,
                fontSize: CHART_TYPE.axisTick.fontSize,
                fontWeight: CHART_TYPE.axisTick.fontWeight,
              }}
            >
              {y_label}
            </div>
          </div>
        )}

        <div
          className="relative flex-1 min-h-0"
          style={{
            paddingTop: HEADER,
            paddingBottom: X_AXIS,
            paddingLeft: CHART_LAYOUT.plotInsetX,
            paddingRight: CHART_LAYOUT.plotInsetX,
          }}
        >
          <div
            className="absolute"
            style={{
              top: 0,
              bottom: X_AXIS,
              left: CHART_LAYOUT.plotInsetX,
              right: CHART_LAYOUT.plotInsetX,
              pointerEvents: "none",
            }}
          >
            {zones.map((z, i) => {
              const left = xPct(z.start_hour);
              const right = xPct(z.end_hour);
              const tone = BAND_TONE[ZONE_BAND[z.tone]];
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `${left}%`,
                    width: `${Math.max(right - left, 0)}%`,
                    background: tone.bg,
                    borderLeft:
                      i > 0 ? `1px dashed ${BRAND.slate200}` : undefined,
                    borderRight:
                      i < zones.length - 1
                        ? `1px dashed ${BRAND.slate200}`
                        : undefined,
                  }}
                >
                  <div
                    className="absolute"
                    style={{
                      top: Math.max(2, (HEADER - 22) / 2),
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: tone.pillBg,
                      color: tone.pillFg,
                      padding: `${CALLOUT_PILL.paddingY}px ${CALLOUT_PILL.paddingX}px`,
                      borderRadius: CALLOUT_PILL.radius,
                      fontSize: CHART_TYPE.zoneLabel.fontSize,
                      fontWeight: CHART_TYPE.zoneLabel.fontWeight,
                      whiteSpace: "nowrap",
                      lineHeight: 1.15,
                    }}
                  >
                    {z.label}
                  </div>
                </div>
              );
            })}
          </div>

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute"
            style={{
              top: HEADER,
              bottom: X_AXIS,
              left: CHART_LAYOUT.plotInsetX,
              right: CHART_LAYOUT.plotInsetX,
              width: `calc(100% - ${CHART_LAYOUT.plotInsetX * 2}px)`,
              height: `calc(100% - ${HEADER + X_AXIS}px)`,
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND.purps} stopOpacity={0.22} />
                <stop offset="100%" stopColor={BRAND.purps} stopOpacity={0} />
              </linearGradient>
              <clipPath id={clipId} clipPathUnits="objectBoundingBox">
                <motion.rect
                  x={0}
                  y={0}
                  height={1}
                  initial={{ width: 0 }}
                  animate={{ width: 1 }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                />
              </clipPath>
            </defs>
            {areaPath && (
              <motion.path
                d={areaPath}
                fill={`url(#${fillId})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35 }}
              />
            )}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={BRAND.purps}
                strokeWidth={2.5}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
                clipPath={`url(#${clipId})`}
              />
            )}
          </svg>

          <div
            className="absolute"
            style={{
              top: HEADER,
              bottom: X_AXIS,
              left: CHART_LAYOUT.plotInsetX,
              right: CHART_LAYOUT.plotInsetX,
            }}
          >
            {coords.map((c, i) => {
              const isHovered = hovered === i;
              const isPeak = inPeak(c.hour);
              return (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${c.x}%`,
                    top: `${c.y}%`,
                    transform: "translate(-50%, -50%)",
                    width: 18,
                    height: 18,
                  }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.9 + i * 0.03, duration: 0.3 }}
                    style={{
                      ...getDotStyle(isPeak ? "callout" : "default"),
                      width: CHART_DOT.diameter,
                      height: CHART_DOT.diameter,
                      borderRadius: "50%",
                      boxShadow: isHovered
                        ? `0 0 0 4px ${BRAND.purpsSoft}`
                        : "none",
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      cursor: "pointer",
                    }}
                  />
                  {isHovered && (
                    <ChartTooltip
                      anchorXPct={c.x}
                      offset={CHART_DOT.labelOffset + 4}
                    >
                      {fmtClock(c.hour)} · {c.value}
                      {unit ? ` ${unit}` : ""}
                    </ChartTooltip>
                  )}
                </div>
              );
            })}
          </div>

          <div
            className="absolute flex justify-between"
            style={{
              bottom: 0,
              left: CHART_LAYOUT.plotInsetX,
              right: CHART_LAYOUT.plotInsetX,
              height: 18,
            }}
          >
            {coords.map((c, i) => {
              const step = Math.max(
                1,
                Math.floor(coords.length / (compact ? 5 : 8)),
              );
              const show =
                i === 0 || i === coords.length - 1 || i % step === 0;
              if (!show) return <div key={i} />;
              return (
                <div
                  key={i}
                  style={{
                    color: CHART_TYPE.axisTick.color,
                    fontSize: CHART_TYPE.axisTick.fontSize,
                    fontWeight: CHART_TYPE.axisTick.fontWeight,
                    whiteSpace: "nowrap",
                  }}
                >
                  {fmtClock(c.hour)}
                </div>
              );
            })}
          </div>
        </div>

        {!compact && insight && (
          <div
            className="mt-2"
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

export function RideWaitCurveChart(props: {
  spec: RideWaitCurveSpec;
  context?: string;
  compact?: boolean;
}) {
  return <HourlyCurveChart {...props} />;
}

export function ActivityWindowChart(props: {
  spec: ActivityWindowSpec;
  context?: string;
  compact?: boolean;
}) {
  return <HourlyCurveChart {...props} />;
}
