import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import {
  BRAND,
  SEASON_DOT,
  SEASON_FILL,
  SEASON_LABEL,
  type SeasonKey,
} from "@/lib/brand";
import {
  MONTH_LABELS,
  MONTH_ORDER,
  type SeasonalCurveSpec,
} from "@/lib/chart-spec";

interface Props {
  spec: SeasonalCurveSpec;
  context?: string;
  /**
   * Embed compact mode: drop the metric_insights paragraph, calendar_notes
   * chip rail, and fallback legend so the chart visualization fills the
   * card. Hosts typically render the equivalent copy as bullet points
   * outside the iframe.
   */
  compact?: boolean;
}

type MetricKey = "crowd" | "weather" | "price";

interface MonthDatum {
  month: string;
  label: string;
  score: number;
  status: SeasonKey;
  weather: number | null;
  price: number | null;
}

const METRIC_LABEL: Record<MetricKey, string> = {
  crowd: "Crowds",
  weather: "Weather",
  price: "Price",
};

/** Solid bar fill for non-crowd metrics. */
const METRIC_FILL: Record<Exclude<MetricKey, "crowd">, string> = {
  weather: BRAND.bgCool,
  price: BRAND.bgBlush,
};

/** Highlighted (best) bar fill for non-crowd metrics. */
const METRIC_BEST_FILL: Record<Exclude<MetricKey, "crowd">, string> = {
  weather: BRAND.okayGreen,
  price: BRAND.candy,
};

const CHIP_TONE: Record<
  "closed" | "free" | "info",
  { bg: string; fg: string }
> = {
  closed: { bg: BRAND.slate100 as string, fg: BRAND.slate700 as string },
  free: { bg: BRAND.bgMint as string, fg: "#0E8F4E" },
  info: { bg: BRAND.purpsSoft as string, fg: BRAND.purps as string },
};

export function SeasonalCurveChart({ spec, context, compact }: Props) {
  const data: MonthDatum[] = useMemo(() => {
    const byMonth = new Map(spec.months.map((m) => [m.month, m]));
    return MONTH_ORDER.map((m) => {
      const row = byMonth.get(m);
      return {
        month: m,
        label: MONTH_LABELS[m],
        score: row?.score ?? 0,
        status: row?.status ?? ("moderate" as SeasonKey),
        weather:
          typeof row?.weather_score === "number" ? row.weather_score : null,
        price: typeof row?.price_score === "number" ? row.price_score : null,
      };
    });
  }, [spec.months]);

  const hasWeather = data.some((d) => d.weather !== null);
  const hasPrice = data.some((d) => d.price !== null);
  const hasUpgrade = hasWeather || hasPrice;

  const availableMetrics: MetricKey[] = useMemo(() => {
    const list: MetricKey[] = ["crowd"];
    if (hasWeather) list.push("weather");
    if (hasPrice) list.push("price");
    return list;
  }, [hasWeather, hasPrice]);

  const [metric, setMetric] = useState<MetricKey>("crowd");

  // Open months — exclude closed-status months from peak/quietest computations.
  const openIdxs = useMemo(
    () =>
      data.map((d, i) => ({ d, i })).filter(({ d }) => d.status !== "closed"),
    [data],
  );

  // Crowd-view annotations (Peak / Quietest / Best balance) — preserved.
  const peakIdx =
    openIdxs.length > 0
      ? openIdxs.reduce(
          (best, cur) => (cur.d.score > best.d.score ? cur : best),
          openIdxs[0],
        ).i
      : -1;
  const quietestIdx =
    openIdxs.length > 0
      ? openIdxs.reduce(
          (best, cur) => (cur.d.score < best.d.score ? cur : best),
          openIdxs[0],
        ).i
      : -1;
  const balanceIdx = data.findIndex(
    (d, i) => d.status === "moderate" && i !== peakIdx && i !== quietestIdx,
  );

  // Best month per active metric.
  const bestIdx = useMemo(() => {
    if (openIdxs.length === 0) return -1;
    if (metric === "crowd") return quietestIdx;
    if (metric === "weather") {
      const candidates = openIdxs.filter(({ d }) => d.weather !== null);
      if (candidates.length === 0) return -1;
      return candidates.reduce(
        (best, cur) =>
          (cur.d.weather as number) > (best.d.weather as number) ? cur : best,
        candidates[0],
      ).i;
    }
    // price
    const candidates = openIdxs.filter(({ d }) => d.price !== null);
    if (candidates.length === 0) return -1;
    return candidates.reduce(
      (best, cur) =>
        (cur.d.price as number) < (best.d.price as number) ? cur : best,
      candidates[0],
    ).i;
  }, [metric, openIdxs, quietestIdx]);

  // Per-bar value & fill driven by active metric.
  const bars = useMemo(() => {
    return data.map((d, i) => {
      let value: number;
      let fill: string;
      if (metric === "crowd") {
        value = d.score;
        fill = SEASON_FILL[d.status];
      } else if (metric === "weather") {
        value = d.weather ?? 0;
        fill = i === bestIdx ? METRIC_BEST_FILL.weather : METRIC_FILL.weather;
      } else {
        value = d.price ?? 0;
        fill = i === bestIdx ? METRIC_BEST_FILL.price : METRIC_FILL.price;
      }
      return { value, fill };
    });
  }, [data, metric, bestIdx]);

  const maxValue = Math.max(...bars.map((b) => b.value), 1);

  return (
    <ChartCard context={context ?? "Crowd level by month"} compact={compact}>
      <div className="flex-1 flex flex-col min-h-0">
        {hasUpgrade && availableMetrics.length > 1 && (
          <MetricToggle
            metrics={availableMetrics}
            value={metric}
            onChange={setMetric}
          />
        )}

        <div
          className="flex-1 grid items-end min-h-0"
          style={{
            gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
            columnGap: "clamp(3px, 0.5cqi, 6px)",
            paddingTop: 22,
          }}
        >
          {data.map((d, i) => {
            const value = bars[i].value;
            const fill = bars[i].fill;
            const heightPct = Math.max((value / maxValue) * 100, 4);

            // Crowd view: preserve the legacy Quietest / Peak / Best balance
            // soft-pill annotations exactly as before (rendered for both
            // fallback and upgrade modes, so fallback === legacy chart).
            let crowdLabel: string | null = null;
            let crowdFg: string = BRAND.purps;
            let crowdBg: string = BRAND.purpsSoft;
            if (metric === "crowd") {
              if (i === peakIdx) {
                crowdLabel = "Peak";
                crowdFg = BRAND.candy;
                crowdBg = BRAND.candySoft;
              } else if (i === quietestIdx) {
                crowdLabel = "Quietest";
                crowdFg = "#0E8F4E";
                crowdBg = BRAND.bgMint;
              } else if (i === balanceIdx) {
                crowdLabel = "Best balance";
                crowdFg = BRAND.purps;
                crowdBg = BRAND.purpsSoft;
              }
            }

            // Upgrade-only primary "Best month" pill for weather / price
            // metrics. In crowd-upgrade mode, the legacy Quietest pill IS
            // the primary callout, so no extra label is rendered — but the
            // bar gets the ring (below) to visually distinguish it.
            let primaryLabel: string | null = null;
            let primaryBg: string = BRAND.purps;
            if (hasUpgrade && i === bestIdx) {
              if (metric === "weather") {
                primaryLabel = "Best weather";
                primaryBg = BRAND.okayGreen;
              } else if (metric === "price") {
                primaryLabel = "Cheapest";
                primaryBg = BRAND.candy;
              }
            }

            // Bar ring: visual primary-highlight on the best bar — only in
            // upgrade mode (fallback chart stays identical to legacy).
            const ringColor =
              hasUpgrade && i === bestIdx
                ? metric === "price"
                  ? BRAND.candy
                  : BRAND.okayGreen
                : null;

            return (
              <div
                key={d.month}
                className="relative h-full flex flex-col items-center justify-end"
              >
                {primaryLabel && (
                  <motion.div
                    layout
                    initial={false}
                    animate={{ bottom: `calc(${heightPct}% + 6px)` }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute z-20 left-1/2 -translate-x-1/2 pointer-events-none"
                  >
                    <div
                      style={{
                        background: primaryBg,
                        color: "#FFFFFF",
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: "clamp(9px, 1cqi, 11px)",
                        fontWeight: 700,
                        letterSpacing: "-0.005em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {primaryLabel}
                    </div>
                  </motion.div>
                )}
                {crowdLabel && (
                  <motion.div
                    layout
                    initial={false}
                    animate={{ bottom: `calc(${heightPct}% + 6px)` }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute z-10 left-1/2 -translate-x-1/2 pointer-events-none"
                  >
                    <div
                      style={{
                        background: crowdBg,
                        color: crowdFg,
                        padding: "3px 8px",
                        borderRadius: 999,
                        fontSize: "clamp(8px, 0.95cqi, 10px)",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {crowdLabel}
                    </div>
                  </motion.div>
                )}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{
                    height: `${heightPct}%`,
                    backgroundColor: fill,
                  }}
                  transition={{
                    duration: 0.6,
                    delay: 0.04 + i * 0.02,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="w-full"
                  style={{
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                    borderBottomLeftRadius: 3,
                    borderBottomRightRadius: 3,
                    boxShadow: ringColor
                      ? `0 0 0 2px ${ringColor}`
                      : undefined,
                  }}
                />
              </div>
            );
          })}
        </div>

        <div
          className="grid mt-1.5"
          style={{
            gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
            columnGap: "clamp(3px, 0.5cqi, 6px)",
            borderTop: `1px solid ${BRAND.slate100}`,
            paddingTop: 5,
          }}
        >
          {data.map((d) => (
            <div
              key={d.month}
              className="text-center"
              style={{
                fontSize: "clamp(9px, 1.05cqi, 12px)",
                color: BRAND.slate900,
                fontWeight: 700,
              }}
            >
              {d.label}
            </div>
          ))}
        </div>

        {!compact && hasUpgrade && spec.metric_insights?.[metric] && (
          <motion.p
            key={metric}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2"
            style={{
              fontSize: "clamp(10px, 1.05cqi, 12px)",
              color: BRAND.slate900,
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            {spec.metric_insights[metric]}
          </motion.p>
        )}

        {!compact &&
          hasUpgrade &&
          spec.calendar_notes &&
          spec.calendar_notes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {spec.calendar_notes.map((note, i) => {
                const tone = CHIP_TONE[note.kind];
                return (
                  <span
                    key={`${note.label}-${i}`}
                    style={{
                      background: tone.bg,
                      color: tone.fg,
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: "clamp(9px, 0.95cqi, 11px)",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {note.label}
                  </span>
                );
              })}
            </div>
          )}

        {!compact && !hasUpgrade && (
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
            {(
              [
                "very_quiet",
                "quiet",
                "moderate",
                "busy",
                "peak",
              ] as SeasonKey[]
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
        )}
      </div>
    </ChartCard>
  );
}

interface ToggleProps {
  metrics: MetricKey[];
  value: MetricKey;
  onChange: (m: MetricKey) => void;
}

function MetricToggle({ metrics, value, onChange }: ToggleProps) {
  return (
    <div
      className="inline-flex self-start"
      style={{
        background: BRAND.slate50,
        border: `1px solid ${BRAND.slate100}`,
        borderRadius: 999,
        padding: 3,
        gap: 2,
        marginBottom: 4,
      }}
      role="tablist"
      aria-label="Select metric"
    >
      {metrics.map((m) => {
        const active = m === value;
        return (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(m)}
            style={{
              position: "relative",
              padding: "5px 12px",
              borderRadius: 999,
              fontSize: "clamp(10px, 1.05cqi, 12px)",
              fontWeight: 800,
              color: active ? "white" : BRAND.slate700,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              minWidth: 56,
            }}
          >
            {active && (
              <motion.span
                layoutId="metric-toggle-pill"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: BRAND.purps,
                  borderRadius: 999,
                  zIndex: 0,
                }}
              />
            )}
            <span style={{ position: "relative", zIndex: 1 }}>
              {METRIC_LABEL[m]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
