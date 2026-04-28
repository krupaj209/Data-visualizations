import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { type ChartHeader, type BookingWindowSpec } from "@/lib/chart-spec";

interface Props {
  spec: BookingWindowSpec;
  header: ChartHeader;
}

export function BookingWindowChart({ spec, header }: Props) {
  const data = [...spec.curve].sort((a, b) => b.days_before - a.days_before);
  const sweetMin = spec.sweet_spot.days_before_min;
  const sweetMax = spec.sweet_spot.days_before_max;

  return (
    <ChartCard
      title={header.title}
      subtitle={header.subtitle}
      insight={header.insight}
    >
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex flex-wrap gap-3 mb-3">
          <div
            style={{
              background: BRAND.bgMint,
              color: "#0E8F4E",
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: "clamp(10px, 1.1cqi, 12px)",
              fontWeight: 800,
            }}
          >
            ⭐ Sweet spot · {sweetMax}–{sweetMin} days before · {spec.sweet_spot.label}
          </div>
          {spec.sold_out_risk && (
            <div
              style={{
                background: BRAND.candySoft,
                color: BRAND.candy,
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: "clamp(10px, 1.1cqi, 12px)",
                fontWeight: 800,
              }}
            >
              ⚠ {spec.sold_out_risk.message}
            </div>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, left: -16, right: 12, bottom: 4 }}>
              <defs>
                <linearGradient id="bw-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND.purps} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={BRAND.purps} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={BRAND.slate100} vertical={false} />
              <ReferenceArea
                x1={sweetMax}
                x2={sweetMin}
                fill={BRAND.bgMint}
                fillOpacity={0.6}
              />
              <XAxis
                dataKey="days_before"
                reversed
                stroke={BRAND.slate500}
                tick={{ fontSize: 11, fontWeight: 700, fill: BRAND.slate700 }}
                tickFormatter={(v) => (v === 0 ? "Today" : `${v}d`)}
                axisLine={{ stroke: BRAND.slate200 }}
                tickLine={false}
              />
              <YAxis
                stroke={BRAND.slate500}
                tick={{ fontSize: 11, fontWeight: 700, fill: BRAND.slate700 }}
                tickFormatter={(v) => `${v}%`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: BRAND.slate950,
                  border: "none",
                  borderRadius: 12,
                  color: "white",
                  fontWeight: 700,
                  fontSize: 12,
                }}
                labelStyle={{ color: BRAND.slate500, fontSize: 11 }}
                labelFormatter={(v) => `${v} days before`}
                formatter={(v: number) => [`${v.toFixed(0)}% of bookings`, ""]}
              />
              <Area
                type="monotone"
                dataKey="share"
                stroke={BRAND.purps}
                strokeWidth={3}
                fill="url(#bw-fill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartCard>
  );
}
