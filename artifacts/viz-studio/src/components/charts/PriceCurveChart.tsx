import { useMemo, useState } from "react";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { CHART_TYPE } from "@/lib/chart-system";
import {
  CalloutPill,
  ChartTooltip,
  SourcesFooter,
} from "@/components/charts/system";
import {
  MONTH_LABELS,
  MONTH_ORDER,
  type ChartProvenanceLite,
  type PriceCurveSpec,
} from "@/lib/chart-spec";

interface Props {
  spec: PriceCurveSpec;
  context?: string;
  compact?: boolean;
  provenance?: ChartProvenanceLite | null;
}

const CURRENCY_GLYPH: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
  INR: "₹",
};

function priceFor(base: number, index: number): number {
  return Math.round((base * index) / 100);
}

function fmt(currency: string, value: number): string {
  const glyph = CURRENCY_GLYPH[currency.toUpperCase()] ?? `${currency} `;
  return `${glyph}${value.toLocaleString()}`;
}

export function PriceCurveChart({
  spec,
  context,
  compact,
  provenance,
}: Props) {
  const data = useMemo(() => {
    const byMonth = new Map(spec.points.map((p) => [p.month, p]));
    return MONTH_ORDER.map((m) => {
      const row = byMonth.get(m);
      return {
        month: m,
        label: MONTH_LABELS[m],
        index: row?.index ?? 100,
        note: row?.note ?? null,
      };
    });
  }, [spec.points]);

  const cheapestIdx = data.reduce(
    (best, d, i) => (d.index < data[best].index ? i : best),
    0,
  );
  const priciestIdx = data.reduce(
    (best, d, i) => (d.index > data[best].index ? i : best),
    0,
  );

  const indices = data.map((d) => d.index);
  const yMax = Math.max(...indices, 100) * 1.1;
  const yMin = Math.min(...indices, 100) * 0.92;
  const yRange = Math.max(yMax - yMin, 1);

  const points = data.map((d, i) => ({
    x: (i / 11) * 100,
    y: 100 - ((d.index - yMin) / yRange) * 100,
    d,
  }));

  // Smooth-ish line via cubic bezier midpoint smoothing.
  const linePath = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cx = (prev.x + p.x) / 2;
      return `C ${cx} ${prev.y} ${cx} ${p.y} ${p.x} ${p.y}`;
    })
    .join(" ");

  const baseY = 100 - ((100 - yMin) / yRange) * 100;

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const hover = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <ChartCard
      context={
        context ??
        (spec.base_label
          ? `Price index · base ${spec.base_label}`
          : `Price index · base ${fmt(spec.currency, spec.base_value)}`)
      }
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className="relative flex-1 min-h-0"
          style={{ paddingTop: compact ? 8 : 22 }}
        >
          <div className="relative w-full h-full">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full"
              style={{ overflow: "visible" }}
            >
              {/* Base reference line at index = 100 */}
              {baseY >= 0 && baseY <= 100 && (
                <line
                  x1={0}
                  x2={100}
                  y1={baseY}
                  y2={baseY}
                  stroke={BRAND.slate300}
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              <path
                d={linePath}
                fill="none"
                stroke={BRAND.purps}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {points.map((p, i) => {
                const isCheap = i === cheapestIdx;
                const isPricey = i === priciestIdx;
                const isHover = i === hoverIdx;
                const r = isCheap || isPricey || isHover ? 2.6 : 1.6;
                const fill = isCheap
                  ? BRAND.okayGreen
                  : isPricey
                    ? BRAND.candy
                    : BRAND.purps;
                return (
                  <circle
                    key={p.d.month}
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    fill={fill}
                    stroke="white"
                    strokeWidth={1.2}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>

            {!compact && baseY >= 0 && baseY <= 100 && (
              <span
                style={{
                  position: "absolute",
                  right: 0,
                  top: `calc(${baseY}% - 14px)`,
                  fontSize: 9,
                  fontWeight: 700,
                  color: BRAND.slate500,
                }}
              >
                base
              </span>
            )}

            <div
              className="absolute inset-0 grid"
              style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}
            >
              {data.map((d, i) => (
                <div
                  key={d.month}
                  className="relative h-full"
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx((h) => (h === i ? null : h))}
                  onTouchStart={() => setHoverIdx(i)}
                  onTouchEnd={() => setHoverIdx(null)}
                >
                  {hover && hoverIdx === i && (
                    <ChartTooltip
                      anchorXPct={50}
                      placement="above"
                      offset={10}
                    >
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: 800 }}>
                          {d.label} ·{" "}
                          {fmt(spec.currency, priceFor(spec.base_value, d.index))}
                        </div>
                        <div
                          style={{
                            opacity: 0.85,
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          {d.index === 100
                            ? "at base"
                            : d.index > 100
                              ? `${d.index - 100}% above base`
                              : `${100 - d.index}% off base`}
                          {d.note ? ` · ${d.note}` : ""}
                        </div>
                      </div>
                    </ChartTooltip>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="grid mt-1.5"
          style={{
            gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
            columnGap: "clamp(5px, 1cqi, 11px)",
            borderTop: `1px solid ${BRAND.slate100}`,
            paddingTop: 5,
          }}
        >
          {data.map((d, i) => (
            <div
              key={d.month}
              className="text-center"
              style={{
                fontSize: CHART_TYPE.axisTick.fontSize,
                color:
                  i === cheapestIdx
                    ? BRAND.okayInk
                    : i === priciestIdx
                      ? BRAND.candy
                      : BRAND.slate900,
                fontWeight: CHART_TYPE.axisTick.fontWeight,
              }}
            >
              {d.label}
            </div>
          ))}
        </div>

        {!compact && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {spec.cheapest_months.length > 0 && (
              <CalloutPill bg={BRAND.bgMint} fg={BRAND.okayInk}>
                Cheapest · {spec.cheapest_months.join(", ")}
              </CalloutPill>
            )}
            {spec.priciest_months.length > 0 && (
              <CalloutPill bg={BRAND.candySoft} fg={BRAND.candy}>
                Priciest · {spec.priciest_months.join(", ")}
              </CalloutPill>
            )}
          </div>
        )}

        <SourcesFooter provenance={provenance} compact={compact} />
      </div>
    </ChartCard>
  );
}
