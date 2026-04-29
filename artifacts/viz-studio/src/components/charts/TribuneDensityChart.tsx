import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Users, Sun, Clock } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { BRAND, CHART_TOKENS } from "@/lib/brand";
import { type TribuneDensitySpec } from "@/lib/chart-spec";

interface Props {
  spec: TribuneDensitySpec;
  context?: string;
  compact?: boolean;
}

const ZONE_TONES: Record<
  TribuneDensitySpec["zones"][number]["tone"],
  { bg: string; label: string }
> = {
  quiet: { bg: "rgba(21, 216, 118, 0.10)", label: "#0E8F4E" },
  packed: { bg: "rgba(255, 0, 118, 0.10)", label: BRAND.candy },
  second_window: { bg: "rgba(21, 216, 118, 0.10)", label: "#0E8F4E" },
};

const PILL_TONES: Record<
  TribuneDensitySpec["context_pills"][number]["tone"],
  { bg: string; fg: string }
> = {
  candy: { bg: BRAND.candySoft, fg: BRAND.candy },
  okay: { bg: BRAND.bgMint, fg: "#0E8F4E" },
  purps: { bg: BRAND.purpsSoft, fg: BRAND.purps },
};

const ICON_FOR: Record<
  TribuneDensitySpec["context_pills"][number]["icon"],
  React.ElementType
> = {
  calendar: Calendar,
  people: Users,
  people_full: Users,
  sun: Sun,
  clock: Clock,
};

/** "HH:MM" → minutes from start. */
function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function TribuneDensityChart({
  spec,
  context,
  compact = false,
}: Props) {
  const { points, zones, arrow_callout, context_pills, scope, y_label } = spec;
  const [hovered, setHovered] = useState<number | null>(null);

  // The plot area is split into three vertical strips:
  //   • HEADER  — zone band labels + the "Tour groups arrive" callout pill
  //   • plot    — the curve, dots, value labels, gridlines
  //   • X_AXIS  — bottom row of clock labels
  // Reserving the header strip explicitly is what stops the topmost dot value
  // labels (e.g. the "10"s) and the callout pill from being clipped above the
  // card edge.
  const HEADER = compact ? 28 : 56;
  const X_AXIS = CHART_TOKENS.xAxisStripPx;
  const Y_TICK_W = compact ? 16 : 22;

  const { xs, dMin, range, yMax } = useMemo(() => {
    const xsLocal = points.map((p) => toMin(p.time));
    const dMinLocal = Math.min(...xsLocal);
    const dMaxLocal = Math.max(...xsLocal);
    // Cap the y-scale ABOVE the highest density so the topmost dot doesn't
    // sit flush with the top edge — gives ~16% headroom inside the plot.
    const peak = Math.max(...points.map((p) => p.density), 1);
    const yMaxLocal = Math.max(peak + 2, 12);
    return {
      xs: xsLocal,
      dMin: dMinLocal,
      range: Math.max(dMaxLocal - dMinLocal, 1),
      yMax: yMaxLocal,
    };
  }, [points]);

  const xPct = (mins: number) => ((mins - dMin) / range) * 100;
  const yPct = (v: number) => 100 - (v / yMax) * 100;

  // Cardinal-spline curve through every point so the line and area are one
  // continuous piece of geometry.
  const { linePath, areaPath, coords } = useMemo(() => {
    const cs = points.map((p, i) => ({
      x: xPct(xs[i]),
      y: yPct(p.density),
    }));
    if (cs.length === 0) return { linePath: "", areaPath: "", coords: cs };
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

  const calloutPoint = arrow_callout
    ? points.find((p) => p.time === arrow_callout.at)
    : undefined;

  // Y ticks — sample whole-number ticks up to a sensible max so they stay readable.
  const yTicks = useMemo(() => {
    const top = Math.min(yMax, 12);
    const stepGuess = Math.ceil(top / 6);
    const out: number[] = [];
    for (let v = stepGuess; v <= 10; v += stepGuess) out.push(v);
    return out;
  }, [yMax]);

  return (
    <ChartCard
      context={context ?? `${scope}`}
      pill="Estimated"
      pillTone="purps"
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header row hidden in compact mode (saves vertical space for the
            embed). When visible, shows the y_label on the left and an inline
            helper sentence on the right — keeping the helper out of the plot
            area where it used to overlay the curve. */}
        {!compact && (
          <div
            className="flex items-baseline justify-between gap-3"
            style={{ marginBottom: 4 }}
          >
            <div
              style={{
                color: BRAND.slate700,
                fontSize: CHART_TOKENS.axisLabel.fontSize,
                fontWeight: CHART_TOKENS.axisLabel.fontWeight,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              {y_label}
            </div>
            {arrow_callout?.helper && (
              <div
                style={{
                  color: BRAND.slate500,
                  fontSize: "clamp(9px, 0.95cqi, 11px)",
                  fontWeight: 600,
                  lineHeight: 1.2,
                  textAlign: "right",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {arrow_callout.helper}
              </div>
            )}
          </div>
        )}

        <div
          className="relative flex-1 min-h-0"
          style={{
            paddingLeft: Y_TICK_W,
            paddingRight: CHART_TOKENS.plotInsetX,
          }}
        >
          {/* Y-axis ticks */}
          <div
            className="absolute flex flex-col-reverse justify-between"
            style={{
              top: HEADER,
              bottom: X_AXIS,
              left: 0,
              width: Y_TICK_W - 4,
            }}
          >
            {yTicks.map((v) => (
              <div
                key={v}
                style={{
                  position: "absolute",
                  bottom: `${(v / yMax) * 100}%`,
                  right: 4,
                  transform: "translateY(50%)",
                  color: BRAND.slate500,
                  fontSize: "clamp(7px, 0.8cqi, 9px)",
                  fontWeight: 700,
                  textAlign: "right",
                  lineHeight: 1,
                }}
              >
                {v}
              </div>
            ))}
          </div>

          {/* Zone backgrounds + zone band labels live in the header strip. */}
          <div
            className="absolute"
            style={{
              top: 0,
              bottom: X_AXIS,
              left: Y_TICK_W,
              right: CHART_TOKENS.plotInsetX,
              pointerEvents: "none",
            }}
          >
            {zones.map((z, i) => {
              const left = xPct(toMin(z.start));
              const right = xPct(toMin(z.end));
              const tone = ZONE_TONES[z.tone];
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `${left}%`,
                    width: `${right - left}%`,
                    background: tone.bg,
                  }}
                >
                  <div
                    className="absolute"
                    style={{
                      top: 6,
                      left: "50%",
                      transform: "translateX(-50%)",
                      color: tone.label,
                      fontSize: CHART_TOKENS.zoneLabel.fontSize,
                      fontWeight: CHART_TOKENS.zoneLabel.fontWeight,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {z.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* SVG: gridlines + area + curve */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute"
            style={{
              top: HEADER,
              bottom: X_AXIS,
              left: Y_TICK_W,
              right: CHART_TOKENS.plotInsetX,
              width: `calc(100% - ${Y_TICK_W + CHART_TOKENS.plotInsetX}px)`,
              height: `calc(100% - ${HEADER + X_AXIS}px)`,
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            <defs>
              <linearGradient id="tribuneFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND.purps} stopOpacity={0.18} />
                <stop offset="100%" stopColor={BRAND.purps} stopOpacity={0.0} />
              </linearGradient>
              {/* Reveal mask — left-to-right wipe. Avoids the dashed-stroke
                  artifact framer-motion's pathLength animation produces when
                  combined with vector-effect: non-scaling-stroke and a
                  stretched viewBox. */}
              <clipPath id="tribuneReveal" clipPathUnits="objectBoundingBox">
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
            {yTicks.map((v) => (
              <line
                key={v}
                x1={0}
                x2={100}
                y1={yPct(v)}
                y2={yPct(v)}
                stroke={BRAND.slate100}
                strokeWidth={0.2}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {areaPath && (
              <motion.path
                d={areaPath}
                fill="url(#tribuneFill)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              />
            )}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={BRAND.purps}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
                clipPath="url(#tribuneReveal)"
              />
            )}
          </svg>

          {/* Data dots + numeric labels */}
          <div
            className="absolute"
            style={{
              top: HEADER,
              bottom: X_AXIS,
              left: Y_TICK_W,
              right: CHART_TOKENS.plotInsetX,
            }}
          >
            {points.map((p, i) => {
              const c = coords[i];
              if (!c) return null;
              const isHovered = hovered === i;
              const isCallout = arrow_callout?.at === p.time;
              return (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${c.x}%`,
                    top: `${c.y}%`,
                    transform: "translate(-50%, -50%)",
                    width: 16,
                    height: 16,
                  }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.1 + i * 0.04, duration: 0.3 }}
                    style={{
                      width: isCallout ? 10 : 7,
                      height: isCallout ? 10 : 7,
                      borderRadius: "50%",
                      background: BRAND.purps,
                      border: isCallout
                        ? `2px solid ${BRAND.purps}`
                        : "2px solid white",
                      boxShadow: isCallout
                        ? `0 0 0 2px white`
                        : isHovered
                          ? `0 0 0 4px ${BRAND.purpsSoft}`
                          : "none",
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      cursor: "pointer",
                    }}
                  />
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      bottom: `calc(50% + ${CHART_TOKENS.dot.labelOffset}px)`,
                      left: "50%",
                      transform: "translateX(-50%)",
                      color: BRAND.slate900,
                      fontSize: CHART_TOKENS.dotLabel.fontSize,
                      fontWeight: CHART_TOKENS.dotLabel.fontWeight,
                    }}
                  >
                    {p.density}
                  </div>
                  {isHovered && (
                    <div
                      className="absolute pointer-events-none z-30"
                      style={{
                        top: "calc(50% + 14px)",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: BRAND.slate900,
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: 6,
                        fontSize: "clamp(9px, 1cqi, 11px)",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.time} · {p.density}/10
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Callout pill — anchored INSIDE the reserved header strip so it
              never gets clipped above the card edge. The arrow tip is the
              little triangle drawn just below it. */}
          {arrow_callout && calloutPoint && (
            <div
              className="absolute"
              style={{
                top: 0,
                bottom: X_AXIS,
                left: Y_TICK_W,
                right: CHART_TOKENS.plotInsetX,
                pointerEvents: "none",
              }}
            >
              <div
                className="absolute"
                style={{
                  left: `${xPct(toMin(arrow_callout.at))}%`,
                  top: HEADER - 26,
                  transform: "translateX(-50%)",
                }}
              >
                <div
                  style={{
                    background: "white",
                    border: `1.5px solid ${BRAND.purps}`,
                    color: BRAND.purps,
                    padding: `${CHART_TOKENS.pill.paddingY}px ${CHART_TOKENS.pill.paddingX}px`,
                    borderRadius: 8,
                    fontSize: CHART_TOKENS.pill.fontSize,
                    fontWeight: CHART_TOKENS.pill.fontWeight,
                    whiteSpace: "nowrap",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  {arrow_callout.label}
                </div>
                {/* Tiny downward arrow indicator */}
                <div
                  style={{
                    position: "absolute",
                    bottom: -5,
                    left: "50%",
                    transform: "translateX(-50%) rotate(45deg)",
                    width: 8,
                    height: 8,
                    background: "white",
                    borderRight: `1.5px solid ${BRAND.purps}`,
                    borderBottom: `1.5px solid ${BRAND.purps}`,
                  }}
                />
              </div>
            </div>
          )}

          {/* X-axis labels — sparser sample in compact to avoid collisions */}
          <div
            className="absolute flex justify-between"
            style={{
              left: Y_TICK_W,
              right: CHART_TOKENS.plotInsetX,
              bottom: 0,
              height: 18,
            }}
          >
            {points
              .filter(
                (_, i) =>
                  i %
                    Math.max(
                      1,
                      Math.floor(points.length / (compact ? 5 : 12)),
                    ) ===
                  0,
              )
              .map((p, i) => (
                <div
                  key={i}
                  style={{
                    color: BRAND.slate700,
                    fontSize: CHART_TOKENS.axisLabel.fontSize,
                    fontWeight: CHART_TOKENS.axisLabel.fontWeight,
                    whiteSpace: "nowrap",
                  }}
                >
                  {fmtClock(p.time)}
                </div>
              ))}
          </div>
        </div>

        {/* Context pills — hidden in compact (host supplies its own copy) */}
        {!compact && context_pills.length > 0 && (
          <div
            className="grid mt-3"
            style={{
              gridTemplateColumns: `repeat(${context_pills.length}, minmax(0, 1fr))`,
              gap: "clamp(4px, 0.7cqi, 8px)",
            }}
          >
            {context_pills.map((p, i) => {
              const Icon = ICON_FOR[p.icon];
              const tone = PILL_TONES[p.tone];
              return (
                <div
                  key={i}
                  className="flex items-center gap-2"
                  style={{
                    background: tone.bg,
                    border: `1px solid ${tone.fg}25`,
                    borderRadius: 10,
                    padding: "clamp(6px, 0.9cqi, 10px) clamp(8px, 1.1cqi, 12px)",
                    minWidth: 0,
                  }}
                >
                  <span
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "white",
                      color: tone.fg,
                    }}
                  >
                    <Icon size={12} strokeWidth={2.5} />
                  </span>
                  <div className="min-w-0">
                    <div
                      style={{
                        color: tone.fg,
                        fontWeight: 800,
                        fontSize: "clamp(9px, 1cqi, 11px)",
                        lineHeight: 1.15,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.title}
                    </div>
                    <div
                      style={{
                        color: BRAND.slate700,
                        fontSize: "clamp(8px, 0.85cqi, 10px)",
                        fontWeight: 600,
                        lineHeight: 1.15,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.subtitle}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ChartCard>
  );
}

function fmtClock(t: string) {
  const [h, m] = t.split(":").map(Number);
  const hh = h % 12 || 12;
  const mm = m ? `:${String(m).padStart(2, "0")}` : "";
  const ap = h < 12 ? "am" : "pm";
  return `${hh}${mm}${ap}`;
}
