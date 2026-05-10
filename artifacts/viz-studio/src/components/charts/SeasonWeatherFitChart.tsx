import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import {
  type SeasonStatus,
  type SeasonWeatherFitSpec,
} from "@/lib/chart-spec";

interface Props {
  spec: SeasonWeatherFitSpec;
  context?: string;
  compact?: boolean;
}

const MONTH_ORDER: SeasonWeatherFitSpec["months"][number]["month"][] = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

const MONTH_LABEL: Record<
  SeasonWeatherFitSpec["months"][number]["month"],
  string
> = {
  jan: "Jan", feb: "Feb", mar: "Mar", apr: "Apr",
  may: "May", jun: "Jun", jul: "Jul", aug: "Aug",
  sep: "Sep", oct: "Oct", nov: "Nov", dec: "Dec",
};

const STATUS_META: Record<
  SeasonStatus,
  { bg: string; fg: string; label: string; rank: number }
> = {
  closed: { bg: BRAND.slate200, fg: BRAND.slate700, label: "Closed", rank: 0 },
  poor: { bg: "#FCE7F3", fg: "#BE185D", label: "Poor", rank: 1 },
  fair: { bg: "#FEF3C7", fg: "#92400E", label: "Fair", rank: 2 },
  good: { bg: "#D1FAE5", fg: "#047857", label: "Good", rank: 3 },
  optimal: { bg: "#A7F3D0", fg: "#065F46", label: "Optimal", rank: 4 },
};

function rollupStatus(cells: { status: SeasonStatus }[]): SeasonStatus {
  let worst: SeasonStatus = "optimal";
  for (const c of cells) {
    if (STATUS_META[c.status].rank < STATUS_META[worst].rank) {
      worst = c.status;
    }
  }
  return worst;
}

export function SeasonWeatherFitChart({
  spec,
  context,
  compact = false,
}: Props) {
  const {
    activity_label,
    dimensions,
    months,
    best_months,
    worst_months,
    helper,
  } = spec;
  const byMonth = new Map(months.map((m) => [m.month, m]));

  return (
    <ChartCard
      context={context ?? `When ${activity_label} are in season`}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {!compact && (
          <div
            style={{
              fontSize: "clamp(11px, 1.3cqi, 14px)",
              fontWeight: 800,
              color: BRAND.slate950,
              marginBottom: 8,
            }}
          >
            {activity_label}
          </div>
        )}

        {/* Heatmap: dimensions × months. In compact mode collapse to a single
            overall-status row to keep the grid readable at small heights. */}
        {compact ? (
          <div
            className="grid flex-1 min-h-0"
            style={{
              gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
              gap: 3,
            }}
          >
            {MONTH_ORDER.map((mo, i) => {
              const m = byMonth.get(mo);
              const status =
                m?.overall_status ?? (m ? rollupStatus(m.cells) : "fair");
              const meta = STATUS_META[status];
              return (
                <motion.div
                  key={mo}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: 0.02 * i,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex flex-col items-center justify-center"
                  style={{
                    background: meta.bg,
                    color: meta.fg,
                    borderRadius: 6,
                    padding: "4px 2px",
                    minWidth: 0,
                  }}
                  title={`${MONTH_LABEL[mo]} · ${meta.label}`}
                >
                  <span
                    style={{
                      fontSize: "clamp(8px, 0.9cqi, 10px)",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {MONTH_LABEL[mo]}
                  </span>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              overflowX: "auto",
              overflowY: "visible",
            }}
          >
          <div
            className="grid"
            style={{
              gridTemplateColumns: `minmax(110px, 1.2fr) repeat(12, minmax(34px, 1fr))`,
              minWidth: 110 + 12 * 34,
              gap: 4,
            }}
          >
            {/* header row of months */}
            <div
              style={{
                position: "sticky",
                left: 0,
                background: "#fff",
                zIndex: 2,
              }}
            />
            {MONTH_ORDER.map((mo) => (
              <div
                key={`h-${mo}`}
                style={{
                  fontSize: "clamp(8px, 0.95cqi, 10px)",
                  fontWeight: 800,
                  color: BRAND.slate700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  textAlign: "center",
                }}
              >
                {MONTH_LABEL[mo]}
              </div>
            ))}

            {/* one row per dimension */}
            {dimensions.map((dim, di) => (
              <>
                <div
                  key={`l-${di}`}
                  style={{
                    position: "sticky",
                    left: 0,
                    background: "#fff",
                    zIndex: 1,
                    fontSize: "clamp(9px, 1cqi, 11px)",
                    fontWeight: 700,
                    color: BRAND.slate900,
                    display: "flex",
                    alignItems: "center",
                    minWidth: 0,
                    paddingRight: 4,
                  }}
                  title={dim.note}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {dim.name}
                  </span>
                </div>
                {MONTH_ORDER.map((mo, mi) => {
                  const m = byMonth.get(mo);
                  const cell = m?.cells[di];
                  const status = cell?.status ?? "fair";
                  const meta = STATUS_META[status];
                  const score = cell?.score ?? 0;
                  return (
                    <motion.div
                      key={`c-${di}-${mo}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.3,
                        delay: 0.015 * (di * 12 + mi),
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="flex items-center justify-center"
                      style={{
                        background: meta.bg,
                        color: meta.fg,
                        borderRadius: 5,
                        padding: "4px 0",
                        minWidth: 0,
                        fontSize: "clamp(8px, 0.95cqi, 10px)",
                        fontWeight: 800,
                      }}
                      title={`${dim.name} · ${MONTH_LABEL[mo]} · ${meta.label} (${score})`}
                    >
                      {score}
                    </motion.div>
                  );
                })}
              </>
            ))}
          </div>
          </div>
        )}

        {!compact && (
          <div
            className="flex flex-wrap items-center justify-center"
            style={{ gap: 8, marginTop: 10 }}
          >
            {(["optimal", "good", "fair", "poor", "closed"] as const).map(
              (k) => {
                const meta = STATUS_META[k];
                return (
                  <div
                    key={k}
                    className="flex items-center gap-1.5"
                    style={{ minWidth: 0 }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 3,
                        background: meta.bg,
                        border: `1px solid ${meta.fg}30`,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "clamp(9px, 1cqi, 11px)",
                        fontWeight: 700,
                        color: BRAND.slate700,
                      }}
                    >
                      {meta.label}
                    </span>
                  </div>
                );
              },
            )}
          </div>
        )}

        {!compact && (best_months.length > 0 || worst_months.length > 0) && (
          <div
            className="flex flex-wrap justify-center"
            style={{ gap: 6, marginTop: 8 }}
          >
            {best_months.length > 0 && (
              <span
                style={{
                  background: STATUS_META.optimal.bg,
                  color: STATUS_META.optimal.fg,
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: "clamp(9px, 1cqi, 11px)",
                  fontWeight: 800,
                }}
              >
                Best: {best_months.join(", ")}
              </span>
            )}
            {worst_months.length > 0 && (
              <span
                style={{
                  background: STATUS_META.poor.bg,
                  color: STATUS_META.poor.fg,
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: "clamp(9px, 1cqi, 11px)",
                  fontWeight: 800,
                }}
              >
                Avoid: {worst_months.join(", ")}
              </span>
            )}
          </div>
        )}

        {!compact && helper && (
          <div
            style={{
              fontSize: "clamp(9px, 1cqi, 11px)",
              fontWeight: 600,
              color: BRAND.slate700,
              marginTop: 8,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            {helper}
          </div>
        )}
      </div>
    </ChartCard>
  );
}
