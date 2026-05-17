import { motion } from "framer-motion";
import {
  Bus,
  Car,
  Footprints,
  Ship,
  Sparkles,
  Train,
  TramFront,
  Truck,
} from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { ACCENT_FG, ACCENT_FILL, ACCENT_SOFT, BRAND } from "@/lib/brand";
import {
  type TransitMode,
  type TransitOptionsSpec,
} from "@/lib/chart-spec";

interface Props {
  spec: TransitOptionsSpec;
  context?: string;
  compact?: boolean;
}

const MODE_ICON: Record<TransitMode, typeof Bus> = {
  metro: Train,
  bus: Bus,
  tram: TramFront,
  train: Train,
  walk: Footprints,
  taxi: Car,
  car: Car,
  ferry: Ship,
  shuttle: Truck,
};

export function TransitOptionsChart({
  spec,
  context,
  compact = false,
}: Props) {
  const { options, origin_label, destination_label, callout } = spec;

  // Sort by minutes_min so the fastest sits at the top; compact mode keeps
  // only the top 3 ranked options to stay legible in tiny embeds.
  const ranked = [...options].sort((a, b) => a.minutes_min - b.minutes_min);
  const visible = compact ? ranked.slice(0, 3) : ranked;
  const maxMinutes = Math.max(...options.map((o) => o.minutes_max), 1);

  return (
    <ChartCard
      context={
        context ??
        (origin_label && destination_label
          ? `${origin_label} → ${destination_label}`
          : "How to get there")
      }
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className="flex-1 flex flex-col"
          style={{ gap: compact ? 6 : 8, justifyContent: "space-around" }}
        >
          {visible.map((o, i) => {
            const accent = o.accent ?? (o.recommended ? "candy" : "purps");
            const Icon = MODE_ICON[o.mode];
            const widthPct = Math.max(
              6,
              ((o.minutes_max - o.minutes_min + 1) / maxMinutes) * 100,
            );
            const startPct = (o.minutes_min / maxMinutes) * 100;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: 0.05 * i,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  background: o.recommended ? ACCENT_SOFT[accent] : "white",
                  border: o.recommended
                    ? `1.5px solid ${ACCENT_FILL[accent]}`
                    : `1px solid ${BRAND.slate100}`,
                  borderRadius: 12,
                  padding: compact ? "6px 8px" : "8px 10px",
                }}
              >
                <div
                  className="flex items-center"
                  style={{ gap: compact ? 6 : 8, marginBottom: 4 }}
                >
                  <span
                    className="flex items-center justify-center"
                    style={{
                      width: compact ? 22 : 28,
                      height: compact ? 22 : 28,
                      borderRadius: 999,
                      background: ACCENT_SOFT[accent],
                      color: ACCENT_FG[accent],
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={compact ? 12 : 14} strokeWidth={2.5} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      className="flex items-baseline"
                      style={{ gap: 6, flexWrap: "wrap" }}
                    >
                      <span
                        style={{
                          fontSize: compact
                            ? "clamp(11px, 1.2cqi, 13px)"
                            : "clamp(12px, 1.3cqi, 14px)",
                          fontWeight: 800,
                          color: BRAND.slate950,
                          lineHeight: 1.2,
                        }}
                      >
                        {o.label}
                      </span>
                      {o.recommended && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            color: ACCENT_FG[accent],
                          }}
                        >
                          Pick
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: compact
                        ? "clamp(11px, 1.2cqi, 13px)"
                        : "clamp(12px, 1.35cqi, 14px)",
                      fontWeight: 800,
                      color: ACCENT_FG[accent],
                      flexShrink: 0,
                    }}
                  >
                    {o.minutes_min === o.minutes_max
                      ? `${o.minutes_min}m`
                      : `${o.minutes_min}–${o.minutes_max}m`}
                  </span>
                </div>

                {/* Range bar — visualises minutes_min..minutes_max relative
                    to the slowest option. Always visible (it IS the chart). */}
                <div
                  style={{
                    height: compact ? 5 : 6,
                    background: BRAND.slate100,
                    borderRadius: 999,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${widthPct}%`,
                      marginLeft: `${startPct}%`,
                    }}
                    transition={{
                      duration: 0.55,
                      delay: 0.1 + i * 0.05,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{
                      height: "100%",
                      background: ACCENT_FILL[accent],
                      borderRadius: 999,
                    }}
                  />
                </div>

                {/* Cost/frequency/walk meta-row hidden in compact — these are
                    the secondary strips hosts duplicate in their own copy. */}
                {!compact && (
                  <div
                    className="flex items-center"
                    style={{
                      gap: 10,
                      marginTop: 5,
                      fontSize: "clamp(9px, 1cqi, 11px)",
                      fontWeight: 700,
                      color: BRAND.slate700,
                      flexWrap: "wrap",
                    }}
                  >
                    {o.cost_label && <span>{o.cost_label}</span>}
                    {o.frequency_label && <span>· {o.frequency_label}</span>}
                    {o.walk_min != null && (
                      <span>
                        · <Footprints size={9} style={{ display: "inline" }} />{" "}
                        {o.walk_min}m walk
                      </span>
                    )}
                    {o.note && (
                      <span style={{ color: BRAND.slate500, fontWeight: 600 }}>
                        · {o.note}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {!compact && callout && (
          <div
            className="flex items-start gap-2"
            style={{ marginTop: 10, flexShrink: 0 }}
          >
            <Sparkles
              size={14}
              strokeWidth={2.5}
              style={{ color: BRAND.candy, marginTop: 1, flexShrink: 0 }}
            />
            <span
              style={{
                color: BRAND.slate900,
                fontSize: "clamp(10px, 1.1cqi, 12px)",
                fontWeight: 600,
                lineHeight: 1.35,
              }}
            >
              {callout}
            </span>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
