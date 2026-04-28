import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3 } from "lucide-react";

type Level = "closed" | "quietest" | "quiet" | "busy" | "busiest";

interface DayData {
  day: string;
  full: string;
  level: Level;
  value: number;
  note?: string;
}

const DATA: DayData[] = [
  { day: "Mon", full: "Monday", level: "closed", value: 0, note: "Closed" },
  { day: "Tue", full: "Tuesday", level: "busiest", value: 96 },
  { day: "Wed", full: "Wednesday", level: "quiet", value: 52 },
  { day: "Thu", full: "Thursday", level: "quietest", value: 36 },
  { day: "Fri", full: "Friday", level: "quiet", value: 56 },
  { day: "Sat", full: "Saturday", level: "busy", value: 78 },
  { day: "Sun", full: "Sunday", level: "busiest", value: 94 },
];

const LEVEL_LABEL: Record<Level, string> = {
  closed: "Closed",
  quietest: "Quietest",
  quiet: "Not too busy",
  busy: "Busy",
  busiest: "As busy as it gets",
};

const LEVEL_FILL: Record<Level, string> = {
  closed: "transparent",
  quietest: "#86E0A6",
  quiet: "#9DEAB6",
  busy: "#FFB23F",
  busiest: "#EF5A6F",
};

const LEVEL_TEXT: Record<Level, string> = {
  closed: "text-slate-400",
  quietest: "text-emerald-700",
  quiet: "text-emerald-700",
  busy: "text-amber-700",
  busiest: "text-rose-600",
};

const LEVEL_TAG_BG: Record<Level, string> = {
  closed: "bg-slate-100",
  quietest: "bg-emerald-100",
  quiet: "bg-emerald-100",
  busy: "bg-amber-100",
  busiest: "bg-rose-100",
};

export function WeeklyPattern() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const active = hovered ?? selected;

  const busiestIdxs = useMemo(
    () => DATA.map((d, i) => (d.level === "busiest" ? i : -1)).filter((i) => i >= 0),
    [],
  );
  const quietestIdx = useMemo(() => DATA.findIndex((d) => d.level === "quietest"), []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-violet-50/40 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_20px_60px_-25px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/70 p-8 md:p-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full ring-1 ring-violet-200 bg-violet-50">
              <BarChart3 className="w-4 h-4 text-violet-600" strokeWidth={2.5} />
              <span className="text-sm font-semibold text-violet-700">Estimated</span>
            </div>
            <p className="mt-3 text-sm text-slate-500 font-medium tracking-wide">
              Typical weekly pattern
            </p>
          </div>

          <AnimatePresence mode="wait">
            {active !== null && (
              <motion.div
                key={active}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="text-right"
              >
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400 font-semibold">
                  {DATA[active].full}
                </p>
                <p className={`text-base font-semibold ${LEVEL_TEXT[DATA[active].level]}`}>
                  {LEVEL_LABEL[DATA[active].level]}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chart */}
        <div
          className="relative mt-8 select-none"
          onMouseLeave={() => setHovered(null)}
        >
          <div className="grid grid-cols-7 gap-3 md:gap-5 h-[360px] items-end">
            {DATA.map((d, i) => {
              const isClosed = d.level === "closed";
              const isActive = active === i;
              const isDimmed = active !== null && !isActive;
              const fill = LEVEL_FILL[d.level];
              const heightPct = mounted ? Math.max(d.value, isClosed ? 70 : 0) : 0;

              return (
                <div
                  key={d.day}
                  className="relative h-full flex flex-col items-center justify-end"
                  onMouseEnter={() => setHovered(i)}
                  onClick={() => setSelected(selected === i ? null : i)}
                >
                  {/* Tag (Busiest / Quietest) */}
                  {(d.level === "busiest" || d.level === "quietest") && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 + i * 0.05, duration: 0.35 }}
                      className="absolute -top-1 z-10 flex flex-col items-center pointer-events-none"
                      style={{
                        bottom: `calc(${heightPct}% + 12px)`,
                      }}
                    >
                      <div
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${LEVEL_TAG_BG[d.level]} ${LEVEL_TEXT[d.level]} shadow-sm whitespace-nowrap`}
                      >
                        {d.level === "busiest" ? "Busiest" : "Quietest"}
                      </div>
                      <svg width="10" height="6" viewBox="0 0 10 6" className="-mt-px">
                        <path
                          d="M0 0 L5 6 L10 0 Z"
                          fill={d.level === "busiest" ? "#FECDD3" : "#A7F3D0"}
                        />
                      </svg>
                    </motion.div>
                  )}

                  {/* Tooltip on hover */}
                  <AnimatePresence>
                    {isActive && !isClosed && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-20 -translate-y-3 pointer-events-none"
                        style={{ bottom: `calc(${heightPct}% + 22px)` }}
                      >
                        <div className="bg-slate-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg flex items-center gap-2 whitespace-nowrap">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: fill }}
                          />
                          {d.value}% busy
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Bar */}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{
                      height: `${heightPct}%`,
                      opacity: isDimmed ? 0.35 : 1,
                    }}
                    transition={{
                      height: {
                        duration: 0.9,
                        delay: 0.1 + i * 0.06,
                        ease: [0.22, 1, 0.36, 1],
                      },
                      opacity: { duration: 0.2 },
                    }}
                    className={`w-full max-w-[72px] rounded-2xl cursor-pointer relative ${
                      isClosed ? "border-2 border-dashed border-slate-300" : ""
                    }`}
                    style={{
                      backgroundColor: isClosed ? "transparent" : fill,
                      backgroundImage: isClosed
                        ? "repeating-linear-gradient(135deg, #F1F5F9 0 6px, transparent 6px 12px)"
                        : "none",
                      boxShadow: isActive && !isClosed
                        ? `0 12px 28px -10px ${fill}80, inset 0 0 0 2px white`
                        : "none",
                    }}
                  >
                    {isActive && !isClosed && (
                      <motion.div
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute inset-x-0 top-2 mx-auto w-7 h-1 rounded-full bg-white/70"
                      />
                    )}
                  </motion.div>
                </div>
              );
            })}
          </div>

          {/* Baseline */}
          <div className="h-px bg-slate-200 mt-3" />

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-3 md:gap-5 mt-3">
            {DATA.map((d, i) => {
              const isActive = active === i;
              return (
                <div key={d.day} className="flex flex-col items-center">
                  <span
                    className={`text-base md:text-lg font-bold transition-colors ${
                      isActive
                        ? "text-slate-900"
                        : d.level === "closed"
                          ? "text-slate-400"
                          : "text-slate-700"
                    }`}
                  >
                    {d.day}
                  </span>
                  {d.note && (
                    <span className="text-xs text-slate-400 font-medium mt-0.5">
                      {d.note}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer / Legend */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <LegendDot color={LEVEL_FILL.quietest} label="Quieter" />
            <LegendDot color={LEVEL_FILL.busy} label="Busy" />
            <LegendDot color={LEVEL_FILL.busiest} label="Busiest" />
            <LegendDot dashed label="Closed" />
          </div>
          <p className="text-xs text-slate-400">
            {selected !== null
              ? "Tap a bar again to clear · "
              : "Hover or tap a day for details · "}
            Based on the last 6 weeks
          </p>
        </div>

        {/* Hidden helper to silence unused warnings */}
        <span className="hidden">{busiestIdxs.length + quietestIdx}</span>
      </div>
    </div>
  );
}

function LegendDot({
  color,
  label,
  dashed,
}: {
  color?: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-3 h-3 rounded-md ${
          dashed ? "border-2 border-dashed border-slate-300" : ""
        }`}
        style={{ backgroundColor: dashed ? "transparent" : color }}
      />
      <span className="text-xs text-slate-500 font-medium">{label}</span>
    </div>
  );
}

export default WeeklyPattern;
