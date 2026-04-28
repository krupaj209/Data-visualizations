import { ChartCard } from "@/components/ChartCard";
import { ACCENT_FILL, BRAND, type AccentKey } from "@/lib/brand";
import { type ChartHeader, type DonutBreakdownSpec } from "@/lib/chart-spec";

interface Props {
  spec: DonutBreakdownSpec;
  header: ChartHeader;
}

const DEFAULT_ACCENTS: AccentKey[] = ["purps", "candy", "hola", "okay", "slate"];

export function DonutBreakdownChart({ spec, header }: Props) {
  const segs = spec.segments.slice(0, 6);
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;

  // SVG donut
  const radius = 78;
  const stroke = 26;
  const circ = 2 * Math.PI * radius;

  let acc = 0;
  const segments = segs.map((s, i) => {
    const accent = s.accent ?? DEFAULT_ACCENTS[i % DEFAULT_ACCENTS.length];
    const color = ACCENT_FILL[accent];
    const length = (s.value / total) * circ;
    const offset = circ - acc - length;
    acc += length;
    return { color, length, offset, label: s.label, value: s.value, accent };
  });

  return (
    <ChartCard
      title={header.title}
      subtitle={header.subtitle}
      insight={header.insight}
    >
      <div className="flex-1 flex items-stretch gap-4 min-h-0">
        <div
          className="relative flex items-center justify-center"
          style={{ width: "42%", minWidth: "38%" }}
        >
          <svg
            viewBox="-100 -100 200 200"
            style={{ width: "100%", maxHeight: "100%", maxWidth: 280 }}
          >
            <circle
              r={radius}
              cx={0}
              cy={0}
              fill="none"
              stroke={BRAND.slate100}
              strokeWidth={stroke}
            />
            {segments.map((s, i) => (
              <circle
                key={i}
                r={radius}
                cx={0}
                cy={0}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${s.length} ${circ}`}
                strokeDashoffset={s.offset}
                transform="rotate(-90)"
                strokeLinecap="butt"
              />
            ))}
            <text
              x={0}
              y={-4}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fontWeight: 800,
                fontSize: 28,
                fill: BRAND.slate950,
                letterSpacing: "-0.02em",
              }}
            >
              {spec.center_value}
            </text>
            <text
              x={0}
              y={18}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fontWeight: 700,
                fontSize: 10,
                fill: BRAND.slate700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {spec.center_label}
            </text>
          </svg>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-2 min-w-0">
          {segments.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 4,
                  background: s.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  fontSize: "clamp(11px, 1.3cqi, 15px)",
                  fontWeight: 700,
                  color: BRAND.slate900,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {s.label}
              </span>
              <span
                style={{
                  fontSize: "clamp(12px, 1.5cqi, 17px)",
                  fontWeight: 800,
                  color: BRAND.slate950,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {s.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}
