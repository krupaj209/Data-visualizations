/**
 * QueueCompareCard — CE detail "comparison" variant for queue_compare.
 *
 * Tells a before/after story: red "Standard line" lane on the left, green
 * "Skip the line" lane on the right, with a purple math strip in between
 * that computes the time/ROI the visitor saves. Embeds keep the legacy
 * dot-grid via EntranceLanesChart — this card is only mounted when
 * ChartRenderer is called with variant="comparison".
 */
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import type { QueueCompareSpec, EntranceLanesSpec } from "@/lib/chart-spec";

import type { PresentationOverrides } from "@/lib/presentation";

interface Props {
  spec: QueueCompareSpec | EntranceLanesSpec;
  context?: string;
  compact?: boolean;
  presentation?: PresentationOverrides;
}

type LaneTone = "candy" | "purps" | "okay" | "slate";

const TONE_BG: Record<LaneTone, string> = {
  candy: BRAND.candySoft,
  okay: BRAND.bgMint,
  purps: BRAND.purpsSoft,
  slate: BRAND.slate100,
};

const TONE_FG: Record<LaneTone, string> = {
  candy: BRAND.candy,
  okay: "#0E8F4E",
  purps: BRAND.purps,
  slate: BRAND.slate700,
};

const TONE_RING: Record<LaneTone, string> = {
  candy: BRAND.candy,
  okay: BRAND.okayGreen,
  purps: BRAND.purps,
  slate: BRAND.slate300,
};

const TONE_LABEL: Record<LaneTone, string> = {
  candy: "Standard line",
  okay: "Skip the line",
  purps: "Premium / value",
  slate: "Conditional",
};

/** Parse the first integer (or numeric range midpoint) from a wait_label
 *  like "10–20 min", "Variable", "Priority — 5 min". Returns null when no
 *  numeric content is present so the math strip can fall back to a copy
 *  message instead of inventing a number. */
function parseMinutes(label: string | undefined): number | null {
  if (!label) return null;
  const nums = label.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  const parsed = nums.map((n) => parseInt(n, 10)).filter((n) => !isNaN(n));
  if (parsed.length === 0) return null;
  if (parsed.length === 1) return parsed[0];
  // Range: average the first two numbers (e.g. "10–20 min" → 15).
  return Math.round((parsed[0] + parsed[1]) / 2);
}

type Lane = (QueueCompareSpec | EntranceLanesSpec)["lanes"][number];

function pickLane(lanes: Lane[], tone: LaneTone): Lane | undefined {
  return lanes.find((l) => l.tone === tone);
}

export function QueueCompareCard({ spec, context, compact }: Props) {
  const lanes = spec.lanes;
  const standard = pickLane(lanes, "candy");
  const skip = pickLane(lanes, "okay");
  const standardMin = parseMinutes(standard?.wait_label);
  const skipMin = parseMinutes(skip?.wait_label);
  const showMath =
    !compact &&
    standard != null &&
    skip != null &&
    standardMin != null &&
    skipMin != null &&
    standardMin > skipMin;
  const saved = showMath ? standardMin! - skipMin! : null;

  return (
    <ChartCard context={context} compact={compact}>
      {!compact && (
        <div style={{ marginTop: 8, marginBottom: 10 }}>
          <div
            style={{
              fontSize: "clamp(13px, 1.5cqi, 16px)",
              fontWeight: 800,
              color: BRAND.slate900,
              lineHeight: 1.2,
            }}
          >
            {spec.venue_label}
          </div>
          <div
            style={{
              fontSize: "clamp(11px, 1.15cqi, 13px)",
              fontWeight: 600,
              color: BRAND.slate700,
              marginTop: 4,
            }}
          >
            {spec.shared_caption}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${lanes.length}, minmax(0, 1fr))`,
            gap: 12,
            flex: 1,
            minHeight: 0,
          }}
        >
          {lanes.map((lane) => {
            const tone = (lane.tone ?? "slate") as LaneTone;
            return (
              <div
                key={lane.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: 12,
                  borderRadius: 14,
                  background: TONE_BG[tone],
                  border: `2px ${lane.dashed ? "dashed" : "solid"} ${TONE_RING[tone]}`,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: TONE_FG[tone],
                  }}
                >
                  {TONE_LABEL[tone]}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: BRAND.slate900,
                    lineHeight: 1.2,
                  }}
                >
                  {lane.name}
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignSelf: "flex-start",
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: TONE_RING[tone],
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {lane.wait_label}
                </div>
                {!compact && lane.who && (
                  <div
                    style={{
                      fontSize: 11,
                      color: BRAND.slate700,
                      lineHeight: 1.4,
                    }}
                  >
                    {lane.who}
                  </div>
                )}
                {!compact && lane.how && (
                  <div
                    style={{
                      fontSize: 11,
                      color: BRAND.slate700,
                      lineHeight: 1.4,
                      marginTop: "auto",
                    }}
                  >
                    {lane.how}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!compact && !showMath && standard && skip && (
          <div
            role="note"
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              background: BRAND.purpsSoft,
              border: `1px solid ${BRAND.purps}40`,
              color: BRAND.purps,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginRight: 6,
              }}
            >
              Trade-off
            </span>
            <span style={{ color: BRAND.slate700, fontWeight: 600 }}>
              Skip-the-line trades a small ticket premium for a much shorter
              wait. Check the lane labels for the latest times.
            </span>
          </div>
        )}
        {showMath && (
          <div
            role="note"
            aria-label="Time saved by skipping the line"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 12,
              background: BRAND.purpsSoft,
              border: `1px solid ${BRAND.purps}40`,
              color: BRAND.purps,
              fontWeight: 700,
              fontSize: 12,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              You save
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "baseline",
                gap: 4,
                color: BRAND.purps,
              }}
            >
              <strong style={{ fontSize: 18, fontWeight: 800 }}>
                ~{saved} min
              </strong>
              <span style={{ color: BRAND.slate700, fontWeight: 600 }}>
                per visit
              </span>
            </span>
            <span
              aria-hidden
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: BRAND.slate700,
                fontWeight: 600,
              }}
            >
              <span style={{ color: BRAND.candy }}>
                {standardMin} min
              </span>
              <span>→</span>
              <span style={{ color: "#0E8F4E" }}>{skipMin} min</span>
            </span>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
