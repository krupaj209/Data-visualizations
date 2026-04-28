import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/ChartCard";
import { BRAND, SEASON_DOT, SEASON_FILL, SEASON_LABEL, type SeasonKey } from "@/lib/brand";
import {
  MONTH_LABELS,
  MONTH_ORDER,
  type ChartHeader,
  type SeasonalCurveSpec,
} from "@/lib/chart-spec";

interface Props {
  spec: SeasonalCurveSpec;
  header: ChartHeader;
}

export function SeasonalCurveChart({ spec, header }: Props) {
  const byMonth = new Map(spec.months.map((m) => [m.month, m]));
  const data = MONTH_ORDER.map((m) => {
    const row = byMonth.get(m);
    return {
      month: MONTH_LABELS[m],
      score: row?.score ?? 0,
      status: row?.status ?? ("moderate" as SeasonKey),
    };
  });

  return (
    <ChartCard
      title={header.title}
      subtitle={header.subtitle}
      insight={header.insight}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex flex-wrap gap-2 mb-2">
          {spec.best_months.length > 0 && (
            <div
              style={{
                background: BRAND.bgMint,
                color: "#0E8F4E",
                padding: "5px 10px",
                borderRadius: 999,
                fontSize: "clamp(9px, 1.05cqi, 12px)",
                fontWeight: 800,
              }}
            >
              ⭐ Best: {spec.best_months.join(", ")}
            </div>
          )}
          {spec.worst_months.length > 0 && (
            <div
              style={{
                background: BRAND.candySoft,
                color: BRAND.candy,
                padding: "5px 10px",
                borderRadius: 999,
                fontSize: "clamp(9px, 1.05cqi, 12px)",
                fontWeight: 800,
              }}
            >
              ⚠ Avoid: {spec.worst_months.join(", ")}
            </div>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, left: -16, right: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="seasonal-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND.candy} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={BRAND.candy} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={BRAND.slate100} vertical={false} />
              <XAxis
                dataKey="month"
                stroke={BRAND.slate500}
                tick={{ fontSize: 11, fontWeight: 700, fill: BRAND.slate700 }}
                axisLine={{ stroke: BRAND.slate200 }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                stroke={BRAND.slate500}
                tick={{ fontSize: 11, fontWeight: 700, fill: BRAND.slate700 }}
                tickFormatter={(v) => `${v}`}
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
                formatter={(v: number) => [`${v.toFixed(0)} crowd score`, ""]}
                labelStyle={{ color: BRAND.slate500, fontSize: 11 }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke={BRAND.candy}
                strokeWidth={3}
                fill="url(#seasonal-fill)"
                dot={{ r: 4, fill: BRAND.candy, stroke: "white", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: BRAND.candy, stroke: "white", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div
          className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5"
          style={{ borderTop: `1px solid ${BRAND.slate100}`, paddingTop: 8 }}
        >
          {(["very_quiet", "quiet", "moderate", "busy", "peak"] as SeasonKey[]).map(
            (s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: SEASON_DOT[s],
                    border: `1px solid ${SEASON_FILL[s]}`,
                  }}
                />
                <span
                  style={{
                    fontSize: "clamp(9px, 1cqi, 11px)",
                    color: BRAND.slate700,
                    fontWeight: 600,
                  }}
                >
                  {SEASON_LABEL[s]}
                </span>
              </div>
            ),
          )}
        </div>
      </div>
    </ChartCard>
  );
}
