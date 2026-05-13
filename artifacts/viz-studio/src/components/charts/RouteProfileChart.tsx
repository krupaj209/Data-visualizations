import type { ReactNode } from "react";
import { MapPin, Navigation, Timer } from "lucide-react";
import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { CHART_TYPE } from "@/lib/chart-system";
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
  const stopCount = stops.length;
  const dense = stopCount > 6;
  const veryDense = stopCount > 9;
  const hasTiming = stops.some((s) => s.duration_from_start_min !== undefined);
  const maxMin =
    spec.total_duration_min ??
    Math.max(...stops.map((s) => s.duration_from_start_min ?? 0), 1);

  const labelWidth = compact ? 56 : veryDense ? 64 : dense ? 78 : 96;

  return (
    <ChartCard context={context ?? spec.route_label} compact={compact}>
      <div className="flex-1 flex flex-col min-h-0">
        {!compact && (
          <div
            className="flex items-center gap-2 flex-wrap"
            style={{ marginBottom: 12 }}
          >
            {spec.headline_metric && (
              <MetricPill
                icon={<Navigation size={13} />}
                label={spec.headline_metric}
              />
            )}
            {formatDuration(spec.total_duration_min) && (
              <MetricPill
                icon={<Timer size={13} />}
                label={formatDuration(spec.total_duration_min)!}
              />
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
              padding: compact ? "10px 4px 14px" : "38px 8px 44px",
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
                ? ((stop.duration_from_start_min ??
                    (i / Math.max(stopCount - 1, 1)) * maxMin) /
                    Math.max(maxMin, 1)) *
                  92
                : (i / Math.max(stopCount - 1, 1)) * 92;
              const left = 4 + pct;
              const isEdge = i === 0 || i === stopCount - 1;
              const isHighlight = stop.highlight || isEdge;
              const above = i % 2 === 0;
              return (
                <div
                  key={`${stop.name}-${i}`}
                  className="absolute"
                  style={{
                    left: `${left}%`,
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    textAlign: "center",
                    width: labelWidth,
                  }}
                  title={stop.name}
                >
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      width: isHighlight ? 18 : 13,
                      height: isHighlight ? 18 : 13,
                      margin: "0 auto",
                      borderRadius: 999,
                      background: isHighlight ? BRAND.purps : "white",
                      border: `2.5px solid ${isHighlight ? BRAND.purps : BRAND.slate300}`,
                      boxShadow: "0 0 0 3px white",
                    }}
                  />
                  <div
                    style={{
                      position: compact ? "static" : "absolute",
                      left: compact ? undefined : "50%",
                      transform: compact ? undefined : "translateX(-50%)",
                      top: compact ? undefined : above ? 24 : -38,
                      width: compact ? undefined : labelWidth,
                      marginTop: compact ? 5 : 0,
                      fontSize: CHART_TYPE.axisTick.fontSize,
                      fontWeight: 800,
                      lineHeight: 1.15,
                      color: isHighlight ? BRAND.slate950 : BRAND.slate700,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: compact ? 1 : 2,
                      WebkitBoxOrient: "vertical",
                      textOverflow: "ellipsis",
                      wordBreak: "break-word",
                    }}
                  >
                    {stop.name}
                  </div>
                  {!compact && stop.duration_from_start_min !== undefined && (
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        transform: "translateX(-50%)",
                        top: above ? 56 : -16,
                        fontSize: 10,
                        fontWeight: 800,
                        color: BRAND.slate500,
                        whiteSpace: "nowrap",
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
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {stops
                .filter((s) => s.note || s.landmark_count !== undefined || s.highlight)
                .slice(0, 4)
                .map((s) => (
                  <div
                    key={s.name}
                    style={{
                      borderRadius: 10,
                      background: BRAND.slate50,
                      padding: "8px 9px",
                      minWidth: 0,
                    }}
                    title={s.name}
                  >
                    <div
                      style={{
                        fontSize: CHART_TYPE.axisTick.fontSize,
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
                        fontSize: CHART_TYPE.legend.fontSize,
                        fontWeight: 650,
                        color: BRAND.slate700,
                        lineHeight: 1.25,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        textOverflow: "ellipsis",
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
              fontSize: CHART_TYPE.legend.fontSize,
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
