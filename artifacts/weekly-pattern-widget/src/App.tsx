import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

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

// Headout palette — Candy for busiest, Hola for busy, Subtle/Okay green for quiet bands
const LEVEL_FILL: Record<Level, string> = {
  closed: "transparent",
  quietest: "#15D876", // Okay green
  quiet: "#CDF280", // Subtle green
  busy: "#FF9800", // Hola
  busiest: "#FF0076", // Candy
};

const LEVEL_TAG_BG: Record<Level, string> = {
  closed: "#F0F0F0",
  quietest: "#D2FDEB", // bg mint
  quiet: "#DBF9DB", // bg sage
  busy: "#FFF1D9",
  busiest: "#FFE4EF", // bg accent soft
};

const LEVEL_TAG_FG: Record<Level, string> = {
  closed: "#666666",
  quietest: "#0E8F4E",
  quiet: "#3F8B2E",
  busy: "#A65A00",
  busiest: "#FF0076", // Candy
};

const LEVEL_TEXT_CLASS: Record<Level, string> = {
  closed: "text-[#666]",
  quietest: "text-[#0E8F4E]",
  quiet: "text-[#3F8B2E]",
  busy: "text-[#A65A00]",
  busiest: "text-[#FF0076]",
};

function WeeklyPattern() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const active = hovered ?? selected;

  const summary = useMemo(() => {
    const busiest = DATA.filter((d) => d.level === "busiest").map((d) => d.full);
    const quietest = DATA.find((d) => d.level === "quietest")?.full;
    return { busiest, quietest };
  }, []);

  return (
    <div
      className="w-full rounded-3xl p-6 sm:p-8 md:p-10"
      style={{
        background: "#FFFFFF",
        boxShadow:
          "0 24px 48px rgba(15,15,16,0.10), 0 4px 8px rgba(15,15,16,0.05)",
        border: "1px solid #F0F0F0",
      }}
    >
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: "#F3E8FF",
              color: "#8000FF",
            }}
          >
            <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span className="text-xs font-bold tracking-[0.02em] uppercase">
              Estimated
            </span>
          </div>
          <h2
            className="mt-3 text-[22px] sm:text-[26px] md:text-[28px] font-extrabold leading-[1.15] tracking-[-0.015em]"
            style={{ color: "#0F0F10" }}
          >
            Typical weekly pattern
          </h2>
          <p
            className="mt-1 text-sm font-medium"
            style={{ color: "#666" }}
          >
            How busy this experience usually gets
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
              <p
                className="text-[11px] uppercase tracking-[0.08em] font-bold"
                style={{ color: "#A6A6A6" }}
              >
                {DATA[active].full}
              </p>
              <p
                className={`text-base font-extrabold ${LEVEL_TEXT_CLASS[DATA[active].level]}`}
              >
                {LEVEL_LABEL[DATA[active].level]}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        className="relative mt-8 select-none"
        onMouseLeave={() => setHovered(null)}
      >
        <div className="grid grid-cols-7 gap-2 sm:gap-3 md:gap-5 h-[300px] sm:h-[340px] md:h-[360px] items-end pt-10">
          {DATA.map((d, i) => {
            const isClosed = d.level === "closed";
            const isActive = active === i;
            const isDimmed = active !== null && !isActive;
            const fill = LEVEL_FILL[d.level];
            const heightPct = mounted
              ? Math.max(d.value, isClosed ? 70 : 0)
              : 0;

            return (
              <div
                key={d.day}
                className="relative h-full flex flex-col items-center justify-end"
                onMouseEnter={() => setHovered(i)}
                onClick={() => setSelected(selected === i ? null : i)}
              >
                {(d.level === "busiest" || d.level === "quietest") && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                    className="absolute left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none"
                    style={{ bottom: `calc(${heightPct}% + 8px)` }}
                  >
                    <div
                      className="px-2.5 py-1 rounded-full text-[11px] font-extrabold shadow-sm whitespace-nowrap"
                      style={{
                        backgroundColor: LEVEL_TAG_BG[d.level],
                        color: LEVEL_TAG_FG[d.level],
                      }}
                    >
                      {d.level === "busiest" ? "Busiest" : "Quietest"}
                    </div>
                    <svg
                      width="10"
                      height="6"
                      viewBox="0 0 10 6"
                      className="-mt-px"
                    >
                      <path
                        d="M0 0 L5 6 L10 0 Z"
                        fill={LEVEL_TAG_BG[d.level]}
                      />
                    </svg>
                  </motion.div>
                )}

                <AnimatePresence>
                  {isActive && !isClosed && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                      style={{ bottom: `calc(${heightPct}% + 38px)` }}
                    >
                      <div
                        className="text-white text-xs font-extrabold px-2.5 py-1.5 rounded-xl shadow-lg flex items-center gap-2 whitespace-nowrap"
                        style={{ background: "#0F0F10" }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: fill }}
                        />
                        {d.value}% busy
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                  className={`w-full max-w-[72px] cursor-pointer relative ${
                    isClosed ? "border-2 border-dashed" : ""
                  }`}
                  style={{
                    backgroundColor: isClosed ? "transparent" : fill,
                    backgroundImage: isClosed
                      ? "repeating-linear-gradient(135deg, #F0F0F0 0 6px, transparent 6px 12px)"
                      : "none",
                    borderColor: isClosed ? "#D0D0D0" : "transparent",
                    borderRadius: 16,
                    boxShadow:
                      isActive && !isClosed
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

        <div
          className="h-px mt-3"
          style={{ background: "#E6E6E9" }}
        />

        <div className="grid grid-cols-7 gap-2 sm:gap-3 md:gap-5 mt-3">
          {DATA.map((d, i) => {
            const isActive = active === i;
            return (
              <div key={d.day} className="flex flex-col items-center">
                <span
                  className="text-base md:text-[17px] font-extrabold transition-colors"
                  style={{
                    color: isActive
                      ? "#0F0F10"
                      : d.level === "closed"
                        ? "#A6A6A6"
                        : "#222222",
                  }}
                >
                  {d.day}
                </span>
                {d.note && (
                  <span
                    className="text-[11px] font-semibold mt-0.5"
                    style={{ color: "#A6A6A6" }}
                  >
                    {d.note}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="mt-8 pt-6 flex flex-wrap items-center justify-between gap-4"
        style={{ borderTop: "1px solid #F0F0F0" }}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <LegendDot color={LEVEL_FILL.quietest} label="Quieter" />
          <LegendDot color={LEVEL_FILL.busy} label="Busy" />
          <LegendDot color={LEVEL_FILL.busiest} label="Busiest" />
          <LegendDot dashed label="Closed" />
        </div>
        <p className="text-[12px] font-medium" style={{ color: "#888" }}>
          {selected !== null
            ? "Tap a bar again to clear · "
            : "Hover or tap a day for details · "}
          Based on the last 6 weeks
        </p>
      </div>

      <span className="hidden">
        {summary.busiest.join(",")}/{summary.quietest}
      </span>
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
        className="w-3 h-3 rounded-md"
        style={{
          backgroundColor: dashed ? "transparent" : color,
          border: dashed ? "2px dashed #D0D0D0" : "none",
        }}
      />
      <span
        className="text-[12px] font-semibold"
        style={{ color: "#666" }}
      >
        {label}
      </span>
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-5xl">
        <WeeklyPattern />
      </div>
    </div>
  );
}

export default App;
