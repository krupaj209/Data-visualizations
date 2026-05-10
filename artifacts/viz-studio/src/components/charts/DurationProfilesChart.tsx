import { motion } from "framer-motion";
import { Sparkles, Timer } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { CHART_TYPE } from "@/lib/chart-system";
import { type DurationProfilesSpec } from "@/lib/chart-spec";

interface Props {
  spec: DurationProfilesSpec;
  context?: string;
  compact?: boolean;
}

const ICONS: Record<DurationProfilesSpec["profiles"][number]["icon"], string> = {
  stopwatch:
    "M12 14v-4M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z",
  head: "M12 6a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM6 20c0-3.3 2.7-6 6-6s6 2.7 6 6",
  column:
    "M6 4h12M6 20h12M8 4v16M16 4v16M5 4l-1 2h16l-1-2M5 20l-1-2h16l-1 2",
  lyre: "M8 4c-2 4-2 12 0 16M16 4c2 4 2 12 0 16M8 8h8M8 12h8M8 16h8",
  bust: "M12 6a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM7 20c0-3 2-6 5-6s5 3 5 6M5 20h14",
  bench: "M3 12h18M5 12v8M19 12v8M3 12l3-4h12l3 4",
};

function fmtRange(min: number, max: number) {
  if (min === max) return `${min} min`;
  if (max < 60) return `${min}–${max} min`;
  if (min < 60 && max >= 60) {
    if (max % 60 === 0) return `${min} min – ${max / 60} hr`;
    return `${min}–${max} min`;
  }
  return `${min}–${max} min`;
}

export function DurationProfilesChart({
  spec,
  context,
  compact = false,
}: Props) {
  const { headline, scale_min, profiles, tip } = spec;
  const maxScale = Math.max(...scale_min.map((s) => s.minutes), 1);
  const dense = profiles.length >= 4;

  return (
    <ChartCard
      context={context ?? "Time spent at the venue"}
      pill="Estimated"
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {!compact && (
          <div className="flex items-center gap-3" style={{ marginBottom: dense ? 10 : 14 }}>
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

        <div
          className="flex flex-col"
          style={{
            gap: "clamp(6px, 0.9cqi, 12px)",
            flex: 1,
            minHeight: 0,
            justifyContent: dense ? "space-between" : "center",
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
            return (
              <ProfileRow
                key={i}
                index={i}
                profile={p}
                fill={fill}
                labelColor={labelColor}
                widthPct={widthPct}
                isHi={isHi}
                dense={dense}
              />
            );
          })}
        </div>

        {!compact && (
          <div
            className="grid"
            style={{
              gridTemplateColumns: "40px minmax(118px, 150px) minmax(0, 1fr)",
              columnGap: 10,
              marginTop: dense ? 6 : 10,
              flexShrink: 0,
            }}
          >
            <div />
            <div />
            <div className="relative" style={{ height: 28 }}>
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
                        marginTop: 4,
                        color: CHART_TYPE.axisTick.color,
                        fontSize: CHART_TYPE.axisTick.fontSize,
                        fontWeight: CHART_TYPE.axisTick.fontWeight,
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

        {!compact && tip && (
          <div
            className="flex items-center gap-2"
            style={{ marginTop: dense ? 10 : 16, flexShrink: 0 }}
          >
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

function ProfileRow({
  index,
  profile,
  fill,
  labelColor,
  widthPct,
  isHi,
  dense,
}: {
  index: number;
  profile: DurationProfilesSpec["profiles"][number];
  fill: string;
  labelColor: string;
  widthPct: number;
  isHi: boolean;
  dense?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "40px minmax(118px, 150px) minmax(0, 1fr)",
        columnGap: 10,
        alignItems: "center",
        minHeight: dense ? 46 : 54,
      }}
    >
      <div className="flex items-center justify-center">
        <div
          className="flex items-center justify-center"
          style={{
            width: dense ? 32 : 36,
            height: dense ? 32 : 36,
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

      <div className="min-w-0">
        <div
          style={{
            color: isHi ? BRAND.purps : BRAND.slate900,
            fontWeight: 800,
            fontSize: "clamp(10px, 1.15cqi, 13px)",
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
              lineHeight: 1.15,
              marginTop: 2,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: dense ? 2 : 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {profile.note}
          </div>
        )}
      </div>

      <div
        className="relative"
        style={{ height: dense ? 32 : "clamp(30px, 3.4cqi, 40px)" }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={{
            duration: 0.9,
            delay: 0.15 + index * 0.08,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="h-full flex items-center justify-end"
          style={{
            background: fill,
            borderRadius: 8,
            paddingRight: 10,
            minWidth: 86,
          }}
        >
          <span
            style={{
              color: labelColor,
              fontWeight: 800,
              fontSize: "clamp(10px, 1.15cqi, 13px)",
              whiteSpace: "nowrap",
            }}
          >
            {fmtRange(profile.range_min, profile.range_max)}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
