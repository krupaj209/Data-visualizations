import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { CalloutPill, Legend, LegendItem } from "@/components/charts/system";
import { type OptimalDepartureSpec } from "@/lib/chart-spec";

interface Props {
  spec: OptimalDepartureSpec;
  context?: string;
  compact?: boolean;
}

const AXES = [
  { key: "light", label: "Light", color: BRAND.joyMustard },
  { key: "conditions", label: "Conditions", color: BRAND.purps },
  { key: "crowd", label: "Calm", color: BRAND.okayGreen },
] as const;

export function OptimalDepartureChart({
  spec,
  context,
  compact = false,
}: Props) {
  const slots = spec.slots;
  const recIdx = slots.findIndex((s) => s.id === spec.recommended_slot);
  const rec = recIdx >= 0 ? slots[recIdx] : null;

  return (
    <ChartCard
      context={context ?? "Departure slot scoring"}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {!compact && (
          <div className="flex items-center justify-between mb-2 gap-2">
            <div
              style={{
                fontSize: "clamp(11px, 1.25cqi, 13px)",
                color: BRAND.slate700,
                fontWeight: 700,
              }}
            >
              Light · conditions · low crowd, scored 0–100
            </div>
            {rec && (
              <CalloutPill bg={BRAND.purps} fg="white">
                Recommended · {rec.name}
              </CalloutPill>
            )}
          </div>
        )}

        <div
          className="flex-1 grid items-end min-h-0"
          style={{
            gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))`,
            columnGap: "clamp(6px, 1cqi, 14px)",
            paddingTop: compact ? 8 : 18,
          }}
        >
          {slots.map((slot, i) => {
            const isRec = slot.id === spec.recommended_slot;
            const values = {
              light: slot.light_quality,
              conditions: slot.conditions,
              crowd: 100 - slot.crowd_level,
            };
            return (
              <div
                key={slot.id}
                className="relative h-full flex flex-col items-center justify-end"
                style={{ rowGap: 4 }}
              >
                <div
                  className="flex items-end justify-center w-full"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    gap: compact ? 3 : 5,
                    padding: isRec
                      ? `0 ${compact ? 4 : 8}px`
                      : `0 ${compact ? 2 : 4}px`,
                    background: isRec ? BRAND.purpsSoft : "transparent",
                    borderRadius: 8,
                    paddingTop: 4,
                  }}
                >
                  {AXES.map((axis) => {
                    const val = values[axis.key];
                    return (
                      <div
                        key={axis.key}
                        className="relative flex-1 flex flex-col items-center justify-end h-full"
                      >
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${val}%` }}
                          transition={{
                            duration: 0.7,
                            delay: 0.06 * i + 0.04,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          style={{
                            width: "100%",
                            background: axis.color,
                            borderTopLeftRadius: 4,
                            borderTopRightRadius: 4,
                            minHeight: 2,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div
                  title={slot.name}
                  style={{
                    fontSize: compact
                      ? "clamp(10px, 1.1cqi, 12px)"
                      : "clamp(11px, 1.25cqi, 14px)",
                    fontWeight: 800,
                    color: isRec ? BRAND.purps : BRAND.slate950,
                    textAlign: "center",
                    marginTop: 2,
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {slot.name}
                </div>
              </div>
            );
          })}
        </div>

        {!compact && (
          <div
            className="mt-3"
            style={{
              borderTop: `1px solid ${BRAND.slate100}`,
              paddingTop: 8,
            }}
          >
            <Legend>
              {AXES.map((a) => (
                <LegendItem key={a.key} color={a.color} label={a.label} />
              ))}
            </Legend>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
