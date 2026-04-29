import { useMemo } from "react";
import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { type BookingWindowSpec } from "@/lib/chart-spec";

interface Props {
  spec: BookingWindowSpec;
  context?: string;
  compact?: boolean;
}

interface Bucket {
  label: string;
  share: number;
  inSweet: boolean;
}

const RANGES: { label: string; min: number; max: number }[] = [
  { label: "Same day", min: 0, max: 0 },
  { label: "1–3 days", min: 1, max: 3 },
  { label: "4–7 days", min: 4, max: 7 },
  { label: "1–2 weeks", min: 8, max: 14 },
  { label: "2–4 weeks", min: 15, max: 30 },
  { label: "1–2 months", min: 31, max: 60 },
  { label: "2+ months", min: 61, max: 9999 },
];

function bucketize(spec: BookingWindowSpec): Bucket[] {
  const sweetMin = spec.sweet_spot.days_before_min;
  const sweetMax = spec.sweet_spot.days_before_max;
  return RANGES.map((r) => {
    const inRange = spec.curve.filter(
      (p) => p.days_before >= r.min && p.days_before <= r.max,
    );
    const share = inRange.reduce((s, p) => s + p.share, 0);
    const overlapsSweet = !(r.max < sweetMin || r.min > sweetMax);
    return {
      label: r.label,
      share,
      inSweet: overlapsSweet,
    };
  });
}

export function BookingWindowChart({ spec, context, compact = false }: Props) {
  const buckets = useMemo(() => bucketize(spec), [spec]);
  const hasData = buckets.some((b) => b.share > 0);
  const maxShare = Math.max(...buckets.map((b) => b.share), 1);
  const sweetIdxs = buckets
    .map((b, i) => (b.inSweet && b.share > 0 ? i : -1))
    .filter((i) => i >= 0);
  const peakSweetIdx = sweetIdxs.length
    ? sweetIdxs.reduce(
        (best, i) => (buckets[i].share > buckets[best].share ? i : best),
        sweetIdxs[0],
      )
    : -1;

  return (
    <ChartCard context={context ?? "Booking lead time"} compact={compact}>
      <div className="flex-1 flex flex-col min-h-0">
        {!compact && (
          <div className="flex items-end justify-between mb-2 gap-2">
            <div
              style={{
                fontSize: "clamp(11px, 1.25cqi, 13px)",
                color: BRAND.slate700,
                fontWeight: 700,
              }}
            >
              % of bookings
            </div>
            <div
              style={{
                background: BRAND.purpsSoft,
                color: BRAND.purps,
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: "clamp(10px, 1.1cqi, 12px)",
                fontWeight: 800,
                border: `1px solid ${BRAND.purps}25`,
              }}
            >
              Sweet spot · {spec.sweet_spot.label}
            </div>
          </div>
        )}

        <div
          className="flex-1 grid items-end min-h-0"
          style={{
            gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))`,
            columnGap: "clamp(6px, 0.8cqi, 12px)",
            paddingTop: 22,
          }}
        >
          {buckets.map((b, i) => {
            const heightPct = hasData
              ? Math.max((b.share / maxShare) * 100, b.share > 0 ? 4 : 0)
              : 0;
            const isPeakSweet = i === peakSweetIdx;
            const fill = isPeakSweet
              ? BRAND.purps
              : b.inSweet
                ? BRAND.purpsSoft
                : "#F3F0FA";
            const labelColor = isPeakSweet ? "white" : BRAND.purps;
            return (
              <div
                key={i}
                className="relative h-full flex flex-col items-center justify-end"
              >
                {isPeakSweet && b.share > 0 && (
                  <div
                    className="absolute z-10 left-1/2 -translate-x-1/2 pointer-events-none"
                    style={{ bottom: `calc(${heightPct}% + 6px)` }}
                  >
                    <div
                      style={{
                        background: BRAND.purps,
                        color: "white",
                        padding: "3px 8px",
                        borderRadius: 999,
                        fontSize: "clamp(9px, 1cqi, 11px)",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Sweet spot
                    </div>
                  </div>
                )}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{
                    duration: 0.8,
                    delay: 0.05 + i * 0.04,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="relative w-full flex items-start justify-center"
                  style={{
                    background: fill,
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    borderBottomLeftRadius: 4,
                    borderBottomRightRadius: 4,
                    minHeight: b.share > 0 ? 4 : 0,
                  }}
                >
                  {b.share >= Math.max(maxShare * 0.18, 4) && (
                    <span
                      style={{
                        marginTop: 6,
                        color: labelColor,
                        fontWeight: 800,
                        fontSize: "clamp(10px, 1.2cqi, 13px)",
                      }}
                    >
                      {Math.round(b.share)}%
                    </span>
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>

        <div
          className="grid mt-2"
          style={{
            gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))`,
            columnGap: "clamp(6px, 0.8cqi, 12px)",
            borderTop: `1px solid ${BRAND.slate100}`,
            paddingTop: 8,
          }}
        >
          {buckets.map((b, i) => (
            <div
              key={i}
              className="text-center"
              style={{
                fontSize: "clamp(9px, 1cqi, 11px)",
                fontWeight: 700,
                color: b.inSweet ? BRAND.purps : BRAND.slate700,
                lineHeight: 1.15,
              }}
            >
              {b.label}
            </div>
          ))}
        </div>

        {!compact && spec.sold_out_risk && (
          <div className="mt-3 flex items-center gap-2">
            <span
              style={{
                background: BRAND.candySoft,
                color: BRAND.candy,
                padding: "3px 9px",
                borderRadius: 999,
                fontSize: "clamp(9px, 1cqi, 11px)",
                fontWeight: 800,
              }}
            >
              Sells out
            </span>
            <span
              style={{
                fontSize: "clamp(10px, 1.1cqi, 12px)",
                color: BRAND.slate700,
                fontWeight: 600,
              }}
            >
              {spec.sold_out_risk.message}
            </span>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
