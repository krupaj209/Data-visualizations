import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import { BRAND, LEVEL_FILL, LEVEL_LABEL, type LevelKey } from "@/lib/brand";
import {
  DAY_LABELS,
  DAY_ORDER,
  type WeeklyPatternSpec,
} from "@/lib/chart-spec";

interface Props {
  spec: WeeklyPatternSpec;
  context?: string;
}

export function WeeklyPatternChart({ spec, context }: Props) {
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
    <ChartCard context={context ?? "Crowd level by day"}>
      <div className="flex-1 grid grid-cols-7 gap-2 items-end pt-6">
        {ordered.map((d, i) => {
          const isClosed = d.level === "closed";
          const fill = LEVEL_FILL[d.level];
          const heightPct = Math.max(d.score, isClosed ? 70 : 0);
          return (
            <div
              key={d.day}
              className="relative h-full flex flex-col items-center justify-end"
            >
              {(d.level === "busiest" || d.level === "quietest") && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pointer-events-none"
                  style={{ bottom: `calc(${heightPct}% + 6px)` }}
                >
                  <div
                    style={{
                      backgroundColor:
                        d.level === "busiest" ? BRAND.candySoft : BRAND.bgMint,
                      color: d.level === "busiest" ? BRAND.candy : "#0E8F4E",
                      padding: "3px 9px",
                      borderRadius: 999,
                      fontSize: "clamp(9px, 1cqi, 11px)",
                      fontWeight: 800,
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
                  maxWidth: 84,
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
        className="mt-3 grid grid-cols-7 gap-2"
        style={{ borderTop: `1px solid ${BRAND.slate100}`, paddingTop: 8 }}
      >
        {ordered.map((d) => (
          <div key={d.day} className="text-center">
            <div
              style={{
                color: d.level === "closed" ? BRAND.slate500 : BRAND.slate900,
                fontWeight: 800,
                fontSize: "clamp(11px, 1.3cqi, 15px)",
              }}
            >
              {DAY_LABELS[d.day]}
            </div>
            {d.level === "closed" && (
              <div
                style={{
                  color: BRAND.slate500,
                  fontSize: "clamp(9px, 1cqi, 11px)",
                  fontWeight: 600,
                }}
              >
                Closed
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
        {(["quietest", "quiet", "busy", "busiest"] as LevelKey[]).map((lvl) => (
          <div key={lvl} className="flex items-center gap-1.5">
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: LEVEL_FILL[lvl],
              }}
            />
            <span
              style={{
                color: BRAND.slate700,
                fontSize: "clamp(9px, 1cqi, 11px)",
                fontWeight: 600,
              }}
            >
              {LEVEL_LABEL[lvl]}
            </span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
