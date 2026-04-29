import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Users, Sun, Clock } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import {
  ACCENT_FG,
  ACCENT_SOFT,
  BAND_TONE,
  BRAND,
  CHART_TOKENS,
  getDotStyle,
  type AccentKey,
  type BandToneKey,
} from "@/lib/brand";
import { type TribuneDensitySpec } from "@/lib/chart-spec";
import { ChipButton } from "./interactions/ChipButton";

interface Props {
  spec: TribuneDensitySpec;
  context?: string;
  compact?: boolean;
}

// Map this chart's spec-level zone tones onto the shared BAND_TONE family
// (`calm` = soft green wash, `loud` = saturated candy wash) so the rhythm
// stays in sync with the Daily pattern chart and any future band-using
// chart. The "Peak" (`packed`) zone is the explicit callout — only it
// gets the loud wash; everything else recedes to calm.
const ZONE_BAND: Record<
  TribuneDensitySpec["zones"][number]["tone"],
  BandToneKey
> = {
  quiet: "calm",
  packed: "loud",
  second_window: "calm",
};

// Pill tones reuse the centralized `ACCENT_SOFT` + `ACCENT_FG` rhythm so
// every "soft pill, vivid label" chip in the deck stays identical.
const PILL_ACCENT: Record<
  TribuneDensitySpec["context_pills"][number]["tone"],
  AccentKey
> = {
  candy: "candy",
  okay: "okay",
  purps: "purps",
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

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function fmtClock(t: string) {
  const [h, m] = t.split(":").map(Number);
  const hh = h % 12 || 12;
  const mm = m ? `:${String(m).padStart(2, "0")}` : "";
  const ap = h < 12 ? "am" : "pm";
  return `${hh}${mm}${ap}`;
}

function fmtMin(mins: number) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins - h * 60);
  return fmtClock(`${h}:${String(m).padStart(2, "0")}`);
}

/**
 * Selection types for the Tribune chart. A user can lock the focus from a
 * pill or a zone band. Only one selection lives at a time; selecting again
 * clears it (Esc also clears).
 */
type Selection =
  | { kind: "pill"; idx: number; at?: number; range?: [number, number] }
  | { kind: "zone"; idx: number; range: [number, number] };

function selectionRange(
  s: Selection | null,
): [number, number] | null {
  if (!s) return null;
  if (s.kind === "pill") {
    if (s.range) return s.range;
    if (s.at !== undefined) return [s.at, s.at];
    return null;
  }
  return s.range;
}

function selectionFocusAt(s: Selection | null): number | null {
  if (!s) return null;
  if (s.kind === "pill" && s.at !== undefined) return s.at;
  return null;
}

export function TribuneDensityChart({
  spec,
  context,
  compact = false,
}: Props) {
  const { points, zones, arrow_callout, context_pills, scope, y_label } = spec;
  const [hovered, setHovered] = useState<number | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  const HEADER = compact ? 28 : 56;
  const X_AXIS = CHART_TOKENS.xAxisStripPx;
  const Y_TICK_W = compact ? 16 : 22;

  const { xs, dMin, dMax, range, yMax } = useMemo(() => {
    const xsLocal = points.map((p) => toMin(p.time));
    const dMinLocal = Math.min(...xsLocal);
    const dMaxLocal = Math.max(...xsLocal);
    const peak = Math.max(...points.map((p) => p.density), 1);
    const yMaxLocal = Math.max(peak + 2, 12);
    return {
      xs: xsLocal,
      dMin: dMinLocal,
      dMax: dMaxLocal,
      range: Math.max(dMaxLocal - dMinLocal, 1),
      yMax: yMaxLocal,
    };
  }, [points]);

  const xPct = (mins: number) => ((mins - dMin) / range) * 100;
  const yPct = (v: number) => 100 - (v / yMax) * 100;

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

  const yTicks = useMemo(() => {
    const top = Math.min(yMax, 12);
    const stepGuess = Math.ceil(top / 6);
    const out: number[] = [];
    for (let v = stepGuess; v <= 10; v += stepGuess) out.push(v);
    return out;
  }, [yMax]);

  // Linear interpolation between adjacent points so focused-pill density returns a
  // continuous density value, not a stepped one snapped to the nearest dot.
  const densityAt = useCallback(
    (mins: number) => {
      if (points.length === 0) return 0;
      if (mins <= xs[0]) return points[0].density;
      if (mins >= xs[xs.length - 1]) return points[points.length - 1].density;
      for (let i = 0; i < xs.length - 1; i++) {
        if (mins >= xs[i] && mins <= xs[i + 1]) {
          const t = (mins - xs[i]) / (xs[i + 1] - xs[i] || 1);
          return points[i].density + t * (points[i + 1].density - points[i].density);
        }
      }
      return 0;
    },
    [points, xs],
  );

  const focusAt = selectionFocusAt(selection);
  const focusRange = selectionRange(selection);
  const isDimmed = (mins: number) => {
    if (!focusRange) return false;
    return mins < focusRange[0] || mins > focusRange[1];
  };

  function togglePill(i: number) {
    const pill = context_pills[i];
    const f = pill.focus;
    setSelection((prev) => {
      if (prev?.kind === "pill" && prev.idx === i) return null;
      const next: Selection = {
        kind: "pill",
        idx: i,
        at: f?.at ? toMin(f.at) : undefined,
        range:
          f?.start && f?.end
            ? [toMin(f.start), toMin(f.end)]
            : undefined,
      };
      return next;
    });
  }

  function toggleZone(i: number) {
    const z = zones[i];
    setSelection((prev) => {
      if (prev?.kind === "zone" && prev.idx === i) return null;
      return { kind: "zone", idx: i, range: [toMin(z.start), toMin(z.end)] };
    });
  }

  // Esc anywhere clears the lock.
  useEffect(() => {
    if (!selection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelection(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection]);

  return (
    <ChartCard
      context={context ?? `${scope}`}
      pill="Estimated"
      pillTone="purps"
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
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

          {/* Zone bands — now interactive buttons. Active zone gets a deeper
              fill; non-active dim slightly when something else is selected. */}
          <div
            className="absolute"
            style={{
              top: 0,
              bottom: X_AXIS,
              left: Y_TICK_W,
              right: CHART_TOKENS.plotInsetX,
            }}
          >
            {zones.map((z, i) => {
              const left = xPct(toMin(z.start));
              const right = xPct(toMin(z.end));
              const tone = BAND_TONE[ZONE_BAND[z.tone]];
              const isActive =
                selection?.kind === "zone" && selection.idx === i;
              const dimOthers =
                selection !== null && !isActive;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleZone(i)}
                  aria-label={`Lock zone ${z.label}`}
                  aria-pressed={isActive}
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: `${left}%`,
                    width: `${right - left}%`,
                    background: isActive ? tone.bgActive : tone.bg,
                    opacity: dimOthers ? 0.5 : 1,
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    outline: "none",
                    transition:
                      "background .2s ease, opacity .2s ease, box-shadow .2s ease",
                    boxShadow: isActive
                      ? `inset 0 0 0 2px ${tone.label}`
                      : undefined,
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleZone(i);
                    }
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 6,
                      left: "50%",
                      transform: "translateX(-50%)",
                      color: tone.label,
                      fontSize: CHART_TOKENS.zoneLabel.fontSize,
                      fontWeight: CHART_TOKENS.zoneLabel.fontWeight,
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                    }}
                  >
                    {z.label}
                  </div>
                </button>
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
                animate={{
                  opacity: focusRange ? 0.55 : 1,
                }}
                transition={{ duration: 0.4 }}
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
                style={{
                  opacity: focusRange ? 0.45 : 1,
                  transition: "opacity .25s ease",
                }}
              />
            )}
            {/* Highlighted curve segment for the focused range. */}
            {focusRange && focusRange[0] !== focusRange[1] && (
              <FocusedSegment
                xs={xs}
                points={points}
                xPct={xPct}
                yPct={yPct}
                from={focusRange[0]}
                to={focusRange[1]}
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
              const mins = xs[i];
              const dim = isDimmed(mins);
              const isFocusAt = focusAt !== null && Math.abs(focusAt - mins) < 1;
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
                    opacity: dim ? 0.3 : 1,
                    transition: "opacity .25s ease",
                  }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.1 + i * 0.04, duration: 0.3 }}
                    style={{
                      // Hollow ring by default, saturated fill only on the
                      // callout/focused points — the centralized
                      // "soft default, vivid on callout" dot rhythm. Tribune
                      // overrides the callout border so the white visual
                      // separation comes from the boxShadow ring below.
                      ...getDotStyle(
                        isFocusAt || isCallout ? "callout" : "default",
                      ),
                      border: `2px solid ${BRAND.purps}`,
                      width: isFocusAt ? 12 : isCallout ? 10 : 7,
                      height: isFocusAt ? 12 : isCallout ? 10 : 7,
                      borderRadius: "50%",
                      boxShadow: isFocusAt
                        ? `0 0 0 4px ${BRAND.purps}40`
                        : isCallout
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

            {/* Focus marker for "at" selections (pill with .at). */}
            {focusAt !== null && (
              <FocusMarker
                xPct={xPct}
                yPct={yPct}
                at={focusAt}
                density={densityAt(focusAt)}
                onDataPoint={points.some(
                  (p) => Math.abs(toMin(p.time) - focusAt) < 1,
                )}
                pillLabel={
                  selection?.kind === "pill"
                    ? context_pills[selection.idx].title
                    : undefined
                }
              />
            )}
          </div>

          {/* Callout pill */}
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
                  opacity: focusRange ? 0.4 : 1,
                  transition: "opacity .25s ease",
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

          {/* X-axis labels */}
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

        {/* Context pills — clickable. Selecting one drives the focus on the
            curve. Re-clicking or pressing Esc clears. */}
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
              const accent = PILL_ACCENT[p.tone];
              const pillBg = ACCENT_SOFT[accent];
              const pillFg = ACCENT_FG[accent];
              const isActive =
                selection?.kind === "pill" && selection.idx === i;
              const dimOthers =
                selection !== null && !isActive;
              return (
                <ChipButton
                  key={i}
                  active={isActive}
                  dim={dimOthers}
                  onClick={() => togglePill(i)}
                  bg={pillBg}
                  fg={pillFg}
                  ariaPressed={isActive}
                  ariaLabel={`Highlight ${p.title} on chart`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding:
                      "clamp(6px, 0.9cqi, 10px) clamp(8px, 1.1cqi, 12px)",
                    borderRadius: 10,
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
                      color: pillFg,
                    }}
                  >
                    <Icon size={12} strokeWidth={2.5} />
                  </span>
                  <div className="min-w-0">
                    <div
                      style={{
                        color: pillFg,
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
                </ChipButton>
              );
            })}
          </div>
        )}
      </div>
    </ChartCard>
  );
}

function FocusMarker({
  xPct,
  yPct,
  at,
  density,
  onDataPoint,
  pillLabel,
}: {
  xPct: (mins: number) => number;
  yPct: (v: number) => number;
  at: number;
  density: number;
  onDataPoint: boolean;
  pillLabel?: string;
}) {
  const x = xPct(at);
  // Clamp tooltip horizontally so it doesn't overflow the plot area.
  let tipLeft = "50%";
  let tipTransform = "translateX(-50%)";
  if (x < 12) {
    tipLeft = "0%";
    tipTransform = "translateX(0)";
  } else if (x > 88) {
    tipLeft = "100%";
    tipTransform = "translateX(-100%)";
  }
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${yPct(density)}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {!onDataPoint && (
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: BRAND.purps,
            border: "3px solid white",
            boxShadow: `0 0 0 3px ${BRAND.purps}30`,
          }}
        />
      )}
      <div
        className="absolute"
        style={{
          left: tipLeft,
          top: -36,
          transform: tipTransform,
          background: BRAND.slate900,
          color: "white",
          padding: "5px 10px",
          borderRadius: 8,
          fontSize: "clamp(9px, 1cqi, 11px)",
          fontWeight: 800,
          whiteSpace: "nowrap",
        }}
      >
        {pillLabel ? `${pillLabel} · ` : ""}
        {fmtMin(at)} · {Math.round(density)}/10
      </div>
    </div>
  );
}

/**
 * Re-draws the curve segment between `from` and `to` minutes in solid Purps
 * over the dimmed full curve. We rebuild the geometry rather than masking so
 * the highlighted portion gets crisp endpoints exactly at the focus range.
 */
function FocusedSegment({
  xs,
  points,
  xPct,
  yPct,
  from,
  to,
}: {
  xs: number[];
  points: TribuneDensitySpec["points"];
  xPct: (mins: number) => number;
  yPct: (v: number) => number;
  from: number;
  to: number;
}) {
  const inRange = points
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => xs[i] >= from && xs[i] <= to);
  if (inRange.length < 2) return null;
  const cs = inRange.map(({ p, i }) => ({
    x: xPct(xs[i]),
    y: yPct(p.density),
  }));
  const cmds: string[] = [`M ${cs[0].x.toFixed(3)} ${cs[0].y.toFixed(3)}`];
  for (let i = 1; i < cs.length; i++) {
    cmds.push(`L ${cs[i].x.toFixed(3)} ${cs[i].y.toFixed(3)}`);
  }
  return (
    <path
      d={cmds.join(" ")}
      fill="none"
      stroke={BRAND.purps}
      strokeWidth={3}
      vectorEffect="non-scaling-stroke"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}
