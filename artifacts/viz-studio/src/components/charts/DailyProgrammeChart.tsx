import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import {
  CALLOUT_PILL,
  CHART_LAYOUT,
  CHART_TYPE,
} from "@/lib/chart-system";
import { ChartTooltip } from "@/components/charts/system";
import { type DailyProgrammeSpec } from "@/lib/chart-spec";
import { formatClock } from "@/lib/time";

interface Props {
  spec: DailyProgrammeSpec;
  context?: string;
  compact?: boolean;
}

const ICON_GLYPH: Record<NonNullable<DailyProgrammeSpec["events"][number]["icon"]>, string> = {
  feeding: "🍽",
  show: "🎭",
  talk: "🎙",
  prayer: "🙏",
  tour: "🚶",
  ceremony: "✨",
  encounter: "🦁",
  demo: "🔬",
};

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

const fmtClock = formatClock;

export function DailyProgrammeChart({
  spec,
  context,
  compact = false,
}: Props) {
  const { open_time, close_time, events, highlight_event } = spec;
  const [hovered, setHovered] = useState<number | null>(null);

  const open = toMin(open_time);
  const close = toMin(close_time);
  const range = Math.max(close - open, 1);

  const sorted = useMemo(
    () => events.map((e, i) => ({ ...e, _i: i })).sort((a, b) => toMin(a.start_time) - toMin(b.start_time)),
    [events],
  );

  // Tick stops at sensible hour intervals.
  const ticks = useMemo(() => {
    const span = range;
    const step = span > 9 * 60 ? 120 : span > 5 * 60 ? 60 : 30;
    const startHour = Math.ceil(open / step) * step;
    const out: number[] = [];
    for (let m = startHour; m <= close; m += step) out.push(m);
    if (out[0] !== open) out.unshift(open);
    if (out[out.length - 1] !== close) out.push(close);
    return out;
  }, [open, close, range]);

  return (
    <ChartCard
      context={context ?? "Today's fixed programme"}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className="relative flex-1 min-h-0"
          style={{
            paddingTop: compact ? 14 : 22,
            paddingBottom: CHART_LAYOUT.xAxisStripPx,
            paddingLeft: 14,
            paddingRight: 14,
          }}
        >
          {/* Track */}
          <div
            className="absolute"
            style={{
              top: "50%",
              left: 14,
              right: 14,
              height: 8,
              transform: "translateY(-50%)",
              background: BRAND.slate100,
              borderRadius: 999,
            }}
          />
          {/* Open/close shaded ends */}
          <div
            className="absolute"
            style={{
              top: "50%",
              left: 14,
              transform: "translateY(-50%)",
              width: 12,
              height: 16,
              background: BRAND.slate200,
              borderRadius: 4,
            }}
            aria-hidden
          />
          <div
            className="absolute"
            style={{
              top: "50%",
              right: 14,
              transform: "translateY(-50%)",
              width: 12,
              height: 16,
              background: BRAND.slate200,
              borderRadius: 4,
            }}
            aria-hidden
          />

          {/* Event markers */}
          <div
            className="absolute"
            style={{ top: 0, bottom: CHART_LAYOUT.xAxisStripPx, left: 14, right: 14 }}
          >
            {sorted.map((e) => {
              const start = toMin(e.start_time);
              const left = ((start - open) / range) * 100;
              const widthPct = Math.max(
                ((e.duration_min) / range) * 100,
                1.2,
              );
              const isHi =
                (highlight_event && e.name === highlight_event) ||
                e.popularity >= 90;
              const accent = isHi ? BRAND.candy : BRAND.purps;
              const accentSoft = isHi ? BRAND.candySoft : BRAND.purpsSoft;
              const isHov = hovered === e._i;
              return (
                <div
                  key={e._i}
                  className="absolute"
                  style={{
                    left: `${left}%`,
                    top: 0,
                    bottom: 0,
                  }}
                  onMouseEnter={() => setHovered(e._i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* Duration bar */}
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      duration: 0.6,
                      delay: 0.15 + e._i * 0.05,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: 0,
                      transform: "translateY(-50%)",
                      transformOrigin: "left",
                      width: `${widthPct}%`,
                      height: 8,
                      background: accent,
                      borderRadius: 999,
                      opacity: isHov ? 1 : 0.85,
                    }}
                  />
                  {/* Pin */}
                  <div
                    className="absolute"
                    style={{
                      top: "50%",
                      left: 0,
                      transform: "translate(-50%, -50%)",
                      width: compact ? 22 : 28,
                      height: compact ? 22 : 28,
                      borderRadius: "50%",
                      background: "white",
                      border: `2px solid ${accent}`,
                      boxShadow: isHov
                        ? `0 0 0 4px ${accentSoft}`
                        : `0 1px 3px rgba(0,0,0,0.08)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: compact ? 11 : 13,
                      cursor: "pointer",
                    }}
                  >
                    {e.icon ? ICON_GLYPH[e.icon] : "•"}
                  </div>
                  {/* Popularity ring (small dot above pin) */}
                  {!compact && (
                    <div
                      className="absolute"
                      style={{
                        top: "50%",
                        left: 0,
                        transform: `translate(-50%, calc(-50% - ${compact ? 18 : 24}px))`,
                        background: accentSoft,
                        color: accent,
                        padding: "2px 6px",
                        borderRadius: 999,
                        fontSize: 9,
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        opacity: e.popularity >= 70 ? 1 : 0,
                        pointerEvents: "none",
                      }}
                    >
                      {e.popularity >= 90 ? "Fills 30m early" : "Popular"}
                    </div>
                  )}
                  {/* Event label below — persistent in full mode */}
                  {!compact && (
                    <div
                      className="absolute"
                      style={{
                        top: "50%",
                        left: 0,
                        transform: `translate(-50%, calc(50% + 18px))`,
                        textAlign: "center",
                        pointerEvents: "none",
                        width: 96,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "clamp(9px, 1cqi, 11px)",
                          fontWeight: 800,
                          color: isHi ? BRAND.candy : BRAND.slate900,
                          lineHeight: 1.1,
                        }}
                      >
                        {fmtClock(e.start_time)}
                      </div>
                      <div
                        style={{
                          fontSize: "clamp(9px, 0.95cqi, 11px)",
                          fontWeight: 700,
                          color: BRAND.slate900,
                          marginTop: 2,
                          lineHeight: 1.15,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {e.name}
                      </div>
                      <div
                        style={{
                          fontSize: "clamp(8px, 0.85cqi, 10px)",
                          fontWeight: 600,
                          color: BRAND.slate700,
                          marginTop: 1,
                          lineHeight: 1.15,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {e.location}
                      </div>
                    </div>
                  )}
                  {isHov && (
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: 0,
                        transform: `translate(-50%, calc(-50% - ${compact ? 28 : 50}px))`,
                        zIndex: 10,
                      }}
                    >
                      <ChartTooltip anchorXPct={50} offset={0}>
                        <div style={{ fontWeight: 800 }}>{e.name}</div>
                        <div style={{ opacity: 0.85, marginTop: 2 }}>
                          {fmtClock(e.start_time)} · {e.duration_min} min · {e.location}
                        </div>
                      </ChartTooltip>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* X-axis ticks */}
          {!compact && (
            <div
              className="absolute"
              style={{
                bottom: 0,
                left: 14,
                right: 14,
                height: 16,
              }}
            >
              {ticks.map((m, i) => {
                const left = ((m - open) / range) * 100;
                return (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      left: `${left}%`,
                      top: 0,
                      transform: "translateX(-50%)",
                      color: CHART_TYPE.axisTick.color,
                      fontSize: CHART_TYPE.axisTick.fontSize,
                      fontWeight: CHART_TYPE.axisTick.fontWeight,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmtClock(`${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`)}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer caption */}
        {!compact && (
          <div
            className="flex justify-center mt-1"
            style={{ flexShrink: 0 }}
          >
            <div
              className="flex items-center gap-2"
              style={{
                background: BRAND.purpsSoft,
                color: BRAND.purps,
                padding: `${CALLOUT_PILL.paddingY}px ${CALLOUT_PILL.paddingX}px`,
                borderRadius: CALLOUT_PILL.radius,
                fontSize: CALLOUT_PILL.fontSize,
                fontWeight: CALLOUT_PILL.fontWeight,
              }}
            >
              Open {fmtClock(open_time)} · Close {fmtClock(close_time)}
            </div>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
