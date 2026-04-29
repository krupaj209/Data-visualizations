import { useState } from "react";
import { motion } from "framer-motion";
import { Landmark, ArrowDown, ArrowUp } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { type EntranceLanesSpec } from "@/lib/chart-spec";

interface Props {
  spec: EntranceLanesSpec;
  context?: string;
}

const TONES: Record<
  EntranceLanesSpec["lanes"][number]["tone"],
  { dot: string; pillBg: string; pillFg: string; bar: string }
> = {
  candy: {
    dot: BRAND.candy,
    pillBg: BRAND.candySoft,
    pillFg: BRAND.candy,
    bar: BRAND.candy,
  },
  purps: {
    dot: BRAND.purps,
    pillBg: BRAND.purpsSoft,
    pillFg: BRAND.purps,
    bar: BRAND.purps,
  },
  okay: {
    dot: "#15A85F",
    pillBg: BRAND.bgMint,
    pillFg: "#0E8F4E",
    bar: "#15A85F",
  },
  slate: {
    dot: BRAND.purps,
    pillBg: BRAND.purpsSoft,
    pillFg: BRAND.purps,
    bar: BRAND.purps,
  },
};

export function EntranceLanesChart({ spec, context }: Props) {
  const { venue_label, shared_caption, lanes } = spec;
  const maxDots = Math.max(...lanes.map((l) => l.dots), 1);
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <ChartCard context={context ?? "Entrance lane comparison"}>
      <div className="flex-1 flex flex-col min-h-0">
        {/* Title strip */}
        <div
          className="flex items-center gap-3 px-4 py-3 mb-4"
          style={{
            background: BRAND.purpsSoft,
            borderRadius: 12,
          }}
        >
          <span
            className="flex items-center justify-center shrink-0"
            style={{ color: BRAND.purps }}
          >
            <Landmark size={26} strokeWidth={1.7} />
          </span>
          <div>
            <div
              style={{
                fontSize: "clamp(13px, 1.6cqi, 17px)",
                fontWeight: 800,
                color: BRAND.slate900,
                lineHeight: 1.15,
              }}
            >
              {venue_label}
            </div>
            <div
              style={{
                fontSize: "clamp(10px, 1.1cqi, 12px)",
                color: BRAND.slate700,
                fontWeight: 600,
                lineHeight: 1.2,
              }}
            >
              {shared_caption}
            </div>
          </div>
        </div>

        {/* Lane comparison: Y-axis arrow + 4 lane boxes */}
        <div
          className="flex-1 grid items-end gap-3 min-h-0"
          style={{ gridTemplateColumns: "32px repeat(4, minmax(0, 1fr))" }}
        >
          {/* Y-axis arrow */}
          <div className="h-full flex flex-col items-center justify-center pb-12">
            <ArrowUp
              size={14}
              strokeWidth={2.2}
              color={BRAND.slate500}
            />
            <div
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                color: BRAND.slate700,
                fontSize: "clamp(9px, 1cqi, 11px)",
                fontWeight: 700,
                margin: "8px 0",
              }}
            >
              Longer wait
            </div>
            <ArrowDown
              size={14}
              strokeWidth={2.2}
              color={BRAND.slate500}
            />
          </div>

          {/* Lane boxes */}
          {lanes.map((lane, i) => {
            const tone = TONES[lane.tone];
            const heightPct = Math.min(100, (lane.dots / maxDots) * 100);
            const isHovered = hovered === i;
            const dotsPerRow = Math.min(5, Math.ceil(Math.sqrt(lane.dots * 0.75)));
            return (
              <div
                key={i}
                className="h-full flex flex-col items-center justify-end"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Top color bar */}
                <div
                  style={{
                    width: "clamp(60px, 8cqi, 100px)",
                    height: 4,
                    background: tone.bar,
                    borderRadius: 2,
                    marginBottom: 6,
                  }}
                />
                {/* Dot grid box */}
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: `${heightPct}%`, opacity: 1 }}
                  transition={{
                    duration: 0.8,
                    delay: 0.1 + i * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="relative flex items-center justify-center"
                  style={{
                    width: "clamp(60px, 8cqi, 100px)",
                    border: lane.dashed
                      ? `2px dashed ${tone.dot}`
                      : `2px solid ${tone.dot}`,
                    borderRadius: 10,
                    padding: 8,
                    minHeight: 36,
                    boxShadow: isHovered
                      ? `0 0 0 3px ${tone.pillBg}`
                      : "none",
                    transition: "box-shadow .15s ease",
                  }}
                >
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${dotsPerRow}, minmax(0, 1fr))`,
                      gap: "clamp(3px, 0.6cqi, 6px)",
                      placeItems: "center",
                    }}
                  >
                    {Array.from({ length: lane.dots }).map((_, di) => (
                      <motion.span
                        key={di}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          delay: 0.4 + i * 0.1 + di * 0.015,
                          duration: 0.2,
                        }}
                        style={{
                          width: "clamp(5px, 0.7cqi, 7px)",
                          height: "clamp(5px, 0.7cqi, 7px)",
                          borderRadius: "50%",
                          background: tone.dot,
                          display: "block",
                        }}
                      />
                    ))}
                  </div>
                </motion.div>

                {/* Lane name */}
                <div
                  style={{
                    marginTop: 12,
                    color: BRAND.slate900,
                    fontWeight: 800,
                    fontSize: "clamp(11px, 1.3cqi, 14px)",
                    textAlign: "center",
                  }}
                >
                  {lane.name}
                </div>

                {/* Wait pill */}
                <div
                  style={{
                    marginTop: 6,
                    background: tone.pillBg,
                    color: tone.pillFg,
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: "clamp(10px, 1.15cqi, 12px)",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  {lane.wait_label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ChartCard>
  );
}
