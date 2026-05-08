import { useState } from "react";
import { ChartCard } from "@/components/ChartCard";
import { ACCENT_FG, ACCENT_SOFT, BRAND } from "@/lib/brand";
import { CalloutPill } from "@/components/charts/system";
import { type SeatValueMapSpec, type SeatTier } from "@/lib/chart-spec";

interface Props {
  spec: SeatValueMapSpec;
  context?: string;
  compact?: boolean;
}

const TIER_LABEL: Record<SeatTier, string> = {
  stalls: "Stalls",
  circle: "Circle",
  upper_circle: "Upper circle",
  balcony: "Balcony",
  box: "Boxes",
  gallery: "Gallery",
};

const CURRENCY_SYMBOL: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  JPY: "¥",
};

function valueColor(score: number): { bg: string; fg: string } {
  if (score >= 80) return { bg: ACCENT_SOFT.okay, fg: ACCENT_FG.okay };
  if (score >= 60) return { bg: BRAND.bgSage, fg: ACCENT_FG.okay };
  if (score >= 40) return { bg: BRAND.holaSoft, fg: ACCENT_FG.hola };
  return { bg: BRAND.candySoft, fg: BRAND.candy };
}

function valueLabel(score: number): string {
  if (score >= 80) return "Sweet spot";
  if (score >= 60) return "Good value";
  if (score >= 40) return "Fair";
  return "Premium price";
}

export function SeatValueMapChart({ spec, context, compact = false }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const symbol = CURRENCY_SYMBOL[spec.currency] ?? spec.currency;
  const tiers = spec.layout;
  const stage = !compact;

  return (
    <ChartCard
      context={context ?? spec.venue_label ?? "Seat value by section"}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {!compact && (
          <div className="flex items-center justify-between mb-2 gap-2">
            <div
              style={{
                fontSize: "clamp(11px, 1.25cqi, 13px)",
                color: BRAND.slate700,
                fontWeight: 700,
              }}
            >
              Sightline-to-price value by section
            </div>
            {spec.best_section && (
              <CalloutPill bg={ACCENT_SOFT.okay} fg={ACCENT_FG.okay}>
                Sweet spot · {spec.best_section}
              </CalloutPill>
            )}
          </div>
        )}

        <div
          className="flex-1 flex flex-col min-h-0"
          style={{ rowGap: compact ? 4 : 8, justifyContent: "center" }}
        >
          {stage && (
            <div
              style={{
                background: BRAND.slate900,
                color: "white",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.18em",
                textAlign: "center",
                padding: "4px 0",
                borderRadius: 4,
                textTransform: "uppercase",
              }}
            >
              Stage
            </div>
          )}
          {tiers.map((tier) => {
            const sections = spec.sections.filter((s) => s.tier === tier);
            if (sections.length === 0) return null;
            return (
              <div key={tier} className="flex items-stretch" style={{ gap: 6 }}>
                {!compact && (
                  <div
                    style={{
                      width: 64,
                      flexShrink: 0,
                      fontSize: "clamp(9px, 1cqi, 11px)",
                      color: BRAND.slate700,
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {TIER_LABEL[tier]}
                  </div>
                )}
                <div
                  className="flex-1 grid"
                  style={{
                    gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))`,
                    gap: 4,
                  }}
                >
                  {sections.map((s, j) => {
                    const tone = valueColor(s.value_score);
                    const isBest = spec.best_section === s.name;
                    const isHovered = hovered === s.name;
                    return (
                      <div
                        key={j}
                        onMouseEnter={() => setHovered(s.name)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() =>
                          setHovered((cur) => (cur === s.name ? null : s.name))
                        }
                        onTouchStart={() =>
                          setHovered((cur) => (cur === s.name ? null : s.name))
                        }
                        className="relative flex flex-col items-center justify-center"
                        style={{
                          background: tone.bg,
                          border: isBest
                            ? `2px solid ${tone.fg}`
                            : `1px solid transparent`,
                          borderRadius: 6,
                          padding: compact ? "6px 4px" : "8px 6px",
                          minHeight: compact ? 32 : 44,
                          cursor: compact ? "pointer" : "default",
                        }}
                      >
                        {!compact && (
                          <div
                            style={{
                              fontSize: "clamp(9px, 1cqi, 11px)",
                              fontWeight: 700,
                              color: tone.fg,
                              textAlign: "center",
                              lineHeight: 1.15,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "100%",
                            }}
                            title={s.name}
                          >
                            {s.name}
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: compact
                              ? "clamp(10px, 1.15cqi, 12px)"
                              : "clamp(11px, 1.3cqi, 14px)",
                            fontWeight: 800,
                            color: BRAND.slate950,
                            marginTop: compact ? 0 : 2,
                          }}
                        >
                          {symbol}
                          {s.price}
                        </div>
                        {compact && isHovered && (
                          <div
                            className="absolute z-10 pointer-events-none"
                            style={{
                              bottom: "100%",
                              left: "50%",
                              transform: "translateX(-50%)",
                              marginBottom: 4,
                              background: BRAND.slate900,
                              color: "white",
                              padding: "4px 8px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {!compact && (
          <div
            className="mt-3 flex flex-wrap gap-2"
            style={{
              borderTop: `1px solid ${BRAND.slate100}`,
              paddingTop: 8,
            }}
          >
            {[80, 60, 40, 20].map((threshold) => {
              const tone = valueColor(threshold);
              return (
                <div
                  key={threshold}
                  className="flex items-center gap-1.5"
                  style={{
                    fontSize: "clamp(9px, 1cqi, 11px)",
                    color: BRAND.slate700,
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      background: tone.bg,
                      border: `1px solid ${tone.fg}`,
                    }}
                  />
                  {valueLabel(threshold)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ChartCard>
  );
}
