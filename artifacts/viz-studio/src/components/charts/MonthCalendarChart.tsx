import { ChartCard } from "@/components/ChartCard";
import { BRAND, SEASON_DOT, SEASON_FILL, SEASON_LABEL, type SeasonKey } from "@/lib/brand";
import { type ChartHeader, type MonthCalendarSpec } from "@/lib/chart-spec";

interface Props {
  spec: MonthCalendarSpec;
  header: ChartHeader;
}

function monthName(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function dayOfWeekIdx(d: Date) {
  // Make Monday = 0
  const js = d.getUTCDay();
  return (js + 6) % 7;
}

export function MonthCalendarChart({ spec, header }: Props) {
  const dayMap = new Map<string, MonthCalendarSpec["days"][number]>(
    spec.days.map((d) => [d.date, d]),
  );
  const recommended = new Set(spec.recommended_dates.map((r) => r.date));

  // Group days by month
  const months = new Map<string, MonthCalendarSpec["days"]>();
  for (const d of spec.days) {
    const key = d.date.slice(0, 7);
    if (!months.has(key)) months.set(key, []);
    months.get(key)!.push(d);
  }
  const monthKeys = Array.from(months.keys()).sort();
  // Show up to 3 months
  const visible = monthKeys.slice(0, 3);

  return (
    <ChartCard
      title={header.title}
      subtitle={header.subtitle}
      insight={header.insight}
    >
      <div className="flex-1 flex gap-3 min-h-0">
        {visible.map((mkey) => {
          const dates = months.get(mkey)!;
          const first = new Date(`${mkey}-01T00:00:00Z`);
          const startOffset = dayOfWeekIdx(first);
          const monthDate = new Date(first);
          const daysInMonth = new Date(
            Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
          ).getUTCDate();
          const cells: ({ date: string; data?: MonthCalendarSpec["days"][number] } | null)[] = [];
          for (let i = 0; i < startOffset; i++) cells.push(null);
          for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${mkey}-${String(day).padStart(2, "0")}`;
            cells.push({
              date: dateStr,
              data: dayMap.get(dateStr),
            });
          }
          // pad to multiple of 7
          while (cells.length % 7 !== 0) cells.push(null);
          void dates;
          return (
            <div key={mkey} className="flex-1 flex flex-col min-w-0">
              <div
                style={{
                  fontSize: "clamp(11px, 1.25cqi, 13px)",
                  fontWeight: 800,
                  color: BRAND.slate900,
                  marginBottom: 6,
                }}
              >
                {monthName(monthDate)}
              </div>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                  gap: 3,
                }}
              >
                {(["M", "T", "W", "T", "F", "S", "S"] as const).map((d, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: "clamp(8px, 0.9cqi, 10px)",
                      color: BRAND.slate500,
                      fontWeight: 700,
                      textAlign: "center",
                    }}
                  >
                    {d}
                  </div>
                ))}
                {cells.map((cell, idx) => {
                  if (!cell) return <div key={idx} />;
                  const status = (cell.data?.status ?? "moderate") as SeasonKey;
                  const isRecommended = recommended.has(cell.date);
                  const dayNum = parseInt(cell.date.slice(8), 10);
                  return (
                    <div
                      key={idx}
                      style={{
                        position: "relative",
                        background: SEASON_FILL[status],
                        aspectRatio: "1",
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "clamp(9px, 1cqi, 11px)",
                        fontWeight: 700,
                        color: BRAND.slate900,
                        border: isRecommended
                          ? `2px solid ${BRAND.purps}`
                          : "1px solid rgba(0,0,0,0.04)",
                        boxShadow: isRecommended
                          ? `0 0 0 2px ${BRAND.purpsSoft}`
                          : "none",
                      }}
                    >
                      {dayNum}
                      {isRecommended && (
                        <span
                          style={{
                            position: "absolute",
                            top: -3,
                            right: -3,
                            width: 8,
                            height: 8,
                            background: BRAND.purps,
                            borderRadius: 999,
                            border: "1.5px solid white",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div
          className="hidden sm:flex flex-col gap-2"
          style={{
            minWidth: "22%",
            maxWidth: "26%",
            background: BRAND.purpsSoft,
            borderRadius: 16,
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              fontSize: "clamp(10px, 1.05cqi, 12px)",
              color: BRAND.purps,
              fontWeight: 800,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            ⭐ Best dates
          </div>
          <div className="flex flex-col gap-1.5 overflow-hidden">
            {spec.recommended_dates.slice(0, 5).map((r) => {
              const d = new Date(`${r.date}T00:00:00Z`);
              return (
                <div key={r.date} className="flex items-start gap-2">
                  <div
                    style={{
                      background: "white",
                      borderRadius: 8,
                      padding: "4px 8px",
                      fontSize: "clamp(10px, 1.1cqi, 12px)",
                      fontWeight: 800,
                      color: BRAND.slate950,
                      minWidth: 56,
                      textAlign: "center",
                    }}
                  >
                    {d.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div
                    style={{
                      fontSize: "clamp(9px, 1cqi, 11px)",
                      fontWeight: 600,
                      color: BRAND.slate900,
                      lineHeight: 1.3,
                      flex: 1,
                    }}
                  >
                    {r.reason}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5"
        style={{ borderTop: `1px solid ${BRAND.slate100}`, paddingTop: 10 }}
      >
        {(
          ["very_quiet", "quiet", "moderate", "busy", "peak", "closed"] as SeasonKey[]
        ).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: SEASON_DOT[s],
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
        ))}
      </div>
    </ChartCard>
  );
}
