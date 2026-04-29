import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Timer } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { type DurationProfilesSpec } from "@/lib/chart-spec";

interface Props {
  spec: DurationProfilesSpec;
  context?: string;
  compact?: boolean;
}

/** Lucide doesn't have all of these as semantic icons — use small inline SVGs. */
const ICONS: Record<DurationProfilesSpec["profiles"][number]["icon"], string> = {
  stopwatch:
    "M12 14v-4M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z",
  // simple head with crown — use head-style profile circle
  head: "M12 6a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM6 20c0-3.3 2.7-6 6-6s6 2.7 6 6",
  column:
    "M6 4h12M6 20h12M8 4v16M16 4v16M5 4l-1 2h16l-1-2M5 20l-1-2h16l-1 2",
  // lyre / harp
  lyre: "M8 4c-2 4-2 12 0 16M16 4c2 4 2 12 0 16M8 8h8M8 12h8M8 16h8",
  // bust statue
  bust: "M12 6a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM7 20c0-3 2-6 5-6s5 3 5 6M5 20h14",
  // bench
  bench: "M3 12h18M5 12v8M19 12v8M3 12l3-4h12l3 4",
};

function fmtMin(m: number) {
  if (m < 60) return `${m} min`;
  if (m === 60) return "1 hr";
  if (m % 60 === 0) return `${m / 60} hr`;
  return `${Math.round(m / 60)} hr`;
}

function fmtRange(min: number, max: number) {
  if (min === max) return `${min} min`;
  if (max < 60) return `${min}–${max} min`;
  if (min < 60 && max >= 60) {
    if (max % 60 === 0) return `${min} min – ${max / 60} hr`;
    return `${min}–${max} min`;
  }
  return `${min}–${max} min`;
}

/** Compact-mode short forms for scale tick labels: "30 min" → "30m", "1 hr" → "1h". */
function shortLabel(label: string): string {
  return label
    .replace(/(\d+)\s*min/g, "$1m")
    .replace(/(\d+)\s*hr/g, "$1h")
    .replace(/\s+/g, "");
}

export function DurationProfilesChart({
  spec,
  context,
  compact = false,
}: Props) {
  const { headline, scale_min, profiles, tip } = spec;
  const maxScale = Math.max(...scale_min.map((s) => s.minutes), 1);
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <ChartCard
      context={context ?? "Time spent at the venue"}
      pill="Estimated"
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Headline strip — hidden in compact (host supplies its own copy) */}
        {!compact && (
          <div className="flex items-center gap-3 mb-3">
            <span
              className="flex items-center justify-center shrink-0"
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: BRAND.purpsSoft,
                color: BRAND.purps,
              }}
            >
              <Timer size={18} strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <div
                style={{
                  fontSize: "clamp(14px, 1.7cqi, 19px)",
                  fontWeight: 800,
                  color: BRAND.slate900,
                  lineHeight: 1.15,
                }}
              >
                {headline}
              </div>
            </div>
          </div>
        )}

        {/* Profile rows + scale */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div
            className="grid items-center"
            style={{
              gridTemplateColumns: "44px minmax(0, 110px) 1fr",
              columnGap: 12,
              rowGap: "clamp(6px, 0.9cqi, 12px)",
              flex: 1,
              alignContent: "stretch",
            }}
          >
            {profiles.map((p, i) => {
              const isHi = !!p.highlight;
              const widthPct = Math.min(
                100,
                Math.max((p.range_max / maxScale) * 100, 6),
              );
              const fill = isHi ? BRAND.purps : BRAND.purpsSoft;
              const labelColor = isHi ? "white" : BRAND.purps;
              const isHovered = hovered === i;
              return (
                <RowFragment
                  key={i}
                  index={i}
                  profile={p}
                  fill={fill}
                  labelColor={labelColor}
                  widthPct={widthPct}
                  isHi={isHi}
                  isHovered={isHovered}
                  onEnter={() => setHovered(i)}
                  onLeave={() => setHovered(null)}
                />
              );
            })}
          </div>

          {/* Scale ticks — hidden in compact (each bar self-labels its value
              range, so a separate axis adds no info but crowds at narrow
              widths). */}
          {!compact && (
            <div
              className="grid mt-2"
              style={{
                gridTemplateColumns: "44px minmax(0, 110px) 1fr",
                columnGap: 12,
              }}
            >
              <div />
              <div />
              <div className="relative" style={{ height: 22 }}>
                <div
                  className="absolute inset-x-0"
                  style={{
                    top: 6,
                    height: 1,
                    background: BRAND.slate200,
                  }}
                />
                {scale_min.map((s, i) => {
                  const left = (s.minutes / maxScale) * 100;
                  return (
                    <div
                      key={i}
                      className="absolute"
                      style={{
                        left: `${left}%`,
                        top: 0,
                        transform: "translateX(-50%)",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          border: `1.5px solid ${BRAND.slate300}`,
                          background: "white",
                          margin: "0 auto",
                        }}
                      />
                      <div
                        style={{
                          marginTop: 3,
                          color: BRAND.slate700,
                          fontSize: "clamp(8px, 0.9cqi, 10px)",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Tip footer — hidden in compact (host supplies its own copy) */}
        {!compact && tip && (
          <div className="flex items-center gap-2 mt-3">
            <span
              className="flex items-center justify-center shrink-0"
              style={{ color: BRAND.candy }}
            >
              <Sparkles size={14} strokeWidth={2.5} />
            </span>
            <span
              style={{
                color: BRAND.slate900,
                fontSize: "clamp(10px, 1.15cqi, 13px)",
                fontWeight: 600,
              }}
            >
              <strong style={{ color: BRAND.candy, fontWeight: 800 }}>
                Tip:
              </strong>{" "}
              {tip}
            </span>
          </div>
        )}
      </div>
    </ChartCard>
  );
}

function RowFragment({
  index,
  profile,
  fill,
  labelColor,
  widthPct,
  isHi,
  isHovered,
  onEnter,
  onLeave,
}: {
  index: number;
  profile: DurationProfilesSpec["profiles"][number];
  fill: string;
  labelColor: string;
  widthPct: number;
  isHi: boolean;
  isHovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <>
      {/* Icon */}
      <div className="flex items-center justify-center">
        <div
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: isHi ? BRAND.purps : BRAND.purpsSoft,
            color: isHi ? "white" : BRAND.purps,
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <path
              d={ICONS[profile.icon]}
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Label */}
      <div className="min-w-0">
        <div
          style={{
            color: isHi ? BRAND.purps : BRAND.slate900,
            fontWeight: 800,
            fontSize: "clamp(11px, 1.3cqi, 14px)",
            lineHeight: 1.15,
          }}
        >
          {profile.name}
        </div>
        {profile.note && (
          <div
            style={{
              color: BRAND.slate700,
              fontSize: "clamp(9px, 1cqi, 11px)",
              fontWeight: 600,
              lineHeight: 1.2,
              marginTop: 2,
            }}
          >
            {profile.note}
          </div>
        )}
      </div>

      {/* Bar */}
      <div
        className="relative"
        style={{ height: "clamp(28px, 3.4cqi, 40px)" }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={{
            duration: 0.9,
            delay: 0.15 + index * 0.08,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="h-full flex items-center justify-end pr-3 cursor-default"
          style={{
            background: fill,
            borderRadius: 8,
            boxShadow: isHovered ? `0 0 0 2px ${BRAND.purps}40` : "none",
            transition: "box-shadow .15s ease",
          }}
        >
          <span
            style={{
              color: labelColor,
              fontWeight: 800,
              fontSize: "clamp(11px, 1.3cqi, 14px)",
              whiteSpace: "nowrap",
            }}
          >
            {fmtRange(profile.range_min, profile.range_max)}
          </span>
        </motion.div>
        {isHovered && (
          <div
            className="absolute z-30 pointer-events-none"
            style={{
              top: -28,
              left: `${widthPct / 2}%`,
              transform: "translateX(-50%)",
              background: BRAND.slate900,
              color: "white",
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {profile.name} · {fmtMin(profile.range_max)}
          </div>
        )}
      </div>
    </>
  );
}
