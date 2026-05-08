import { motion } from "framer-motion";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { CalloutPill } from "@/components/charts/system";
import { type SavingsBreakdownSpec } from "@/lib/chart-spec";

interface Props {
  spec: SavingsBreakdownSpec;
  context?: string;
  compact?: boolean;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
  AUD: "A$",
  CAD: "C$",
};

export function SavingsBreakdownChart({ spec, context, compact = false }: Props) {
  const symbol = CURRENCY_SYMBOL[spec.currency] ?? spec.currency;
  const sorted = [...spec.attractions].sort(
    (a, b) => b.standalone_price - a.standalone_price,
  );
  const maxPrice = Math.max(
    ...sorted.map((a) => a.standalone_price),
    spec.card_price,
    1,
  );
  const cardPct = (spec.card_price / maxPrice) * 100;
  const totalStandalone = sorted.reduce((s, a) => s + a.standalone_price, 0);
  const savings = Math.max(totalStandalone - spec.card_price, 0);

  return (
    <ChartCard
      context={context ?? `${spec.card_label} vs gate prices`}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {!compact && (
          <div className="flex items-center justify-between mb-3 gap-2">
            <div
              style={{
                fontSize: "clamp(11px, 1.25cqi, 13px)",
                color: BRAND.slate700,
                fontWeight: 700,
              }}
            >
              Standalone prices vs {spec.card_label.toLowerCase()}
            </div>
            <CalloutPill bg={BRAND.purpsSoft} fg={BRAND.purps}>
              {spec.card_label} {symbol}
              {spec.card_price}
            </CalloutPill>
          </div>
        )}

        <div
          className="flex-1 relative flex flex-col min-h-0"
          style={{
            rowGap: compact ? 4 : 7,
            justifyContent: "center",
          }}
        >
          {!compact && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `calc(34% + (66% * ${cardPct / 100}))`,
                top: -4,
                bottom: 18,
                width: 0,
                borderLeft: `2px dashed ${BRAND.purps}`,
                zIndex: 2,
              }}
            />
          )}
          {sorted.map((a, i) => {
            const widthPct = (a.standalone_price / maxPrice) * 100;
            const isValueAdd = a.standalone_price >= spec.card_price;
            const fill = isValueAdd ? BRAND.candy : BRAND.slate300;
            return (
              <div key={i} className="flex items-center" style={{ gap: 8 }}>
                <div
                  style={{
                    width: "32%",
                    minWidth: 0,
                    fontSize: compact
                      ? "clamp(10px, 1.1cqi, 12px)"
                      : "clamp(11px, 1.2cqi, 13px)",
                    color: BRAND.slate950,
                    fontWeight: 700,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={a.name}
                >
                  {a.name}
                </div>
                <div
                  className="relative flex-1"
                  style={{
                    height: compact ? 14 : 18,
                    background: BRAND.slate50,
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPct}%` }}
                    transition={{
                      duration: 0.7,
                      delay: 0.04 * i,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      background: fill,
                      borderRadius: 6,
                    }}
                  />
                </div>
                <div
                  style={{
                    width: compact ? 44 : 58,
                    textAlign: "right",
                    fontSize: compact
                      ? "clamp(10px, 1.1cqi, 12px)"
                      : "clamp(11px, 1.25cqi, 13px)",
                    fontWeight: 800,
                    color: BRAND.slate950,
                  }}
                >
                  {symbol}
                  {a.standalone_price}
                </div>
              </div>
            );
          })}
        </div>

        {!compact && (
          <div
            className="mt-3 flex items-center gap-2"
            style={{
              borderTop: `1px solid ${BRAND.slate100}`,
              paddingTop: 8,
            }}
          >
            <CalloutPill bg={BRAND.bgMint} fg={BRAND.okayInk}>
              Save {symbol}
              {savings}
            </CalloutPill>
            <span
              style={{
                fontSize: "clamp(10px, 1.1cqi, 12px)",
                color: BRAND.slate700,
                fontWeight: 600,
              }}
            >
              if you visit the {sorted.length} included spots
            </span>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
