import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import { BRAND, ZONE_FILL, ZONE_LABEL, ZONE_SOFT } from "@/lib/brand";
import { type ChartHeader, type CompareZonesSpec } from "@/lib/chart-spec";

interface Props {
  spec: CompareZonesSpec;
  header: ChartHeader;
}

export function CompareZonesChart({ spec, header }: Props) {
  const zones = spec.zones.slice(0, 5);
  const maxWait = Math.max(...zones.map((z) => z.wait_max), 30);

  return (
    <ChartCard
      title={header.title}
      subtitle={header.subtitle}
      insight={header.insight}
    >
      <div className="flex-1 flex flex-col min-h-0 gap-2">
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: 4 }}
        >
          <span
            style={{
              fontSize: "clamp(9px, 1cqi, 11px)",
              color: BRAND.slate700,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {spec.metric_label}
          </span>
        </div>
        <div className="flex-1 flex flex-col gap-2 min-h-0 justify-center">
          {zones.map((z, i) => {
            const widthPct = Math.min(100, ((z.wait_max + 5) / (maxWait + 5)) * 100);
            const minPct = ((z.wait_min) / (maxWait + 5)) * 100;
            return (
              <div
                key={i}
                className="flex items-center gap-3"
                style={{
                  background: ZONE_SOFT[z.status],
                  borderRadius: 16,
                  padding: "clamp(10px, 1.4cqi, 16px) clamp(12px, 1.6cqi, 18px)",
                }}
              >
                <div
                  className="flex items-center gap-2"
                  style={{ minWidth: "30%", maxWidth: "32%" }}
                >
                  {z.emoji && (
                    <span
                      style={{
                        fontSize: "clamp(18px, 2.4cqi, 30px)",
                        lineHeight: 1,
                      }}
                    >
                      {z.emoji}
                    </span>
                  )}
                  <div className="flex flex-col" style={{ minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: "clamp(12px, 1.4cqi, 16px)",
                        fontWeight: 800,
                        color: BRAND.slate950,
                        lineHeight: 1.2,
                      }}
                    >
                      {z.name}
                    </span>
                    {z.share_of_visitors !== undefined && (
                      <span
                        style={{
                          fontSize: "clamp(9px, 1cqi, 11px)",
                          color: BRAND.slate700,
                          fontWeight: 600,
                        }}
                      >
                        {z.share_of_visitors}% of visitors
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1 relative flex items-center" style={{ minWidth: 0 }}>
                  <div
                    style={{
                      width: "100%",
                      height: 12,
                      background: "rgba(255,255,255,0.6)",
                      borderRadius: 999,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPct}%` }}
                      transition={{
                        duration: 0.8,
                        delay: 0.05 + i * 0.06,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        background: ZONE_FILL[z.status],
                        borderRadius: 999,
                      }}
                    />
                    {minPct > 2 && (
                      <div
                        style={{
                          position: "absolute",
                          left: `${minPct}%`,
                          top: -4,
                          bottom: -4,
                          width: 2,
                          background: "white",
                          opacity: 0.7,
                        }}
                      />
                    )}
                  </div>
                </div>
                <div
                  style={{
                    minWidth: "16%",
                    textAlign: "right",
                  }}
                >
                  <div
                    style={{
                      fontSize: "clamp(13px, 1.6cqi, 18px)",
                      fontWeight: 800,
                      color: BRAND.slate950,
                      lineHeight: 1,
                    }}
                  >
                    {z.wait_min}–{z.wait_max} min
                  </div>
                  <div
                    style={{
                      fontSize: "clamp(9px, 1cqi, 11px)",
                      color: ZONE_FILL[z.status],
                      fontWeight: 800,
                      marginTop: 2,
                    }}
                  >
                    {ZONE_LABEL[z.status]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {zones.some((z) => z.tip) && (
          <div
            className="mt-1 flex flex-col gap-1"
            style={{ borderTop: `1px solid ${BRAND.slate100}`, paddingTop: 8 }}
          >
            {zones
              .filter((z) => z.tip)
              .slice(0, 2)
              .map((z, i) => (
                <div
                  key={i}
                  className="flex items-start gap-1.5"
                  style={{
                    fontSize: "clamp(10px, 1.05cqi, 12px)",
                    color: BRAND.slate700,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: BRAND.purps, fontWeight: 800 }}>•</span>
                  <span>
                    <span style={{ color: BRAND.slate950, fontWeight: 800 }}>
                      {z.name}:
                    </span>{" "}
                    {z.tip}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </ChartCard>
  );
}
