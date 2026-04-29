import { Check, Star } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { CALLOUT_PILL } from "@/lib/chart-system";
import { type TicketLadderSpec } from "@/lib/chart-spec";

interface Props {
  spec: TicketLadderSpec;
  context?: string;
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

export function TicketLadderChart({ spec, context }: Props) {
  const tiers = spec.tiers.slice(0, 4);
  const symbol = CURRENCY_SYMBOL[spec.currency] ?? spec.currency;

  return (
    <ChartCard context={context ?? "Ticket options"}>
      <div
        className="flex-1 grid gap-3 min-h-0 items-stretch"
        style={{
          gridTemplateColumns: `repeat(${tiers.length}, minmax(0, 1fr))`,
          alignContent: "center",
        }}
      >
        {tiers.map((t, i) => {
          const isRec = t.recommended;
          return (
            <div
              key={i}
              className="relative flex flex-col"
              style={{
                background: isRec ? BRAND.purpsSoft : BRAND.slate50,
                border: isRec
                  ? `2px solid ${BRAND.purps}`
                  : `1px solid ${BRAND.slate200}`,
                borderRadius: 18,
                padding: "clamp(12px, 1.6cqi, 20px)",
                boxShadow: isRec
                  ? `0 12px 28px -10px ${BRAND.purps}55`
                  : "none",
              }}
            >
              {isRec && (
                <div
                  style={{
                    position: "absolute",
                    top: -10,
                    right: 12,
                    background: BRAND.purps,
                    color: "white",
                    padding: `${CALLOUT_PILL.paddingY}px ${CALLOUT_PILL.paddingX}px`,
                    borderRadius: CALLOUT_PILL.radius,
                    fontSize: CALLOUT_PILL.fontSize,
                    fontWeight: CALLOUT_PILL.fontWeight,
                    lineHeight: 1.15,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Star size={10} fill="white" strokeWidth={0} />
                  Recommended
                </div>
              )}
              <div
                style={{
                  fontSize: "clamp(11px, 1.2cqi, 13px)",
                  fontWeight: 800,
                  color: isRec ? BRAND.purps : BRAND.slate700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {t.name}
              </div>
              <div
                style={{
                  fontSize: "clamp(20px, 3.4cqi, 38px)",
                  fontWeight: 800,
                  color: BRAND.slate950,
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                  marginTop: 6,
                }}
              >
                {symbol}
                {t.price}
              </div>
              {t.wait_savings_min !== undefined && t.wait_savings_min > 0 && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: "clamp(9px, 1.05cqi, 11px)",
                    color: BRAND.candy,
                    fontWeight: 800,
                  }}
                >
                  Saves ~{t.wait_savings_min} min wait
                </div>
              )}
              <div className="flex flex-col gap-1.5 mt-3">
                {t.includes.map((inc, j) => (
                  <div
                    key={j}
                    className="flex items-start gap-1.5"
                    style={{
                      fontSize: "clamp(10px, 1.1cqi, 12px)",
                      color: BRAND.slate900,
                      fontWeight: 600,
                      lineHeight: 1.3,
                    }}
                  >
                    <Check
                      size={14}
                      strokeWidth={3}
                      color={isRec ? BRAND.purps : BRAND.okayGreen}
                      style={{ marginTop: 1, flexShrink: 0 }}
                    />
                    <span>{inc}</span>
                  </div>
                ))}
              </div>
              {t.share !== undefined && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: "clamp(9px, 1cqi, 11px)",
                    color: BRAND.slate700,
                    fontWeight: 700,
                  }}
                >
                  {t.share}% of bookings
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
