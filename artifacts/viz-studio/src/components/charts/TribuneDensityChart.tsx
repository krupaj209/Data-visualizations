import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Users, Sun, Clock } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { type TribuneDensitySpec } from "@/lib/chart-spec";

interface Props {
  spec: TribuneDensitySpec;
  context?: string;
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

export function TribuneDensityChart({ spec, context }: Props) {
  const { points, zones, arrow_callout, context_pills, scope, y_label } = spec;
  const [hovered, setHovered] = useState<number | null>(null);

  const { xs, dMin, dMax, range } = useMemo(() => {
    const xs = points.map((p) => toMin(p.time));
    const dMin = Math.min(...xs);
    const dMax = Math.max(...xs);
    return { xs, dMin, dMax, range: Math.max(dMax - dMin, 1) };
  }, [points]);

  const xPct = (mins: number) => ((mins - dMin) / range) * 100;
  const yMax = 10;
  const yPct = (v: number) => 100 - (v / yMax) * 100;

  const path = useMemo(() => {
    const cmds: string[] = [];
    const coords = points.map((p, i) => ({
      x: xPct(xs[i]),
      y: yPct(p.density),
    }));
    if (coords.length === 0) return "";
    cmds.push(`M ${coords[0].x} ${coords[0].y}`);
    for (let i = 1; i < coords.length; i++) {
      const p0 = coords[i - 1];
      const p1 = coords[i];
      const cx1 = p0.x + (p1.x - p0.x) * 0.5;
      const cx2 = p0.x + (p1.x - p0.x) * 0.5;
      cmds.push(`C ${cx1} ${p0.y}, ${cx2} ${p1.y}, ${p1.x} ${p1.y}`);
    }
    return cmds.join(" ");
  }, [points, xs, range, dMin]);

  const areaPath = path ? `${path} L 100 100 L 0 100 Z` : "";

  // Arrow callout anchor
  const calloutPoint = arrow_callout
    ? points.find((p) => p.time === arrow_callout.at)
    : undefined;

  return (
    <ChartCard
      context={context ?? `${scope}`}
      pill="Estimated"
      pillTone="purps"
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div
          style={{
            color: BRAND.slate700,
            fontSize: "clamp(9px, 0.95cqi, 11px)",
            fontWeight: 700,
            marginBottom: 4,
            lineHeight: 1.2,
          }}
        >
          {y_label}
        </div>

        <div
          className="relative flex-1 min-h-0"
          style={{ paddingLeft: 22, paddingRight: 8, paddingTop: 22 }}
        >
          {/* Y-axis ticks (1..10) */}
          <div
            className="absolute top-[22px] bottom-[22px] left-0 flex flex-col-reverse justify-between"
            style={{ width: 18 }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
              <div
                key={v}
                style={{
                  color: BRAND.slate500,
                  fontSize: "clamp(7px, 0.8cqi, 9px)",
                  fontWeight: 700,
                  textAlign: "right",
                  paddingRight: 4,
                  lineHeight: 1,
                }}
              >
                {v}
              </div>
            ))}
          </div>

          {/* Plot area */}
          <div
            className="relative h-full"
            style={{ marginBottom: 22, height: "calc(100% - 22px)" }}
          >
            {/* Zone backgrounds */}
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
                      fontSize: "clamp(10px, 1.1cqi, 13px)",
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {z.label}
                  </div>
                </div>
              );
            })}

            {/* Horizontal gridlines */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full"
              style={{ overflow: "visible" }}
            >
              {[2, 4, 6, 8].map((v) => (
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
              <defs>
                <linearGradient id="tribuneFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND.purps} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={BRAND.purps} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              {/* Area */}
              <motion.path
                d={areaPath}
                fill="url(#tribuneFill)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              />
              {/* Line */}
              <motion.path
                d={path}
                fill="none"
                stroke={BRAND.purps}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>

            {/* Data dots (with hover tooltips) */}
            {points.map((p, i) => {
              const x = xPct(xs[i]);
              const y = yPct(p.density);
              const isHovered = hovered === i;
              const isCallout = arrow_callout?.at === p.time;
              return (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
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
                  {/* Density label above each dot (matching reference) */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      bottom: "calc(50% + 8px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      color: BRAND.slate900,
                      fontSize: "clamp(9px, 1cqi, 12px)",
                      fontWeight: 700,
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

            {/* Arrow callout */}
            {arrow_callout && calloutPoint && (
              <>
                {/* Callout pill */}
                <div
                  className="absolute pointer-events-none z-20"
                  style={{
                    left: `${xPct(toMin(arrow_callout.at))}%`,
                    top: 0,
                    transform: "translate(-50%, -120%)",
                  }}
                >
                  <div
                    style={{
                      background: "white",
                      border: `1.5px solid ${BRAND.purps}`,
                      color: BRAND.purps,
                      padding: "4px 9px",
                      borderRadius: 8,
                      fontSize: "clamp(9px, 1cqi, 11px)",
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                      boxShadow: "var(--shadow-card)",
                    }}
                  >
                    {arrow_callout.label}
                  </div>
                </div>
                {/* Helper text — pinned near start of "quiet" zone */}
                {arrow_callout.helper && (
                  <div
                    className="absolute pointer-events-none z-20"
                    style={{
                      left: `${xPct(toMin(zones[0]?.start ?? "8:30")) + 1}%`,
                      top: "38%",
                      transform: "translateX(0)",
                      maxWidth: "20%",
                    }}
                  >
                    <div
                      style={{
                        background: BRAND.purpsSoft,
                        border: `1px solid ${BRAND.purps}40`,
                        color: BRAND.purps,
                        padding: "5px 8px",
                        borderRadius: 8,
                        fontSize: "clamp(8px, 0.9cqi, 10px)",
                        fontWeight: 700,
                        lineHeight: 1.25,
                      }}
                    >
                      {arrow_callout.helper}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* X-axis labels */}
          <div
            className="absolute left-[22px] right-[8px] flex justify-between"
            style={{ bottom: 0, height: 18 }}
          >
            {points
              .filter((_, i) => i % Math.max(1, Math.floor(points.length / 12)) === 0)
              .map((p, i) => (
                <div
                  key={i}
                  style={{
                    color: BRAND.slate700,
                    fontSize: "clamp(8px, 0.9cqi, 10px)",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {fmtClock(p.time)}
                </div>
              ))}
          </div>
        </div>

        {/* Context pills */}
        {context_pills.length > 0 && (
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
