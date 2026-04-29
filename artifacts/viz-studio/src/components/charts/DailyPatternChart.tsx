import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { type DailyPatternSpec } from "@/lib/chart-spec";

interface Props {
  spec: DailyPatternSpec;
  context?: string;
}

const ZONE_TONES: Record<
  DailyPatternSpec["zones"][number]["tone"],
  { bg: string; pillBg: string; pillFg: string }
> = {
  best: {
    bg: "rgba(21, 216, 118, 0.10)",
    pillBg: BRAND.bgMint,
    pillFg: "#0E8F4E",
  },
  peak: {
    bg: "rgba(255, 0, 118, 0.10)",
    pillBg: BRAND.candySoft,
    pillFg: BRAND.candy,
  },
  second_best: {
    bg: "rgba(21, 216, 118, 0.10)",
    pillBg: BRAND.bgMint,
    pillFg: "#0E8F4E",
  },
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

export function DailyPatternChart({ spec, context }: Props) {
  const { points, zones, caption } = spec;
  const [hovered, setHovered] = useState<number | null>(null);

  const { xs, dMin, range, yMax } = useMemo(() => {
    const xs = points.map((p) => toMin(p.time));
    const dMin = Math.min(...xs);
    const dMax = Math.max(...xs);
    const yMax = Math.max(...points.map((p) => p.crowd), 10);
    return { xs, dMin, range: Math.max(dMax - dMin, 1), yMax };
  }, [points]);

  const xPct = (mins: number) => ((mins - dMin) / range) * 100;
  const yPct = (v: number) => 100 - (v / yMax) * 100;

  const path = useMemo(() => {
    const coords = points.map((p, i) => ({
      x: xPct(xs[i]),
      y: yPct(p.crowd),
    }));
    if (!coords.length) return "";
    const cmds = [`M ${coords[0].x} ${coords[0].y}`];
    for (let i = 1; i < coords.length; i++) {
      const p0 = coords[i - 1];
      const p1 = coords[i];
      const cx1 = p0.x + (p1.x - p0.x) * 0.5;
      cmds.push(`C ${cx1} ${p0.y}, ${cx1} ${p1.y}, ${p1.x} ${p1.y}`);
    }
    return cmds.join(" ");
  }, [points, xs, range, dMin, yMax]);

  const areaPath = path ? `${path} L 100 100 L 0 100 Z` : "";

  return (
    <ChartCard context={context ?? "Typical daily pattern"}>
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className="relative flex-1 min-h-0"
          style={{ paddingTop: 30, paddingBottom: 24 }}
        >
          {/* Zone backgrounds with pills */}
          {zones.map((z, i) => {
            const left = xPct(toMin(z.start));
            const right = xPct(toMin(z.end));
            const tone = ZONE_TONES[z.tone];
            return (
              <div
                key={i}
                className="absolute"
                style={{
                  top: 0,
                  bottom: 24,
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
                    top: 4,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: tone.pillBg,
                    color: tone.pillFg,
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: "clamp(10px, 1.15cqi, 13px)",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  {z.label}
                </div>
              </div>
            );
          })}

          {/* SVG curve */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-x-0"
            style={{ top: 30, bottom: 24, height: "calc(100% - 54px)", overflow: "visible" }}
          >
            <defs>
              <linearGradient id="dailyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND.purps} stopOpacity={0.22} />
                <stop offset="100%" stopColor={BRAND.purps} stopOpacity={0} />
              </linearGradient>
            </defs>
            <motion.path
              d={areaPath}
              fill="url(#dailyFill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            />
            <motion.path
              d={path}
              fill="none"
              stroke={BRAND.purps}
              strokeWidth={3}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>

          {/* Dots */}
          <div
            className="absolute inset-x-0"
            style={{ top: 30, bottom: 24, height: "calc(100% - 54px)" }}
          >
            {points.map((p, i) => {
              const x = xPct(xs[i]);
              const y = yPct(p.crowd);
              const isHovered = hovered === i;
              return (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
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
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: BRAND.purps,
                      border: "2px solid white",
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
                    <div
                      className="absolute pointer-events-none z-30"
                      style={{
                        bottom: "calc(50% + 12px)",
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
                      {fmtClock(p.time)} · {p.crowd}/{yMax}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* X-axis labels */}
          <div
            className="absolute inset-x-0 flex justify-between"
            style={{ bottom: 0, height: 18 }}
          >
            {points.map((p, i) => {
              // Show first, last, and every nth label to avoid crowding
              const step = Math.max(1, Math.floor(points.length / 9));
              const show = i === 0 || i === points.length - 1 || i % step === 0;
              if (!show) return <div key={i} />;
              return (
                <div
                  key={i}
                  style={{
                    color: BRAND.slate900,
                    fontSize: "clamp(9px, 1cqi, 11px)",
                    fontWeight: 800,
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
        {caption && (caption.opens || caption.last_entry) && (
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
                  Opens <strong style={{ fontWeight: 800 }}>{caption.opens}</strong>
                </span>
              )}
              {caption.opens && caption.last_entry && (
                <span style={{ color: BRAND.purps }}>·</span>
              )}
              {caption.last_entry && (
                <span>
                  Last entry{" "}
                  <strong style={{ fontWeight: 800 }}>{caption.last_entry}</strong>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
