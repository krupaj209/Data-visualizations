import { ChartCard } from "@/components/ChartCard";
import { ACCENT_FILL, ACCENT_SOFT, BRAND, type AccentKey } from "@/lib/brand";
import { type StatGridSpec } from "@/lib/chart-spec";

interface Props {
  spec: StatGridSpec;
  context?: string;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const w = 100;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const path = values
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      <path d={path} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatGridChart({ spec, context }: Props) {
  const stats = spec.stats.slice(0, 6);
  const cols = stats.length <= 2 ? 2 : stats.length <= 4 ? 2 : 3;
  return (
    <ChartCard context={context ?? "Key numbers"}>
      <div
        className="flex-1 grid gap-3 min-h-0"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridAutoRows: "1fr",
        }}
      >
        {stats.map((s, i) => {
          const accent: AccentKey = s.accent ?? (["purps", "candy", "hola", "okay"] as AccentKey[])[i % 4];
          const fill = ACCENT_FILL[accent];
          return (
            <div
              key={i}
              className="flex flex-col justify-between"
              style={{
                background: ACCENT_SOFT[accent],
                borderRadius: 18,
                padding: "clamp(12px, 1.6cqi, 22px)",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "clamp(9px, 1cqi, 11px)",
                    color: fill,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    color: BRAND.slate950,
                    fontWeight: 800,
                    fontSize: "clamp(22px, 4.2cqi, 56px)",
                    lineHeight: 1,
                    letterSpacing: "-0.025em",
                    marginTop: 6,
                  }}
                >
                  {s.value}
                  {s.unit && (
                    <span
                      style={{
                        fontSize: "0.45em",
                        fontWeight: 700,
                        color: BRAND.slate700,
                        marginLeft: 6,
                      }}
                    >
                      {s.unit}
                    </span>
                  )}
                </div>
                {s.delta && (
                  <div
                    style={{
                      color: fill,
                      fontWeight: 700,
                      fontSize: "clamp(10px, 1.1cqi, 12px)",
                      marginTop: 6,
                    }}
                  >
                    {s.delta}
                  </div>
                )}
              </div>
              <div className="flex items-end justify-between gap-2 mt-2">
                {s.sparkline && s.sparkline.length > 1 ? (
                  <div style={{ flex: 1, height: 28 }}>
                    <Sparkline values={s.sparkline} color={fill} />
                  </div>
                ) : (
                  <div />
                )}
                {s.footnote && (
                  <span
                    style={{
                      fontSize: "clamp(9px, 0.95cqi, 11px)",
                      color: BRAND.slate700,
                      fontWeight: 600,
                      textAlign: "right",
                    }}
                  >
                    {s.footnote}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
