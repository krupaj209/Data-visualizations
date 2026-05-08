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
  type ConditionsCalendarSpec,
  type ConditionsStatus,
} from "@/lib/chart-spec";

interface Props {
  spec: ConditionsCalendarSpec;
  context?: string;
  compact?: boolean;
  provenance?: ChartProvenanceLite | null;
}

const STATUS_LABEL: Record<ConditionsStatus, string> = {
  closed: "Closed",
  poor: "Poor",
  fair: "Fair",
  good: "Good",
  optimal: "Optimal",
  expert: "Expert only",
};

// Background band tone — these wash the y-axis so reference_bands read as
// horizontal stripes behind the conditions area.
const BAND_BG: Record<Exclude<ConditionsStatus, "closed">, string> = {
  poor: "rgba(255, 0, 118, 0.10)",
  fair: "rgba(255, 152, 0, 0.10)",
  good: "rgba(205, 242, 128, 0.28)",
  optimal: "rgba(21, 216, 118, 0.18)",
  expert: "rgba(128, 0, 255, 0.10)",
};

const BAND_FG: Record<Exclude<ConditionsStatus, "closed">, string> = {
  poor: BRAND.candy,
  fair: BRAND.hola,
  good: BRAND.okayInk,
  optimal: BRAND.okayInk,
  expert: BRAND.purps,
};

export function ConditionsCalendarChart({
  spec,
  context,
  compact,
  provenance,
}: Props) {
  const data = useMemo(() => {
    const byMonth = new Map(spec.months.map((m) => [m.month, m]));
    return MONTH_ORDER.map((m) => {
      const row = byMonth.get(m);
      return {
        month: m,
        label: MONTH_LABELS[m],
        value: row?.value ?? 0,
        status: (row?.status ?? "fair") as ConditionsStatus,
        note: row?.note ?? null,
        icons: row?.icons ?? [],
      };
    });
  }, [spec.months]);

  const open = data.filter((d) => d.status !== "closed");
  const peakIdx = open.length
    ? data.findIndex(
        (d) =>
          d ===
          open.reduce(
            (best, cur) => (cur.value > best.value ? cur : best),
            open[0],
          ),
      )
    : -1;
  const lowIdx = open.length
    ? data.findIndex(
        (d) =>
          d ===
          open.reduce(
            (best, cur) => (cur.value < best.value ? cur : best),
            open[0],
          ),
      )
    : -1;

  // Y-axis domain — include reference bands so they always fit on the chart.
  const allValues = [
    ...data.map((d) => d.value),
    ...(spec.reference_bands ?? []).flatMap((b) => [b.min, b.max]),
  ];
  const yMax = Math.max(...allValues, 1) * 1.08;
  const yMin = Math.min(0, ...allValues);
  const yRange = Math.max(yMax - yMin, 1);

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Build the area path. Closed months break the curve.
  const points = data.map((d, i) => {
    const x = (i / 11) * 100;
    const y =
      d.status === "closed" ? null : 100 - ((d.value - yMin) / yRange) * 100;
    return { x, y, d };
  });

  const linePath = points
    .map((p, i) => {
      if (p.y === null) return "";
      const cmd = i === 0 || points[i - 1].y === null ? "M" : "L";
      return `${cmd} ${p.x} ${p.y}`;
    })
    .filter(Boolean)
    .join(" ");

  // Area fill: line down to baseline.
  const areaPath = (() => {
    let d = "";
    let inSegment = false;
    let firstX = 0;
    points.forEach((p, i) => {
      if (p.y === null) {
        if (inSegment) {
          d += ` L ${points[i - 1].x} 100 L ${firstX} 100 Z`;
          inSegment = false;
        }
        return;
      }
      if (!inSegment) {
        d += ` M ${p.x} ${p.y}`;
        firstX = p.x;
        inSegment = true;
      } else {
        d += ` L ${p.x} ${p.y}`;
      }
    });
    if (inSegment) {
      const last = points[points.length - 1];
      d += ` L ${last.x} 100 L ${firstX} 100 Z`;
    }
    return d.trim();
  })();

  const hover = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <ChartCard
      context={context ?? `${spec.metric_label} (${spec.unit_label})`}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className="relative flex-1 min-h-0"
          style={{ paddingTop: compact ? 8 : 18 }}
        >
          <div className="relative w-full h-full">
            {/* Reference bands — horizontal stripes behind the curve. */}
            {spec.reference_bands?.map((band, i) => {
              const tone = band.tone;
              const yTop = 100 - ((band.max - yMin) / yRange) * 100;
              const yBottom = 100 - ((band.min - yMin) / yRange) * 100;
              const top = Math.max(0, Math.min(100, yTop));
              const height = Math.max(0, Math.min(100, yBottom) - top);
              return (
                <div
                  key={`band-${i}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: 0,
                    right: 0,
                    top: `${top}%`,
                    height: `${height}%`,
                    background: BAND_BG[tone],
                    borderTop: `1px dashed ${BAND_FG[tone]}40`,
                    borderBottom: `1px dashed ${BAND_FG[tone]}40`,
                  }}
                >
                  {!compact && (
                    <span
                      style={{
                        position: "absolute",
                        right: 4,
                        top: 2,
                        fontSize: 9,
                        fontWeight: 800,
                        color: BAND_FG[tone],
                        background: "rgba(255,255,255,0.7)",
                        borderRadius: 4,
                        padding: "1px 5px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {band.label}
                    </span>
                  )}
                </div>
              );
            })}

            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full"
              style={{ overflow: "visible" }}
            >
              {areaPath && (
                <path
                  d={areaPath}
                  fill={BRAND.purpsSoft}
                  opacity={0.85}
                />
              )}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke={BRAND.purps}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {points.map((p, i) => {
                if (p.y === null) return null;
                const isPeak = i === peakIdx;
                const isLow = i === lowIdx;
                const isHover = i === hoverIdx;
                const r = isPeak || isLow || isHover ? 2.4 : 1.6;
                const fill = isPeak
                  ? BRAND.candy
                  : isLow
                    ? BRAND.slate700
                    : BRAND.purps;
                return (
                  <circle
                    key={p.d.month}
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    fill={fill}
                    stroke="white"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>

            {/* Hover hit areas + tooltip overlay */}
            <div className="absolute inset-0 grid"
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
                          {d.status === "closed"
                            ? "Closed"
                            : `${d.value}${spec.unit_label}`}
                          {d.icons.length > 0 ? ` ${d.icons.join(" ")}` : ""}
                        </div>
                        <div
                          style={{
                            opacity: 0.85,
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          {STATUS_LABEL[d.status]}
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
              className="text-center flex flex-col items-center"
              style={{
                fontSize: CHART_TYPE.axisTick.fontSize,
                color:
                  i === peakIdx
                    ? BRAND.candy
                    : i === lowIdx
                      ? BRAND.slate500
                      : d.status === "closed"
                        ? BRAND.slate500
                        : BRAND.slate900,
                fontWeight: CHART_TYPE.axisTick.fontWeight,
                lineHeight: 1.1,
              }}
            >
              <span>{d.label}</span>
              {!compact && d.icons.length > 0 && (
                <span
                  aria-hidden
                  style={{
                    fontSize: "0.95em",
                    marginTop: 1,
                    letterSpacing: -0.5,
                  }}
                >
                  {d.icons.slice(0, 2).join("")}
                </span>
              )}
            </div>
          ))}
        </div>

        {!compact && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {spec.best_months.length > 0 && (
              <CalloutPill bg={BRAND.bgMint} fg={BRAND.okayInk}>
                Best · {spec.best_months.join(", ")}
              </CalloutPill>
            )}
            {spec.worst_months.length > 0 && (
              <CalloutPill bg={BRAND.candySoft} fg={BRAND.candy}>
                Avoid · {spec.worst_months.join(", ")}
              </CalloutPill>
            )}
          </div>
        )}

        <SourcesFooter provenance={provenance} compact={compact} />
      </div>
    </ChartCard>
  );
}
