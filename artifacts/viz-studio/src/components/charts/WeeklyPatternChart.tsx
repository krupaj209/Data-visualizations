import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import {
  BRAND,
  CHART_TOKENS,
  LEVEL_FILL,
  LEVEL_FILL_SOFT,
  LEVEL_LABEL,
  getLevelFill,
  type LevelKey,
} from "@/lib/brand";
import {
  DAY_LABELS,
  DAY_ORDER,
  type WeeklyPatternSpec,
} from "@/lib/chart-spec";

interface Props {
  spec: WeeklyPatternSpec;
  context?: string;
  compact?: boolean;
}

const DAY_NOTE_TONE: Record<
  "closed" | "free" | "info",
  { bg: string; fg: string }
> = {
  closed: { bg: BRAND.slate100 as string, fg: BRAND.slate700 as string },
  free: { bg: BRAND.bgMint as string, fg: "#0E8F4E" },
  info: { bg: BRAND.purpsSoft as string, fg: BRAND.purps as string },
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
          // "Soft tint by default; saturate only the called-out extremes."
          // The two pill-bearing levels (busiest, quietest) are the only
          // bars that get the vivid LEVEL_FILL — everything else stays muted.
          const isCallout = d.level === "busiest" || d.level === "quietest";
          const fill = getLevelFill(d.level, isCallout);
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
              {(d.level === "busiest" || d.level === "quietest") && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pointer-events-none"
                  style={{ bottom: `calc(${heightPct}% + 8px)` }}
                >
                  <div
                    style={{
                      backgroundColor:
                        d.level === "busiest" ? BRAND.candySoft : BRAND.bgMint,
                      color: d.level === "busiest" ? BRAND.candy : "#0E8F4E",
                      padding: `${CHART_TOKENS.pill.paddingY}px ${CHART_TOKENS.pill.paddingX}px`,
                      borderRadius: CHART_TOKENS.pill.radius,
                      fontSize: CHART_TOKENS.pill.fontSize,
                      fontWeight: CHART_TOKENS.pill.fontWeight,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d.level === "busiest" ? "Busiest" : "Quietest"}
                  </div>
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
                  fontSize: CHART_TOKENS.axisLabel.fontSize,
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
                      ? BRAND.candy
                      : delta < 0
                        ? "#0E8F4E"
                        : BRAND.slate700,
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
          <div
            className="flex flex-wrap gap-x-3 gap-y-1"
            style={{ marginTop: 8 }}
          >
            {(["quietest", "quiet", "busy", "busiest"] as LevelKey[]).map(
              (lvl) => {
                // Mirror what's on the chart: extreme levels (quietest, busiest)
                // always render as the called-out vivid swatch; middle levels
                // (quiet, busy) live in the soft tint as background bars.
                const swatch =
                  lvl === "quietest" || lvl === "busiest"
                    ? LEVEL_FILL[lvl]
                    : LEVEL_FILL_SOFT[lvl];
                return (
                  <div key={lvl} className="flex items-center gap-1.5">
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: 3,
                        background: swatch,
                      }}
                    />
                    <span
                      style={{
                        color: BRAND.slate700,
                        fontSize: CHART_TOKENS.axisLabel.fontSize,
                        fontWeight: 600,
                      }}
                    >
                      {LEVEL_LABEL[lvl]}
                    </span>
                  </div>
                );
              },
            )}
          </div>

          {spec.day_notes && spec.day_notes.length > 0 && (
            <div
              className="flex flex-wrap gap-1.5"
              style={{ marginTop: 8 }}
            >
              {spec.day_notes.map((note, i) => {
                const tone = DAY_NOTE_TONE[note.kind];
                return (
                  <span
                    key={`${note.label}-${i}`}
                    style={{
                      background: tone.bg,
                      color: tone.fg,
                      padding: "3px 9px",
                      borderRadius: 999,
                      fontSize: CHART_TOKENS.axisLabel.fontSize,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {note.label}
                  </span>
                );
              })}
            </div>
          )}
        </>
      )}
    </ChartCard>
  );
}
