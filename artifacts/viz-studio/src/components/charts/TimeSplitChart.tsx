import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import { ACCENT_FG, ACCENT_FILL, ACCENT_SOFT, BRAND } from "@/lib/brand";
import { CALLOUT_PILL, CHART_TYPE } from "@/lib/chart-system";
import { type TimeSplitSpec } from "@/lib/chart-spec";

interface Props {
  spec: TimeSplitSpec;
  context?: string;
  compact?: boolean;
}

function fmtTotal(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function TimeSplitChart({ spec, context, compact = false }: Props) {
  const { total_min, total_label, segments, callout } = spec;
  const sum = segments.reduce((s, x) => s + x.minutes, 0);

  const formattedTotal = fmtTotal(total_min);
  const headerText = total_label
    ? `${total_label} · ${formattedTotal}`
    : formattedTotal;

  return (
    <ChartCard
      context={context ?? "How the time breaks down"}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0 justify-center">
        <div style={{ marginBottom: compact ? 6 : 10 }}>
          <div
            style={{
              fontSize: compact
                ? "clamp(11px, 1.3cqi, 13px)"
                : "clamp(13px, 1.6cqi, 18px)",
              fontWeight: 800,
              color: BRAND.slate950,
              lineHeight: 1.1,
            }}
          >
            {headerText}
          </div>
        </div>

        {/* Stacked bar */}
        <div
          className="flex"
          style={{
            width: "100%",
            height: compact ? 36 : 44,
            borderRadius: 12,
            overflow: "hidden",
            background: "white",
          }}
          role="img"
          aria-label="Time breakdown"
        >
          {segments.map((seg, i) => {
            const widthPct = (seg.minutes / sum) * 100;
            const isLast = i === segments.length - 1;
            const isOptional = seg.optional === true;
            const segBg = isOptional
              ? ACCENT_SOFT[seg.accent]
              : ACCENT_FILL[seg.accent];
            const segFg = isOptional ? ACCENT_FG[seg.accent] : "white";
            return (
              <motion.div
                key={i}
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{
                  duration: 0.7,
                  delay: 0.1 + i * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  background: segBg,
                  border: isOptional
                    ? `1.5px dashed ${ACCENT_FILL[seg.accent]}`
                    : `1px solid ${BRAND.slate100}`,
                  borderRightWidth: isOptional || isLast ? undefined : 0,
                  borderLeftWidth: isOptional || i === 0 ? undefined : 0,
                  borderTopLeftRadius: i === 0 ? 12 : 0,
                  borderBottomLeftRadius: i === 0 ? 12 : 0,
                  borderTopRightRadius: isLast ? 12 : 0,
                  borderBottomRightRadius: isLast ? 12 : 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 0,
                  overflow: "hidden",
                  color: segFg,
                  fontWeight: isOptional ? 700 : 800,
                  fontSize: "clamp(10px, 1.1cqi, 12px)",
                  whiteSpace: "nowrap",
                }}
                title={`${seg.label} · ${seg.minutes} min${isOptional ? " · optional" : ""}`}
              >
                {widthPct >= 10 && <span>{seg.minutes}m</span>}
              </motion.div>
            );
          })}
        </div>

        {/* Per-segment legend rail */}
        <div
          className="grid"
          style={{
            marginTop: compact ? 8 : 14,
            gridTemplateColumns: `repeat(auto-fit, minmax(${compact ? 90 : 130}px, 1fr))`,
            gap: compact ? 6 : 10,
          }}
        >
          {segments.map((seg, i) => {
            const isOptional = seg.optional === true;
            return (
              <div
                key={i}
                className="flex items-start gap-2"
                style={{ minWidth: 0 }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: isOptional
                      ? ACCENT_SOFT[seg.accent]
                      : ACCENT_FILL[seg.accent],
                    border: isOptional
                      ? `1.5px dashed ${ACCENT_FILL[seg.accent]}`
                      : "none",
                    marginTop: 4,
                  }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: compact
                        ? "clamp(10px, 1.1cqi, 12px)"
                        : CHART_TYPE.catLabel.fontSize,
                      fontWeight: 800,
                      color: BRAND.slate900,
                      lineHeight: 1.15,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontStyle: isOptional ? "italic" : "normal",
                    }}
                  >
                    {isOptional && (
                      <span
                        style={{
                          fontStyle: "normal",
                          fontWeight: 700,
                          fontSize: "0.78em",
                          color: BRAND.slate500,
                          marginRight: 4,
                          textTransform: "uppercase",
                          letterSpacing: 0.3,
                        }}
                      >
                        opt ·
                      </span>
                    )}
                    {seg.label}
                  </div>
                  <div
                    style={{
                      fontSize: "clamp(9px, 1cqi, 11px)",
                      fontWeight: 700,
                      color: ACCENT_FG[seg.accent],
                      marginTop: 1,
                    }}
                  >
                    {seg.minutes} min
                    {sum > 0 && (
                      <span style={{ color: BRAND.slate500, fontWeight: 600 }}>
                        {" "}· {Math.round((seg.minutes / sum) * 100)}%
                      </span>
                    )}
                  </div>
                  {!compact && seg.note && (
                    <div
                      style={{
                        fontSize: "clamp(9px, 1cqi, 11px)",
                        fontWeight: 600,
                        color: BRAND.slate700,
                        marginTop: 2,
                        lineHeight: 1.25,
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {seg.note}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!compact && callout && (
          <div className="flex justify-center" style={{ marginTop: 14 }}>
            <span
              style={{
                background: ACCENT_SOFT.candy,
                color: BRAND.candy,
                padding: `${CALLOUT_PILL.paddingY}px ${CALLOUT_PILL.paddingX}px`,
                borderRadius: CALLOUT_PILL.radius,
                fontSize: CALLOUT_PILL.fontSize,
                fontWeight: CALLOUT_PILL.fontWeight,
                lineHeight: 1.3,
                textAlign: "center",
              }}
            >
              {callout}
            </span>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
