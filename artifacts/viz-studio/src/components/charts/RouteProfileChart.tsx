import type { ReactNode } from "react";
import { MapPin, Navigation, Timer } from "lucide-react";
import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import type { RouteProfileSpec } from "@/lib/chart-spec";

interface Props {
  spec: RouteProfileSpec;
  context?: string;
  compact?: boolean;
}

function formatDuration(min?: number): string | null {
  if (!min) return null;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function RouteProfileChart({ spec, context, compact = false }: Props) {
  const stops = spec.stops;
  const hasTiming = stops.some((s) => s.duration_from_start_min !== undefined);
  const maxMin =
    spec.total_duration_min ??
    Math.max(...stops.map((s) => s.duration_from_start_min ?? 0), 1);

  return (
    <ChartCard
      context={context ?? spec.route_label}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {!compact && (
          <div
            className="flex items-center gap-2 flex-wrap"
            style={{ marginBottom: 12 }}
          >
            {spec.headline_metric && (
              <MetricPill icon={<Navigation size={13} />} label={spec.headline_metric} />
            )}
            {formatDuration(spec.total_duration_min) && (
              <MetricPill icon={<Timer size={13} />} label={formatDuration(spec.total_duration_min)!} />
            )}
            {spec.distance_km !== undefined && (
              <MetricPill
                icon={<MapPin size={13} />}
                label={`${spec.distance_km} km`}
              />
            )}
          </div>
        )}

        <div
          className="flex-1 min-h-0"
          style={{
            display: "grid",
            gridTemplateRows: compact ? "1fr" : "1fr auto",
            gap: compact ? 4 : 10,
          }}
        >
          <div
            className="relative"
            style={{
              minHeight: 0,
              padding: compact ? "8px 4px 18px" : "14px 8px 30px",
            }}
          >
            <div
              className="absolute"
              style={{
                left: "4%",
                right: "4%",
                top: "50%",
                height: 5,
                borderRadius: 999,
                background: BRAND.slate100,
                transform: "translateY(-50%)",
              }}
            />
            <motion.div
              className="absolute"
              initial={{ width: 0 }}
              animate={{ width: "92%" }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              style={{
                left: "4%",
                top: "50%",
                height: 5,
                borderRadius: 999,
                background: BRAND.purps,
                transform: "translateY(-50%)",
              }}
            />

            {stops.map((stop, i) => {
              const pct = hasTiming
                ? ((stop.duration_from_start_min ?? (i / (stops.length - 1)) * maxMin) /
                    Math.max(maxMin, 1)) *
                  92
                : (i / Math.max(stops.length - 1, 1)) * 92;
              const left = 4 + pct;
              const isEdge = i === 0 || i === stops.length - 1;
              const isHighlight = stop.highlight || isEdge;
              return (
                <div
                  key={`${stop.name}-${i}`}
                  className="absolute"
                  style={{
                    left: `${left}%`,
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    textAlign: "center",
                    width: compact ? 54 : 82,
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      width: isHighlight ? 20 : 15,
                      height: isHighlight ? 20 : 15,
                      margin: "0 auto",
                      borderRadius: 999,
                      background: isHighlight ? BRAND.purps : "white",
                      border: `3px solid ${isHighlight ? BRAND.purps : BRAND.slate300}`,
                      boxShadow: "0 0 0 4px white",
                    }}
                  />
                  <div
                    style={{
                      marginTop: compact ? 5 : 7,
                      fontSize: compact
                        ? "clamp(8px, 1cqi, 10px)"
                        : "clamp(9px, 1.05cqi, 11px)",
                      fontWeight: 800,
                      lineHeight: 1.1,
                      color: isHighlight ? BRAND.slate950 : BRAND.slate700,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: compact ? 1 : 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {stop.name}
                  </div>
                  {!compact && stop.duration_from_start_min !== undefined && (
                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 10,
                        fontWeight: 800,
                        color: BRAND.slate500,
                      }}
                    >
                      {formatDuration(stop.duration_from_start_min)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!compact && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {stops
                .filter((s) => s.note || s.landmark_count !== undefined || s.highlight)
                .slice(0, 3)
                .map((s) => (
                  <div
                    key={s.name}
                    style={{
                      borderRadius: 10,
                      background: BRAND.slate50,
                      padding: "8px 9px",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 850,
                        color: BRAND.slate950,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {s.name}
                    </div>
                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 10,
                        fontWeight: 650,
                        color: BRAND.slate700,
                        lineHeight: 1.25,
                      }}
                    >
                      {s.landmark_count !== undefined
                        ? `${s.landmark_count} landmark${s.landmark_count === 1 ? "" : "s"}`
                        : s.note}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {!compact && (spec.callout || spec.best_for?.length) && (
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: BRAND.slate700,
              fontWeight: 700,
              lineHeight: 1.35,
            }}
          >
            {spec.callout ?? `Best for ${spec.best_for!.join(", ")}`}
          </div>
        )}
      </div>
    </ChartCard>
  );
}

function MetricPill({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        borderRadius: 999,
        background: BRAND.bgLilac,
        color: BRAND.purps,
        padding: "4px 8px",
        fontSize: 11,
        fontWeight: 850,
      }}
    >
      {icon}
      {label}
    </span>
  );
}
