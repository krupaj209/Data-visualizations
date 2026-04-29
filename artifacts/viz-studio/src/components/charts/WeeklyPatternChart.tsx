import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import {
  BRAND,
  CHART_TOKENS,
  LEVEL_FILL,
  LEVEL_LABEL,
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

/** Headroom strip above the bars so the "Busiest"/"Quietest" pills always sit
 *  clearly above the bar tops without colliding with the card edge. */
const PILL_HEADROOM = 26;
/** Cap how much of the bar row's vertical space the tallest bar fills.
 *  Without this, bars stretch with the container and feel tall-and-skinny. */
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

  return (
    <ChartCard context={context ?? "Crowd level by day"} compact={compact}>
      {/* Bar row — fixed PILL_HEADROOM at top reserves space for the
          Busiest/Quietest pills, then bars fill at most MAX_BAR_FILL of the
          remaining height so they read as proportioned to the card. */}
      <div
        className="flex-1 grid grid-cols-7 items-end"
        style={{
          gap: "clamp(6px, 1.2cqi, 14px)",
          paddingTop: PILL_HEADROOM,
        }}
      >
        {ordered.map((d, i) => {
          const isClosed = d.level === "closed";
          const fill = LEVEL_FILL[d.level];
          // Closed days get a fixed 60% block (visible but not dominant).
          const rawPct = Math.max(d.score, isClosed ? 60 : 0);
          // Apply the cap: the tallest bar (score=100) fills MAX_BAR_FILL.
          const heightPct = rawPct * MAX_BAR_FILL;
          return (
            <div
              key={d.day}
              className="relative h-full flex flex-col items-center justify-end"
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
                  // Wider bars + tighter gap make the row feel grounded
                  // rather than tall-and-skinny.
                  maxWidth: 96,
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
                }}
              />
            </div>
          );
        })}
      </div>

      <div
        className="grid grid-cols-7"
        style={{
          gap: "clamp(6px, 1.2cqi, 14px)",
          borderTop: `1px solid ${BRAND.slate100}`,
          marginTop: 8,
          paddingTop: 6,
        }}
      >
        {ordered.map((d) => (
          <div key={d.day} className="text-center">
            <div
              style={{
                color: d.level === "closed" ? BRAND.slate500 : BRAND.slate900,
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

      {!compact && (
        <>
          <div
            className="flex flex-wrap gap-x-3 gap-y-1"
            style={{ marginTop: 8 }}
          >
            {(["quietest", "quiet", "busy", "busiest"] as LevelKey[]).map(
              (lvl) => (
                <div key={lvl} className="flex items-center gap-1.5">
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 3,
                      background: LEVEL_FILL[lvl],
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
              ),
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
