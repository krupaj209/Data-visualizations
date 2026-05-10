import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import { ACCENT_FG, ACCENT_FILL, ACCENT_SOFT, BRAND } from "@/lib/brand";
import { CALLOUT_PILL, CHART_TYPE } from "@/lib/chart-system";
import {
  type DurationBudgetBadge,
  type DurationBudgetSpec,
} from "@/lib/chart-spec";

interface Props {
  spec: DurationBudgetSpec;
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

const BADGE_META: Record<
  DurationBudgetBadge,
  { label: string; bg: string; fg: string; short: string }
> = {
  skip_if_tight: {
    label: "Skip if tight",
    short: "Skip if tight",
    bg: ACCENT_SOFT.slate,
    fg: BRAND.slate900,
  },
  extend_if_deep_dive: {
    label: "Extend if deep dive",
    short: "Extend if deep dive",
    bg: ACCENT_SOFT.candy,
    fg: BRAND.candy,
  },
};

export function DurationBudgetChart({ spec, context, compact = false }: Props) {
  const { total_min, total_label, blocks, tip } = spec;
  const sum = blocks.reduce((s, b) => s + b.minutes, 0) || 1;

  return (
    <ChartCard context={context ?? "How to budget your time"} compact={compact}>
      <div className="flex-1 flex flex-col min-h-0 justify-center">
        {!compact && (
          <div
            className="flex items-baseline justify-between"
            style={{ marginBottom: 10 }}
          >
            <div
              style={{
                fontSize: "clamp(13px, 1.6cqi, 18px)",
                fontWeight: 800,
                color: BRAND.slate950,
                lineHeight: 1.1,
              }}
            >
              {total_label ?? `${fmtTotal(total_min)} budget`}
            </div>
            <div
              style={{
                fontSize: "clamp(10px, 1.05cqi, 12px)",
                fontWeight: 600,
                color: BRAND.slate700,
              }}
            >
              {fmtTotal(total_min)} total
            </div>
          </div>
        )}

        {/* Single stacked bar — same engine as TimeSplitChart */}
        <div
          className="flex"
          style={{
            width: "100%",
            height: compact ? 36 : 44,
            borderRadius: 12,
            overflow: "hidden",
            border: `1px solid ${BRAND.slate100}`,
          }}
          role="img"
          aria-label="Duration budget"
        >
          {blocks.map((b, i) => {
            const widthPct = (b.minutes / sum) * 100;
            const isLast = i === blocks.length - 1;
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
                  background: ACCENT_FILL[b.accent],
                  borderRight: isLast
                    ? "none"
                    : "1px solid rgba(255,255,255,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 0,
                  overflow: "hidden",
                  color: "white",
                  fontWeight: 800,
                  fontSize: "clamp(10px, 1.1cqi, 12px)",
                  whiteSpace: "nowrap",
                }}
                title={`${b.label} · ${b.minutes} min`}
              >
                {widthPct >= 10 && <span>{b.minutes}m</span>}
              </motion.div>
            );
          })}
        </div>

        {/* Per-block legend rail with optional badges. Compact mode
            drops the entire rail per the embed contract (the bar
            self-labels each segment with its minutes). */}
        {!compact && (
        <div
          className="grid"
          style={{
            marginTop: 14,
            gridTemplateColumns: `repeat(auto-fit, minmax(130px, 1fr))`,
            gap: 10,
          }}
        >
          {blocks.map((b, i) => {
            const badge = b.badge ? BADGE_META[b.badge] : null;
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
                    background: ACCENT_FILL[b.accent],
                    marginTop: 4,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: CHART_TYPE.catLabel.fontSize,
                      fontWeight: 800,
                      color: BRAND.slate900,
                      lineHeight: 1.15,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {b.label}
                  </div>
                  <div
                    style={{
                      fontSize: "clamp(9px, 1cqi, 11px)",
                      fontWeight: 700,
                      color: ACCENT_FG[b.accent],
                      marginTop: 1,
                    }}
                  >
                    {b.minutes} min
                    {sum > 0 && (
                      <span style={{ color: BRAND.slate500, fontWeight: 600 }}>
                        {" "}
                        · {Math.round((b.minutes / sum) * 100)}%
                      </span>
                    )}
                  </div>
                  {badge && (
                    <div style={{ marginTop: 3 }}>
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.fg,
                          padding: "1px 7px",
                          borderRadius: 999,
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: "0.03em",
                          textTransform: "uppercase",
                        }}
                      >
                        {badge.short}
                      </span>
                    </div>
                  )}
                  {b.note && (
                    <div
                      style={{
                        fontSize: "clamp(9px, 1cqi, 11px)",
                        fontWeight: 600,
                        color: BRAND.slate700,
                        marginTop: 2,
                        lineHeight: 1.25,
                      }}
                    >
                      {b.note}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}

        {!compact && tip && (
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
              {tip}
            </span>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
