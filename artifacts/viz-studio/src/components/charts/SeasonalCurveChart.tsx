import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import { BRAND, SEASON_DOT, SEASON_FILL, SEASON_LABEL, type SeasonKey } from "@/lib/brand";
import {
  MONTH_LABELS,
  MONTH_ORDER,
  type SeasonalCurveSpec,
} from "@/lib/chart-spec";

interface Props {
  spec: SeasonalCurveSpec;
  context?: string;
}

export function SeasonalCurveChart({ spec, context }: Props) {
  const byMonth = new Map(spec.months.map((m) => [m.month, m]));
  const data = MONTH_ORDER.map((m) => {
    const row = byMonth.get(m);
    return {
      month: m,
      label: MONTH_LABELS[m],
      score: row?.score ?? 0,
      status: row?.status ?? ("moderate" as SeasonKey),
    };
  });

  const maxScore = Math.max(...data.map((d) => d.score), 1);

  // Candidate set excludes "closed" months (those aren't Peak or Quietest answers).
  const openIdxs = data
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.status !== "closed");

  // Find one peak (highest score) and one quietest (lowest score) among open months.
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

  // "Best balance" — first month with status moderate that's not the peak/quietest
  const balanceIdx = data.findIndex(
    (d, i) => d.status === "moderate" && i !== peakIdx && i !== quietestIdx,
  );

  return (
    <ChartCard context={context ?? "Crowd level by month"}>
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className="flex-1 grid items-end min-h-0"
          style={{
            gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
            columnGap: "clamp(3px, 0.5cqi, 6px)",
            paddingTop: 26,
          }}
        >
          {data.map((d, i) => {
            const heightPct = Math.max((d.score / maxScore) * 100, 4);
            const fill = SEASON_FILL[d.status];
            const isPeak = i === peakIdx;
            const isQuietest = i === quietestIdx;
            const isBalance = i === balanceIdx;
            const showAnno = isPeak || isQuietest || isBalance;
            const annoLabel = isPeak
              ? "Peak"
              : isQuietest
                ? "Quietest"
                : "Best balance";
            const annoFg = isPeak
              ? BRAND.candy
              : isQuietest
                ? "#0E8F4E"
                : BRAND.purps;
            const annoBg = isPeak
              ? BRAND.candySoft
              : isQuietest
                ? BRAND.bgMint
                : BRAND.purpsSoft;
            return (
              <div
                key={d.month}
                className="relative h-full flex flex-col items-center justify-end"
              >
                {showAnno && (
                  <div
                    className="absolute z-10 left-1/2 -translate-x-1/2 pointer-events-none"
                    style={{ bottom: `calc(${heightPct}% + 6px)` }}
                  >
                    <div
                      style={{
                        background: annoBg,
                        color: annoFg,
                        padding: "3px 8px",
                        borderRadius: 999,
                        fontSize: "clamp(8px, 0.95cqi, 10px)",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {annoLabel}
                    </div>
                  </div>
                )}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{
                    duration: 0.8,
                    delay: 0.04 + i * 0.03,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="w-full"
                  style={{
                    background: fill,
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                    borderBottomLeftRadius: 3,
                    borderBottomRightRadius: 3,
                  }}
                />
              </div>
            );
          })}
        </div>

        <div
          className="grid mt-2"
          style={{
            gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
            columnGap: "clamp(3px, 0.5cqi, 6px)",
            borderTop: `1px solid ${BRAND.slate100}`,
            paddingTop: 8,
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

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
          {(["very_quiet", "quiet", "moderate", "busy", "peak"] as SeasonKey[]).map(
            (s) => (
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
            ),
          )}
        </div>
      </div>
    </ChartCard>
  );
}
