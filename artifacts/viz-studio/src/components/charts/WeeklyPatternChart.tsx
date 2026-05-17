import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import {
  ACCENT_FG,
  ACCENT_SOFT,
  BRAND,
  type LevelKey,
} from "@/lib/brand";
import { CHART_TYPE } from "@/lib/chart-system";
import {
  CalloutPill,
  Legend,
  LegendItem,
} from "@/components/charts/system";
import {
  DAY_LABELS,
  DAY_ORDER,
  type WeeklyPatternSpec,
} from "@/lib/chart-spec";

/**
 * Task #109 traffic-light ramp. Five score bands keyed on the existing
 * 0–100 crowd score (which is what the LevelKey buckets are computed
 * from upstream). Bar fill stays soft tint by default; saturate the
 * called-out extremes via `getTrafficColor(score, isCallout)`.
 *
 *   0–20   empty     mint green
 *   20–40  light     lime
 *   40–60  moderate  amber
 *   60–80  busy      orange
 *   80–100 packed    red
 */
type TrafficStep = "empty" | "light" | "moderate" | "busy" | "packed";

const TRAFFIC_FILL: Record<TrafficStep, string> = {
  empty: BRAND.okayGreen,
  light: BRAND.subtleGreen,
  moderate: BRAND.joyMustard,
  busy: BRAND.hola,
  packed: BRAND.candy,
};

const TRAFFIC_FILL_SOFT: Record<TrafficStep, string> = {
  empty: BRAND.bgMint,
  light: BRAND.bgSage,
  moderate: BRAND.bgCream,
  busy: BRAND.holaSoft,
  packed: BRAND.candySoft,
};

const TRAFFIC_LABEL: Record<TrafficStep, string> = {
  empty: "Empty",
  light: "Light",
  moderate: "Moderate",
  busy: "Busy",
  packed: "Packed",
};

function scoreToStep(score: number): TrafficStep {
  if (score < 20) return "empty";
  if (score < 40) return "light";
  if (score < 60) return "moderate";
  if (score < 80) return "busy";
  return "packed";
}

function getTrafficFill(score: number, isCallout: boolean): string {
  const step = scoreToStep(score);
  return isCallout ? TRAFFIC_FILL[step] : TRAFFIC_FILL_SOFT[step];
}

interface Props {
  spec: WeeklyPatternSpec;
  context?: string;
  compact?: boolean;
}

const DAY_NOTE_TONE: Record<
  "closed" | "free" | "info",
  { bg: string; fg: string }
> = {
  closed: { bg: ACCENT_SOFT.slate, fg: ACCENT_FG.slate },
  free: { bg: ACCENT_SOFT.okay, fg: ACCENT_FG.okay },
  info: { bg: ACCENT_SOFT.purps, fg: ACCENT_FG.purps },
};

const PILL_HEADROOM = 26;
const MAX_BAR_FILL = 0.78;

export function WeeklyPatternChart({ spec, context, compact = false }: Props) {
  const byDay = new Map(spec.days.map((d) => [d.day, d]));
  const ordered = DAY_ORDER.map(
    (code) =>
      byDay.get(code) ?? {
        day: code,
        level: "quiet" as LevelKey,
        score: 0,
      },
  );

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Average across open days only — closed days would skew the comparison.
  const openAvg = useMemo(() => {
    const open = ordered.filter((d) => d.level !== "closed");
    if (open.length === 0) return 0;
    return open.reduce((s, d) => s + d.score, 0) / open.length;
  }, [ordered]);

  // "★ Best" marker — lowest-score open day. Task #109 traffic-light
  // overhaul: the writer's eye should land on the day with the shortest
  // expected wait, separately from the busiest/quietest level callouts
  // (those are pre-tagged on the spec; this is computed).
  const bestDayIdx = useMemo(() => {
    let best = -1;
    let bestScore = Infinity;
    ordered.forEach((d, i) => {
      if (d.level === "closed") return;
      if (d.score < bestScore) {
        bestScore = d.score;
        best = i;
      }
    });
    return best;
  }, [ordered]);

  useEffect(() => {
    if (selectedIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedIdx(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIdx]);

  function handleKey(e: React.KeyboardEvent, i: number) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = (i + 1) % ordered.length;
      buttonRefs.current[next]?.focus();
      setSelectedIdx(next);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (i - 1 + ordered.length) % ordered.length;
      buttonRefs.current[prev]?.focus();
      setSelectedIdx(prev);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelectedIdx((p) => (p === i ? null : i));
    }
  }

  const selected = selectedIdx !== null ? ordered[selectedIdx] : null;
  const selectedNote =
    selected && (selected as WeeklyPatternSpec["days"][number]).note;
  const delta = selected ? selected.score - openAvg : 0;

  return (
    <ChartCard context={context ?? "Crowd level by day"} compact={compact}>
      <div
        className="flex-1 grid grid-cols-7 items-end"
        style={{
          gap: "clamp(10px, 2.2cqi, 22px)",
          paddingTop: PILL_HEADROOM,
        }}
        role="tablist"
        aria-label="Days of the week"
      >
        {ordered.map((d, i) => {
          const isClosed = d.level === "closed";
          // Task #109: bar fill is now keyed on the 0–100 score via the
          // traffic-light ramp. Extremes (busiest / quietest level pills
          // or the computed "best" day) saturate; the rest stay soft.
          const isBest = bestDayIdx === i;
          const isCallout =
            d.level === "busiest" || d.level === "quietest" || isBest;
          const fill = isClosed
            ? "transparent"
            : getTrafficFill(d.score, isCallout);
          const rawPct = Math.max(d.score, isClosed ? 60 : 0);
          const heightPct = rawPct * MAX_BAR_FILL;
          const isActive = selectedIdx === i;
          const dimOthers = selectedIdx !== null && !isActive;
          return (
            <button
              key={d.day}
              ref={(el) => {
                buttonRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`${DAY_LABELS[d.day]}${isClosed ? ", closed" : `, score ${d.score} of 100`}`}
              onClick={() => setSelectedIdx((p) => (p === i ? null : i))}
              onKeyDown={(e) => handleKey(e, i)}
              className="relative h-full flex flex-col items-center justify-end"
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                opacity: dimOthers ? 0.45 : 1,
                outline: "none",
                transition: "opacity .2s ease",
              }}
            >
              {(d.level === "busiest" || d.level === "quietest" || isBest) && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pointer-events-none gap-1"
                  style={{ bottom: `calc(${heightPct}% + 8px)` }}
                >
                  {isBest && d.level !== "quietest" && (
                    <CalloutPill bg={BRAND.purpsSoft} fg={BRAND.purps}>
                      <Star
                        size={10}
                        strokeWidth={2.5}
                        style={{ marginRight: 2 }}
                      />
                      Best
                    </CalloutPill>
                  )}
                  {(d.level === "busiest" || d.level === "quietest") && (
                    <CalloutPill
                      bg={
                        d.level === "busiest" ? BRAND.candySoft : BRAND.bgMint
                      }
                      fg={d.level === "busiest" ? BRAND.candy : "#0E8F4E"}
                    >
                      {d.level === "busiest" ? "Busiest" : "Quietest"}
                      {isBest && d.level === "quietest" ? " · ★ Best" : ""}
                    </CalloutPill>
                  )}
                </div>
              )}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${heightPct}%` }}
                transition={{
                  duration: 0.9,
                  delay: 0.05 + i * 0.05,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="w-full"
                style={{
                  maxWidth: 56,
                  margin: "0 auto",
                  backgroundColor: isClosed ? "transparent" : fill,
                  backgroundImage: isClosed
                    ? "repeating-linear-gradient(135deg, #F0F0F0 0 6px, transparent 6px 12px)"
                    : "none",
                  border: isClosed ? `2px dashed ${BRAND.slate300}` : "none",
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                  borderBottomLeftRadius: 4,
                  borderBottomRightRadius: 4,
                  boxShadow: isActive
                    ? `0 0 0 3px ${BRAND.purps}, 0 0 0 5px white inset`
                    : undefined,
                  transition: "box-shadow .15s ease",
                }}
              />
            </button>
          );
        })}
      </div>

      <div
        className="grid grid-cols-7"
        style={{
          gap: "clamp(10px, 2.2cqi, 22px)",
          borderTop: `1px solid ${BRAND.slate100}`,
          marginTop: 8,
          paddingTop: 6,
        }}
      >
        {ordered.map((d, i) => (
          <div key={d.day} className="text-center">
            <div
              style={{
                color:
                  d.level === "closed"
                    ? BRAND.slate500
                    : selectedIdx === i
                      ? BRAND.purps
                      : BRAND.slate900,
                fontWeight: 800,
                fontSize: "clamp(11px, 1.3cqi, 15px)",
                lineHeight: 1.1,
              }}
            >
              {DAY_LABELS[d.day]}
            </div>
            {d.level === "closed" && (
              <div
                style={{
                  color: BRAND.slate500,
                  fontSize: CHART_TYPE.axisTick.fontSize,
                  fontWeight: 600,
                  marginTop: 1,
                }}
              >
                Closed
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selected-day readout. Closed days show "Closed" instead of a delta. */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            marginTop: 10,
            padding: "8px 12px",
            borderRadius: 10,
            background: BRAND.slate50,
            border: `1px solid ${BRAND.slate100}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
          role="status"
          aria-live="polite"
        >
          <span
            style={{
              color: BRAND.purps,
              fontWeight: 800,
              fontSize: "clamp(11px, 1.2cqi, 13px)",
            }}
          >
            {DAY_LABELS[selected.day]}
          </span>
          {selected.level === "closed" ? (
            <span
              style={{
                color: BRAND.slate700,
                fontWeight: 700,
                fontSize: "clamp(10px, 1.1cqi, 12px)",
              }}
            >
              Closed all day
            </span>
          ) : (
            <>
              <span
                style={{
                  color: BRAND.slate900,
                  fontWeight: 700,
                  fontSize: "clamp(10px, 1.1cqi, 12px)",
                }}
              >
                Crowd score {selected.score}/100
              </span>
              <span
                style={{
                  color:
                    delta > 0
                      ? ACCENT_FG.candy
                      : delta < 0
                        ? ACCENT_FG.okay
                        : ACCENT_FG.slate,
                  fontWeight: 800,
                  fontSize: "clamp(10px, 1.1cqi, 12px)",
                }}
              >
                {delta > 0 ? "+" : ""}
                {delta.toFixed(0)} vs open-day avg
              </span>
            </>
          )}
          {selectedNote && (
            <span
              style={{
                color: BRAND.slate700,
                fontWeight: 600,
                fontSize: "clamp(10px, 1.1cqi, 12px)",
                flex: "1 1 100%",
              }}
            >
              {selectedNote}
            </span>
          )}
        </motion.div>
      )}

      {!compact && (
        <>
          <Legend>
            {(
              ["empty", "light", "moderate", "busy", "packed"] as TrafficStep[]
            ).map((step) => {
              // Mirror the bar rhythm: the two extremes saturate to match
              // the called-out bars, the middle steps stay soft.
              const swatch =
                step === "empty" || step === "packed"
                  ? TRAFFIC_FILL[step]
                  : TRAFFIC_FILL_SOFT[step];
              return (
                <LegendItem
                  key={step}
                  color={swatch}
                  label={TRAFFIC_LABEL[step]}
                />
              );
            })}
          </Legend>

          {spec.day_notes && spec.day_notes.length > 0 && (
            <div
              className="flex flex-wrap gap-1.5"
              style={{ marginTop: 8 }}
            >
              {spec.day_notes.map((note, i) => {
                const tone = DAY_NOTE_TONE[note.kind];
                return (
                  <CalloutPill
                    key={`${note.label}-${i}`}
                    bg={tone.bg}
                    fg={tone.fg}
                  >
                    {note.label}
                  </CalloutPill>
                );
              })}
            </div>
          )}
        </>
      )}
    </ChartCard>
  );
}
