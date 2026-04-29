import { Fragment, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { type EntranceLanesSpec } from "@/lib/chart-spec";

interface Props {
  spec: EntranceLanesSpec;
  context?: string;
  compact?: boolean;
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

function EntranceIllustration({ height = 44 }: { height?: number }) {
  const width = Math.round((height * 96) / 64);
  return (
    <svg
      viewBox="0 0 96 64"
      width={width}
      height={height}
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      {/* Floor line */}
      <line
        x1="2"
        y1="60"
        x2="94"
        y2="60"
        stroke={BRAND.slate300}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Four lanes converging into the doorway base */}
      <path
        d="M 6 60 L 40 34"
        stroke={BRAND.slate300}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />
      <path
        d="M 32 60 L 44 34"
        stroke={BRAND.slate300}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />
      <path
        d="M 64 60 L 52 34"
        stroke={BRAND.slate300}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />
      <path
        d="M 90 60 L 56 34"
        stroke={BRAND.slate300}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />
      {/* Arched doorway */}
      <path
        d="M 36 34 L 36 18 Q 36 6 48 6 Q 60 6 60 18 L 60 34 Z"
        fill={BRAND.purpsSoft}
        stroke={BRAND.purps}
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Door knob */}
      <circle cx="56" cy="22" r="1.5" fill={BRAND.purps} />
    </svg>
  );
}

export function EntranceLanesChart({
  spec,
  context,
  compact = false,
}: Props) {
  const { shared_caption, lanes } = spec;
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <ChartCard
      context={context ?? "Entrance lane comparison"}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Title strip — illustrated; hidden in compact (host supplies its own copy) */}
        {!compact && (
          <div
            className="flex items-center gap-3 px-4 py-3 mb-3"
            style={{
              background: BRAND.purpsSoft,
              borderRadius: 12,
            }}
          >
            <EntranceIllustration height={44} />
            <div
              style={{
                fontSize: "clamp(11px, 1.25cqi, 13px)",
                color: BRAND.slate700,
                fontWeight: 700,
                lineHeight: 1.3,
              }}
            >
              {shared_caption}
            </div>
          </div>
        )}

        {/* Lane comparison grid: axis column + 4 lane columns; rows = bar / box / name / pill */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: "32px repeat(4, minmax(0, 1fr))",
            gridTemplateRows: "auto auto auto auto",
            columnGap: "clamp(2px, 0.5cqi, 8px)",
            rowGap: 0,
          }}
        >
          {/* Y-axis rail (spans bar + box rows) — points downward */}
          <div
            style={{
              gridColumn: "1",
              gridRow: "1 / span 2",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              paddingTop: 8,
              gap: 6,
            }}
          >
            <div
              style={{
                writingMode: "vertical-rl",
                color: BRAND.slate700,
                fontSize: "clamp(9px, 1cqi, 11px)",
                fontWeight: 700,
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

          {/* Per-lane cells */}
          {lanes.map((lane, i) => {
            const tone = TONES[lane.tone];
            const isHovered = hovered === i;
            // Single-column queue so the visible block height literally tracks
            // the dot count — each dot is one notch in the line.
            const dotsPerRow = 1;
            const col = i + 2;
            const onEnter = () => setHovered(i);
            const onLeave = () => setHovered(null);
            return (
              <Fragment key={i}>
                {/* Row 1: shared top color bar — defines the common top edge */}
                <div
                  style={{
                    gridColumn: col,
                    gridRow: 1,
                    display: "flex",
                    justifyContent: "center",
                    paddingBottom: 6,
                  }}
                  onMouseEnter={onEnter}
                  onMouseLeave={onLeave}
                >
                  <div
                    style={{
                      width: "clamp(60px, 8cqi, 100px)",
                      height: 4,
                      background: tone.bar,
                      borderRadius: 2,
                    }}
                  />
                </div>

                {/* Row 2: dot box — top-anchored, grows downward */}
                <div
                  style={{
                    gridColumn: col,
                    gridRow: 2,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "flex-start",
                  }}
                  onMouseEnter={onEnter}
                  onMouseLeave={onLeave}
                >
                  <motion.div
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    transition={{
                      duration: 0.55,
                      delay: 0.05 + i * 0.06,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{
                      width: "clamp(60px, 8cqi, 100px)",
                      border: lane.dashed
                        ? `2px dashed ${tone.dot}`
                        : `2px solid ${tone.dot}`,
                      borderRadius: 10,
                      padding: "6px 8px",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "center",
                      boxShadow: isHovered
                        ? `0 0 0 3px ${tone.pillBg}`
                        : "none",
                      transition: "box-shadow .15s ease",
                      transformOrigin: "top center",
                    }}
                  >
                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: `repeat(${dotsPerRow}, minmax(0, 1fr))`,
                        gap: "clamp(1px, 0.2cqi, 3px)",
                        placeItems: "center",
                        alignContent: "start",
                        width: "100%",
                      }}
                    >
                      {Array.from({ length: lane.dots }).map((_, di) => (
                        <span
                          key={di}
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
                </div>

                {/* Row 3: lane name — shared baseline below all blocks */}
                <div
                  style={{
                    gridColumn: col,
                    gridRow: 3,
                    color: BRAND.slate900,
                    fontWeight: 800,
                    fontSize: "clamp(11px, 1.3cqi, 14px)",
                    textAlign: "center",
                    marginTop: 12,
                  }}
                >
                  {lane.name}
                </div>

                {/* Row 4: wait pill — shared baseline */}
                <div
                  style={{
                    gridColumn: col,
                    gridRow: 4,
                    display: "flex",
                    justifyContent: "center",
                    marginTop: 6,
                  }}
                >
                  <div
                    style={{
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
              </Fragment>
            );
          })}
        </div>
      </div>
    </ChartCard>
  );
}
