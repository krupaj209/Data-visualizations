import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { CalloutPill, Legend, LegendItem } from "@/components/charts/system";
import { type ReturnBufferRankSpec } from "@/lib/chart-spec";

interface Props {
  spec: ReturnBufferRankSpec;
  context?: string;
  compact?: boolean;
}

type Band = "danger" | "warn" | "safe";

function bandFor(buffer: number): Band {
  if (buffer < 30) return "danger";
  if (buffer <= 60) return "warn";
  return "safe";
}

const BAND_FILL: Record<Band, string> = {
  danger: BRAND.candy,
  warn: BRAND.hola,
  safe: BRAND.okayGreen,
};

const BAND_SOFT: Record<Band, string> = {
  danger: BRAND.candySoft,
  warn: BRAND.holaSoft,
  safe: BRAND.bgMint,
};

const BAND_LABEL: Record<Band, string> = {
  danger: "Tight",
  warn: "OK",
  safe: "Safe",
};

export function ReturnBufferRankChart({
  spec,
  context,
  compact = false,
}: Props) {
  const sorted = [...spec.options].sort(
    (a, b) => b.buffer_minutes - a.buffer_minutes,
  );
  const maxBuf = Math.max(...sorted.map((o) => o.buffer_minutes), 60);
  const scale = Math.max(maxBuf, 90);

  return (
    <ChartCard
      context={context ?? `Buffer vs ship departure ${spec.ship_departure_time}`}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {!compact && (
          <div className="flex items-center justify-between mb-3 gap-2">
            <div
              style={{
                fontSize: "clamp(11px, 1.25cqi, 13px)",
                color: BRAND.slate700,
                fontWeight: 700,
              }}
            >
              Minutes between return and ship departure
            </div>
            <CalloutPill bg={BRAND.candySoft} fg={BRAND.candy}>
              Sails {spec.ship_departure_time}
            </CalloutPill>
          </div>
        )}

        <div
          className="flex-1 flex flex-col min-h-0 justify-center"
          style={{ rowGap: compact ? 4 : 7 }}
        >
          {sorted.map((opt, i) => {
            const band = bandFor(opt.buffer_minutes);
            const widthPct = Math.max(
              (Math.max(opt.buffer_minutes, 0) / scale) * 100,
              2,
            );
            return (
              <div key={i} className="flex items-center" style={{ gap: 8 }}>
                <div
                  style={{
                    width: "38%",
                    minWidth: 0,
                    fontSize: compact
                      ? "clamp(10px, 1.1cqi, 12px)"
                      : "clamp(11px, 1.2cqi, 13px)",
                    color: BRAND.slate950,
                    fontWeight: 700,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={opt.name}
                >
                  {opt.name}
                </div>
                <div
                  className="relative flex-1"
                  style={{
                    height: compact ? 14 : 18,
                    background: BAND_SOFT[band],
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPct}%` }}
                    transition={{
                      duration: 0.7,
                      delay: 0.04 * i,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      background: BAND_FILL[band],
                      borderRadius: 6,
                    }}
                  />
                </div>
                <div
                  style={{
                    width: compact ? 56 : 74,
                    textAlign: "right",
                    fontSize: compact
                      ? "clamp(10px, 1.1cqi, 12px)"
                      : "clamp(11px, 1.25cqi, 13px)",
                    fontWeight: 800,
                    color: BAND_FILL[band],
                  }}
                >
                  {opt.buffer_minutes < 0
                    ? `${opt.buffer_minutes} min`
                    : `+${opt.buffer_minutes} min`}
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
              {(["safe", "warn", "danger"] as Band[]).map((b) => (
                <LegendItem
                  key={b}
                  color={BAND_FILL[b]}
                  label={`${BAND_LABEL[b]} ${b === "safe" ? ">60" : b === "warn" ? "30–60" : "<30"} min`}
                />
              ))}
            </Legend>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
