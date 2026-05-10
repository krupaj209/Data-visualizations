import { motion } from "framer-motion";
import { Check, Minus, Sparkles } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { ACCENT_FG, ACCENT_FILL, ACCENT_SOFT, BRAND } from "@/lib/brand";
import {
  type TicketAccessCell,
  type TicketAccessMatrixSpec,
} from "@/lib/chart-spec";

interface Props {
  spec: TicketAccessMatrixSpec;
  context?: string;
  compact?: boolean;
}

function fmtPrice(currency: string, price: number) {
  const sym =
    currency === "EUR" ? "€" : currency === "USD" ? "$" : currency === "GBP" ? "£" : "";
  if (sym) return `${sym}${price}`;
  return `${price} ${currency}`;
}

function cellGlyph(cell: TicketAccessCell, currency: string) {
  switch (cell.state) {
    case "included":
      return { icon: "check" as const, label: "" };
    case "excluded":
      return { icon: "minus" as const, label: "" };
    case "extra": {
      const price = cell.extra_price;
      const label =
        cell.label ?? (price != null ? `+${fmtPrice(currency, price)}` : "Extra");
      return { icon: "text" as const, label };
    }
    case "limited":
      return { icon: "text" as const, label: cell.label ?? "Limited" };
  }
}

const CELL_ACCENT: Record<
  TicketAccessCell["state"],
  "purps" | "candy" | "hola" | "okay" | "slate"
> = {
  included: "okay",
  extra: "candy",
  limited: "hola",
  excluded: "slate",
};

export function TicketAccessMatrixChart({
  spec,
  context,
  compact = false,
}: Props) {
  const { currency, tiers, features, insight } = spec;

  return (
    <ChartCard
      context={context ?? "Which tier unlocks what"}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Single overflow-x container so the matrix scrolls horizontally
            on narrow widths while the first column stays pinned via
            position: sticky on each row's first cell. */}
        <div
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowX: "auto",
            overflowY: "visible",
          }}
        >
        {/* Tier header row */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: `minmax(120px, 1.4fr) repeat(${tiers.length}, minmax(76px, 1fr))`,
            minWidth: 120 + tiers.length * 76,
            gap: compact ? 4 : 8,
            marginBottom: compact ? 6 : 10,
          }}
        >
          <div
            style={{
              position: "sticky",
              left: 0,
              background: "#fff",
              zIndex: 2,
            }}
          />
          {tiers.map((t, i) => {
            const accent = t.accent ?? (t.recommended ? "candy" : "purps");
            return (
              <div
                key={i}
                style={{
                  background: t.recommended ? ACCENT_SOFT[accent] : "transparent",
                  border: t.recommended
                    ? `1.5px solid ${ACCENT_FILL[accent]}`
                    : `1px solid ${BRAND.slate200}`,
                  borderRadius: 10,
                  padding: compact ? "4px 6px" : "6px 8px",
                  textAlign: "center",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: compact
                      ? "clamp(9px, 1.05cqi, 11px)"
                      : "clamp(10px, 1.15cqi, 12px)",
                    fontWeight: 800,
                    color: BRAND.slate950,
                    lineHeight: 1.15,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.name}
                </div>
                <div
                  style={{
                    fontSize: compact
                      ? "clamp(10px, 1.15cqi, 12px)"
                      : "clamp(11px, 1.3cqi, 14px)",
                    fontWeight: 800,
                    color: ACCENT_FG[accent],
                    marginTop: 2,
                  }}
                >
                  {fmtPrice(currency, t.price)}
                </div>
                {!compact && t.recommended && (
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      color: ACCENT_FG[accent],
                      textTransform: "uppercase",
                      marginTop: 2,
                    }}
                  >
                    Pick
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Feature rows */}
        <div
          className="flex flex-col"
          style={{
            gap: compact ? 2 : 4,
          }}
        >
          {features.map((f, fi) => (
            <div
              key={fi}
              className="grid items-center"
              style={{
                gridTemplateColumns: `minmax(120px, 1.4fr) repeat(${tiers.length}, minmax(76px, 1fr))`,
                minWidth: 120 + tiers.length * 76,
                gap: compact ? 4 : 8,
                paddingTop: compact ? 4 : 6,
                paddingBottom: compact ? 4 : 6,
                borderTop: `1px solid ${BRAND.slate100}`,
              }}
            >
              <div
                style={{
                  position: "sticky",
                  left: 0,
                  background: "#fff",
                  zIndex: 1,
                  paddingRight: 6,
                  fontSize: compact
                    ? "clamp(9px, 1.05cqi, 11px)"
                    : "clamp(10px, 1.15cqi, 12px)",
                  fontWeight: 700,
                  color: BRAND.slate900,
                  lineHeight: 1.2,
                  minWidth: 0,
                }}
              >
                {f.label}
              </div>
              {f.cells.map((cell, ti) => {
                const glyph = cellGlyph(cell, currency);
                const accent = CELL_ACCENT[cell.state];
                return (
                  <div
                    key={ti}
                    className="flex items-center justify-center"
                    style={{
                      color: ACCENT_FG[accent],
                    }}
                  >
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        duration: 0.3,
                        delay: 0.05 * (fi * tiers.length + ti),
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      style={{
                        display: "inline-flex",
                        minWidth: compact ? 16 : 20,
                        height: compact ? 16 : 20,
                        padding: glyph.icon === "text" ? "0 6px" : 0,
                        borderRadius: glyph.icon === "text" ? 999 : 999,
                        background: ACCENT_SOFT[accent],
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "clamp(9px, 1cqi, 11px)",
                        fontWeight: 800,
                      }}
                    >
                      {glyph.icon === "check" ? (
                        <Check size={compact ? 10 : 12} strokeWidth={3} />
                      ) : glyph.icon === "minus" ? (
                        <Minus size={compact ? 10 : 12} strokeWidth={3} />
                      ) : (
                        glyph.label
                      )}
                    </motion.span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        </div>

        {!compact && insight && (
          <div
            className="flex items-start gap-2"
            style={{ marginTop: 10, flexShrink: 0 }}
          >
            <Sparkles
              size={14}
              strokeWidth={2.5}
              style={{ color: BRAND.candy, marginTop: 1, flexShrink: 0 }}
            />
            <span
              style={{
                color: BRAND.slate900,
                fontSize: "clamp(10px, 1.1cqi, 12px)",
                fontWeight: 600,
                lineHeight: 1.3,
              }}
            >
              {insight}
            </span>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
