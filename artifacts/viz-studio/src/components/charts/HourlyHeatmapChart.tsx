import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import {
  DAY_LABELS,
  DAY_ORDER,
  type ChartHeader,
  type HourlyHeatmapSpec,
} from "@/lib/chart-spec";

interface Props {
  spec: HourlyHeatmapSpec;
  header: ChartHeader;
}

function intensityToColor(value: number, closed: boolean) {
  if (closed) return BRAND.slate100;
  if (value <= 5) return "#F8F8F8";
  if (value <= 25) return BRAND.bgMint;
  if (value <= 45) return BRAND.subtleGreen;
  if (value <= 65) return BRAND.joyMustard;
  if (value <= 85) return BRAND.hola;
  return BRAND.candy;
}

export function HourlyHeatmapChart({ spec, header }: Props) {
  const rowsByDay = new Map(spec.rows.map((r) => [r.day, r]));
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <ChartCard
      title={header.title}
      subtitle={header.subtitle}
      insight={header.insight}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 grid" style={{ gridTemplateColumns: "auto 1fr", columnGap: 10 }}>
          <div className="flex flex-col justify-around" style={{ paddingTop: 18 }}>
            {DAY_ORDER.map((d) => (
              <div
                key={d}
                style={{
                  fontSize: "clamp(10px, 1.1cqi, 12px)",
                  fontWeight: 700,
                  color: BRAND.slate700,
                }}
              >
                {DAY_LABELS[d]}
              </div>
            ))}
          </div>
          <div className="flex flex-col">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(24, minmax(0, 1fr))`,
                gap: 3,
                paddingBottom: 4,
              }}
            >
              {hours.map((h) => (
                <div
                  key={h}
                  style={{
                    fontSize: "clamp(8px, 0.85cqi, 10px)",
                    color: BRAND.slate500,
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  {h % 3 === 0 ? h : ""}
                </div>
              ))}
            </div>
            <div className="flex-1 flex flex-col gap-1">
              {DAY_ORDER.map((day) => {
                const row = rowsByDay.get(day);
                const closed = row?.closed ?? false;
                const values = row?.hours ?? Array.from({ length: 24 }, () => 0);
                return (
                  <div
                    key={day}
                    className="grid flex-1"
                    style={{
                      gridTemplateColumns: `repeat(24, minmax(0, 1fr))`,
                      gap: 3,
                    }}
                  >
                    {values.map((v, h) => {
                      const beforeOpen = h < spec.open_hour || h >= spec.close_hour;
                      const isClosed = closed || beforeOpen;
                      return (
                        <div
                          key={h}
                          style={{
                            background: intensityToColor(v, isClosed),
                            borderRadius: 5,
                            opacity: isClosed ? 0.55 : 1,
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="mt-3 flex items-center justify-between"
          style={{ borderTop: `1px solid ${BRAND.slate100}`, paddingTop: 10 }}
        >
          <div className="flex items-center gap-1.5">
            <span
              style={{
                fontSize: "clamp(10px, 1.05cqi, 12px)",
                color: BRAND.slate700,
                fontWeight: 700,
              }}
            >
              Quiet
            </span>
            {[BRAND.bgMint, BRAND.subtleGreen, BRAND.joyMustard, BRAND.hola, BRAND.candy].map(
              (c) => (
                <span
                  key={c}
                  style={{
                    width: 18,
                    height: 10,
                    background: c,
                    borderRadius: 3,
                  }}
                />
              ),
            )}
            <span
              style={{
                fontSize: "clamp(10px, 1.05cqi, 12px)",
                color: BRAND.slate700,
                fontWeight: 700,
              }}
            >
              Crowded
            </span>
          </div>
          {spec.best_window && (
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
              ⭐ Best window · {spec.best_window.label}
            </div>
          )}
        </div>
      </div>
    </ChartCard>
  );
}
