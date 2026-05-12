import { useMemo, useState } from "react";
import { formatClock as fmtClock } from "@/lib/time";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
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
import { type DailyPatternSpec } from "@/lib/chart-spec";

interface Props {
  spec: DailyPatternSpec;
  context?: string;
  compact?: boolean;
}

// Map this chart's spec-level zone tones onto the shared BAND_TONE family
// (`calm` = soft green wash, `loud` = saturated candy wash) so the rhythm
// stays in sync with the Tribune density chart. The "Peak" band is the
// only loud callout; "Best" / "2nd best" recede to calm.
const ZONE_BAND: Record<
  DailyPatternSpec["zones"][number]["tone"],
  BandToneKey
> = {
  best: "calm",
  peak: "loud",
  second_best: "calm",
};

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function DailyPatternChart({ spec, context, compact = false }: Props) {
  const { points, zones, caption } = spec;
  const [hovered, setHovered] = useState<number | null>(null);

  const HEADER = compact ? 24 : CHART_LAYOUT.headerStripPx;
  const X_AXIS = CHART_LAYOUT.xAxisStripPx;

  const { xs, dMin, range, yMax } = useMemo(() => {
    const xsLocal = points.map((p) => toMin(p.time));
    const dMinLocal = Math.min(...xsLocal);
    const dMaxLocal = Math.max(...xsLocal);
    const peak = Math.max(...points.map((p) => p.crowd), 1);
    const yMaxLocal = Math.max(Math.ceil(peak * 1.18), peak + 1, 10);
    return {
      xs: xsLocal,
      dMin: dMinLocal,
      range: Math.max(dMaxLocal - dMinLocal, 1),
      yMax: yMaxLocal,
    };
  }, [points]);

  // Range of the explicitly-labeled "Peak" zone, used to decide which dots
  // wear the saturated fill. Other dots stay hollow so the chart reads as a
  // calm curve with one loud crest, matching Weekly pattern's rhythm.
  const peakRange = useMemo<[number, number] | null>(() => {
    const peakZone = zones.find((z) => z.tone === "peak");
    if (!peakZone) return null;
    return [toMin(peakZone.start), toMin(peakZone.end)];
  }, [zones]);
  const inPeak = (mins: number) =>
    peakRange !== null && mins >= peakRange[0] && mins <= peakRange[1];

  const xPct = (mins: number) => ((mins - dMin) / range) * 100;
  const yPct = (v: number) => 100 - (v / yMax) * 100;

  const { linePath, areaPath, coords } = useMemo(() => {
    const cs = points.map((p, i) => ({
      x: xPct(xs[i]),
      y: yPct(p.crowd),
    }));
    if (cs.length === 0) return { linePath: "", areaPath: "", coords: cs };
    if (cs.length === 1) {
      const d = `M ${cs[0].x} ${cs[0].y}`;
      return { linePath: d, areaPath: "", coords: cs };
    }
    const cmds: string[] = [`M ${cs[0].x.toFixed(3)} ${cs[0].y.toFixed(3)}`];
    const tension = 0.5;
    for (let i = 0; i < cs.length - 1; i++) {
      const p0 = cs[Math.max(i - 1, 0)];
      const p1 = cs[i];
      const p2 = cs[i + 1];
      const p3 = cs[Math.min(i + 2, cs.length - 1)];
      const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
      const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
      const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
      const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;
      cmds.push(
        `C ${cp1x.toFixed(3)} ${cp1y.toFixed(3)}, ${cp2x.toFixed(3)} ${cp2y.toFixed(3)}, ${p2.x.toFixed(3)} ${p2.y.toFixed(3)}`,
      );
    }
    const line = cmds.join(" ");
    const last = cs[cs.length - 1];
    const area = `${line} L ${last.x.toFixed(3)} 100 L ${cs[0].x.toFixed(3)} 100 Z`;
    return { linePath: line, areaPath: area, coords: cs };
  }, [points, xs, range, dMin, yMax]);

  return (
    <ChartCard context={context ?? "Typical daily pattern"} compact={compact}>
      <div className="flex-1 flex flex-col min-h-0">
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
              const left = xPct(toMin(z.start));
              const right = xPct(toMin(z.end));
              const tone = BAND_TONE[ZONE_BAND[z.tone]];
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `${left}%`,
                    width: `${right - left}%`,
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
              <linearGradient id="dailyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND.purps} stopOpacity={0.22} />
                <stop offset="100%" stopColor={BRAND.purps} stopOpacity={0} />
              </linearGradient>
              <clipPath id="dailyReveal" clipPathUnits="objectBoundingBox">
                <motion.rect
                  x={0}
                  y={0}
                  height={1}
                  initial={{ width: 0 }}
                  animate={{ width: 1 }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                />
              </clipPath>
            </defs>
            {areaPath && (
              <motion.path
                d={areaPath}
                fill="url(#dailyFill)"
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
                clipPath="url(#dailyReveal)"
              />
            )}
          </svg>

          {/* Dots */}
          <div
            className="absolute"
            style={{
              top: HEADER,
              bottom: X_AXIS,
              left: CHART_LAYOUT.plotInsetX,
              right: CHART_LAYOUT.plotInsetX,
            }}
          >
            {points.map((p, i) => {
              const c = coords[i];
              if (!c) return null;
              const isHovered = hovered === i;
              const isPeak = inPeak(xs[i]);
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
                    transition={{ delay: 1.0 + i * 0.05, duration: 0.3 }}
                    style={{
                      // Hollow ring by default; only the dots inside the
                      // explicitly-labeled "Peak" zone flip to the saturated
                      // brand fill — the centralized "soft default, vivid
                      // on callout" dot rhythm.
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
                      {fmtClock(p.time)} · {p.crowd}/
                      {Math.max(...points.map((pt) => pt.crowd))}
                    </ChartTooltip>
                  )}
                </div>
              );
            })}
          </div>

          {/* X-axis labels */}
          <div
            className="absolute flex justify-between"
            style={{
              bottom: 0,
              left: CHART_LAYOUT.plotInsetX,
              right: CHART_LAYOUT.plotInsetX,
              height: 18,
            }}
          >
            {points.map((p, i) => {
              const step = Math.max(
                1,
                Math.floor(points.length / (compact ? 5 : 9)),
              );
              const show = i === 0 || i === points.length - 1 || i % step === 0;
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
                  {fmtClock(p.time)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Caption pill */}
        {!compact && caption && (caption.opens || caption.last_entry) && (
          <div className="flex justify-center mt-2">
            <div
              className="flex items-center gap-2"
              style={{
                background: "white",
                border: `1.5px solid ${BRAND.purps}`,
                borderRadius: 999,
                padding: "6px 14px",
                fontSize: "clamp(10px, 1.1cqi, 12px)",
                fontWeight: 700,
                color: BRAND.slate900,
              }}
            >
              <span
                className="flex items-center justify-center"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: BRAND.purpsSoft,
                  color: BRAND.purps,
                }}
              >
                <Clock size={11} strokeWidth={2.5} />
              </span>
              {caption.opens && (
                <span>
                  Opens{" "}
                  <strong style={{ fontWeight: 800 }}>{caption.opens}</strong>
                </span>
              )}
              {caption.opens && caption.last_entry && (
                <span style={{ color: BRAND.purps }}>·</span>
              )}
              {caption.last_entry && (
                <span>
                  Last entry{" "}
                  <strong style={{ fontWeight: 800 }}>
                    {caption.last_entry}
                  </strong>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
