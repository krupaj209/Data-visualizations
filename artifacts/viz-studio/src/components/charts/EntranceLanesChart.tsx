import { Fragment, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { formatClockRangesInText } from "@/lib/time";
import { BRAND } from "@/lib/brand";
import { CHART_TYPE } from "@/lib/chart-system";
import { CalloutPill } from "@/components/charts/system";
import { type EntranceLanesSpec } from "@/lib/chart-spec";

interface Props {
  spec: EntranceLanesSpec;
  context?: string;
  compact?: boolean;
}

// Soft default, vivid only on the highlighted lane — same rhythm as the
// Weekly pattern + Seasonal curve charts. The two "loud" tones (candy /
// purps) signal the highlighted "Reserved" / "Walk-up" lanes and keep
// their saturated brand color; "okay" / "slate" are supporting lanes and
// drop to a calmer companion tint. The pill foreground (`pillFg`) stays
// readable enough to anchor the locked-state ring on every lane.
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
    dot: BRAND.subtleGreen,
    pillBg: BRAND.bgMint,
    pillFg: "#0E8F4E",
    bar: BRAND.subtleGreen,
  },
  slate: {
    dot: BRAND.slate300,
    pillBg: BRAND.slate100,
    pillFg: BRAND.slate700,
    bar: BRAND.slate300,
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
      <line
        x1="2"
        y1="60"
        x2="94"
        y2="60"
        stroke={BRAND.slate300}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M 6 60 L 40 34" stroke={BRAND.slate300} strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 3" />
      <path d="M 32 60 L 44 34" stroke={BRAND.slate300} strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 3" />
      <path d="M 64 60 L 52 34" stroke={BRAND.slate300} strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 3" />
      <path d="M 90 60 L 56 34" stroke={BRAND.slate300} strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 3" />
      <path
        d="M 36 34 L 36 18 Q 36 6 48 6 Q 60 6 60 18 L 60 34 Z"
        fill={BRAND.purpsSoft}
        stroke={BRAND.purps}
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
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
  const [lockedIdx, setLockedIdx] = useState<number | null>(null);
  void context;

  useEffect(() => {
    if (lockedIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLockedIdx(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lockedIdx]);

  const locked = lockedIdx !== null ? lanes[lockedIdx] : null;
  const lockedTone = locked ? TONES[locked.tone] : null;

  return (
    <ChartCard compact={compact}>
      <div className="flex-1 flex flex-col min-h-0">
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
              {formatClockRangesInText(shared_caption)}
            </div>
          </div>
        )}

        <div
          className="grid"
          style={{
            gridTemplateColumns: "32px repeat(4, minmax(0, 1fr))",
            gridTemplateRows: "auto auto auto auto",
            columnGap: "clamp(2px, 0.5cqi, 8px)",
            rowGap: 0,
          }}
        >
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
                color: CHART_TYPE.axisTick.color,
                fontSize: CHART_TYPE.axisTick.fontSize,
                fontWeight: CHART_TYPE.axisTick.fontWeight,
              }}
            >
              Longer wait
            </div>
            <ArrowDown size={18} strokeWidth={2.6} color={BRAND.slate900} />
          </div>

          {lanes.map((lane, i) => {
            const tone = TONES[lane.tone];
            const isHovered = hovered === i;
            const isLocked = lockedIdx === i;
            const dim = lockedIdx !== null && !isLocked;
            const dotsPerRow = 1;
            const col = i + 2;
            const onEnter = () => setHovered(i);
            const onLeave = () => setHovered(null);
            const toggle = () =>
              setLockedIdx((p) => (p === i ? null : i));
            const onKeyDown = (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle();
              }
            };
            return (
              <Fragment key={i}>
                {/* Row 1: shared top color bar (also clickable) */}
                <div
                  style={{
                    gridColumn: col,
                    gridRow: 1,
                    display: "flex",
                    justifyContent: "center",
                    paddingBottom: 6,
                    opacity: dim ? 0.4 : 1,
                    transition: "opacity .2s ease",
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

                {/* Row 2: dot box — wrapped as a button so the lane is fully
                    keyboard-activatable. */}
                <div
                  style={{
                    gridColumn: col,
                    gridRow: 2,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    opacity: dim ? 0.4 : 1,
                    transition: "opacity .2s ease",
                  }}
                >
                  <button
                    type="button"
                    onClick={toggle}
                    onMouseEnter={onEnter}
                    onMouseLeave={onLeave}
                    onFocus={onEnter}
                    onBlur={onLeave}
                    onKeyDown={onKeyDown}
                    aria-label={`Toggle ${lane.name} lane detail`}
                    aria-pressed={isLocked}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      outline: "none",
                    }}
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
                        boxShadow: isLocked
                          ? `0 0 0 3px ${tone.pillFg}`
                          : isHovered
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
                  </button>
                </div>

                <div
                  style={{
                    gridColumn: col,
                    gridRow: 3,
                    color: isLocked ? tone.pillFg : BRAND.slate900,
                    fontWeight: 800,
                    fontSize: "clamp(11px, 1.3cqi, 14px)",
                    textAlign: "center",
                    marginTop: 12,
                    opacity: dim ? 0.4 : 1,
                    transition: "opacity .2s ease, color .15s ease",
                  }}
                >
                  {lane.name}
                </div>

                <div
                  style={{
                    gridColumn: col,
                    gridRow: 4,
                    display: "flex",
                    justifyContent: "center",
                    marginTop: 6,
                    opacity: dim ? 0.4 : 1,
                    transition: "opacity .2s ease",
                  }}
                >
                  <CalloutPill bg={tone.pillBg} fg={tone.pillFg}>
                    {formatClockRangesInText(lane.wait_label)}
                  </CalloutPill>
                </div>
              </Fragment>
            );
          })}
        </div>

        {/* Locked-lane detail panel: who uses it, peak vs off-peak waits, how
            to access it. */}
        {locked && lockedTone && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden", marginTop: 12 }}
            role="region"
            aria-label={`${locked.name} lane detail`}
          >
            <div
              style={{
                padding: "10px 12px",
                background: lockedTone.pillBg,
                borderRadius: 10,
                border: `1px solid ${lockedTone.pillFg}30`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    color: lockedTone.pillFg,
                    fontWeight: 800,
                    fontSize: "clamp(12px, 1.35cqi, 14px)",
                  }}
                >
                  {locked.name} lane
                </div>
                <button
                  type="button"
                  onClick={() => setLockedIdx(null)}
                  aria-label="Close lane detail"
                  style={{
                    background: "white",
                    color: lockedTone.pillFg,
                    border: `1px solid ${lockedTone.pillFg}30`,
                    padding: "2px 9px",
                    borderRadius: 999,
                    fontSize: "clamp(9px, 1cqi, 11px)",
                    fontWeight: 800,
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  Close
                </button>
              </div>
              {locked.who && (
                <div
                  style={{
                    color: BRAND.slate900,
                    fontSize: "clamp(10px, 1.1cqi, 12px)",
                    fontWeight: 600,
                    lineHeight: 1.4,
                    marginBottom: 6,
                  }}
                >
                  <strong style={{ fontWeight: 800 }}>Who:</strong>{" "}
                  {locked.who}
                </div>
              )}
              {(locked.wait_peak || locked.wait_off_peak) && (
                <div
                  className="flex flex-wrap gap-1.5"
                  style={{ marginBottom: 6 }}
                >
                  {locked.wait_peak && (
                    <CalloutPill bg="white" fg={lockedTone.pillFg}>
                      Peak: {formatClockRangesInText(locked.wait_peak)}
                    </CalloutPill>
                  )}
                  {locked.wait_off_peak && (
                    <CalloutPill bg="white" fg={BRAND.slate700}>
                      Off-peak: {formatClockRangesInText(locked.wait_off_peak)}
                    </CalloutPill>
                  )}
                </div>
              )}
              {locked.how && (
                <div
                  style={{
                    color: BRAND.slate900,
                    fontSize: "clamp(10px, 1.1cqi, 12px)",
                    fontWeight: 600,
                    lineHeight: 1.4,
                  }}
                >
                  <strong style={{ fontWeight: 800 }}>How:</strong>{" "}
                  {locked.how}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </ChartCard>
  );
}
