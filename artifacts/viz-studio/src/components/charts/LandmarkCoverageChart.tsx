import { motion } from "framer-motion";
import { Check, Eye, Footprints, Minus, Sparkles } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { ACCENT_FG, ACCENT_FILL, ACCENT_SOFT, BRAND } from "@/lib/brand";
import { CALLOUT_PILL } from "@/lib/chart-system";
import {
  type LandmarkCoverageCell,
  type LandmarkCoverageSpec,
} from "@/lib/chart-spec";

interface Props {
  spec: LandmarkCoverageSpec;
  context?: string;
  compact?: boolean;
}

const COVERAGE_META: Record<
  LandmarkCoverageCell,
  {
    label: string;
    Icon: typeof Check;
    accent: "okay" | "purps" | "hola" | "slate";
  }
> = {
  covered: { label: "Stops here", Icon: Check, accent: "okay" },
  near: { label: "Short walk", Icon: Footprints, accent: "purps" },
  view_only: { label: "View only", Icon: Eye, accent: "hola" },
  none: { label: "Not on route", Icon: Minus, accent: "slate" },
};

export function LandmarkCoverageChart({
  spec,
  context,
  compact = false,
}: Props) {
  const { route_label, routes, landmarks, best_for, callout } = spec;

  return (
    <ChartCard
      context={context ?? "Which routes cover which landmarks"}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {!compact && route_label && (
          <div
            style={{
              fontSize: "clamp(11px, 1.3cqi, 14px)",
              fontWeight: 800,
              color: BRAND.slate950,
              marginBottom: 8,
            }}
          >
            {route_label}
          </div>
        )}

        {/* Single overflow-x container so the matrix scrolls horizontally
            on narrow widths while the first column stays pinned. */}
        <div
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowX: "auto",
            overflowY: "visible",
          }}
        >
        {/* Route header row */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: `minmax(140px, 1.6fr) repeat(${routes.length}, minmax(72px, 1fr))`,
            minWidth: 140 + routes.length * 72,
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
          {routes.map((r, i) => {
            const accent = r.accent ?? (r.recommended ? "candy" : "purps");
            return (
              <div
                key={i}
                style={{
                  background: r.recommended ? ACCENT_SOFT[accent] : "transparent",
                  border: r.recommended
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
                  {r.name}
                </div>
                {!compact && r.recommended && (
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

        {/* Landmark rows */}
        <div
          className="flex flex-col"
          style={{ gap: compact ? 2 : 4 }}
        >
          {landmarks.map((lm, li) => (
            <div
              key={li}
              className="grid items-center"
              style={{
                gridTemplateColumns: `minmax(140px, 1.6fr) repeat(${routes.length}, minmax(72px, 1fr))`,
                minWidth: 140 + routes.length * 72,
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
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: compact
                      ? "clamp(9px, 1.05cqi, 11px)"
                      : "clamp(10px, 1.15cqi, 12px)",
                    fontWeight: lm.kind === "icon" ? 800 : 700,
                    color: BRAND.slate950,
                    lineHeight: 1.2,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {lm.kind === "icon" && <span aria-hidden>★</span>}
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {lm.name}
                  </span>
                </div>
                {!compact && lm.note && (
                  <div
                    style={{
                      fontSize: "clamp(9px, 1cqi, 11px)",
                      fontWeight: 600,
                      color: BRAND.slate700,
                      marginTop: 1,
                      lineHeight: 1.3,
                    }}
                  >
                    {lm.note}
                  </div>
                )}
              </div>
              {lm.coverage.map((c, ri) => {
                const meta = COVERAGE_META[c];
                const Icon = meta.Icon;
                return (
                  <div
                    key={ri}
                    className="flex items-center justify-center"
                    title={meta.label}
                  >
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        duration: 0.3,
                        delay: 0.04 * (li * routes.length + ri),
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      style={{
                        display: "inline-flex",
                        width: compact ? 18 : 22,
                        height: compact ? 18 : 22,
                        borderRadius: 999,
                        background: ACCENT_SOFT[meta.accent],
                        color: ACCENT_FG[meta.accent],
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={compact ? 10 : 12} strokeWidth={2.8} />
                    </motion.span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        </div>

        {!compact && (
          <div
            className="flex flex-wrap items-center justify-center"
            style={{ gap: 8, marginTop: 10 }}
          >
            {(["covered", "near", "view_only", "none"] as const).map((k) => {
              const meta = COVERAGE_META[k];
              const Icon = meta.Icon;
              return (
                <div
                  key={k}
                  className="flex items-center gap-1.5"
                  style={{ minWidth: 0 }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 999,
                      background: ACCENT_SOFT[meta.accent],
                      color: ACCENT_FG[meta.accent],
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={9} strokeWidth={3} />
                  </span>
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
            })}
          </div>
        )}

        {!compact && (best_for?.length || callout) && (
          <div
            className="flex flex-col items-center"
            style={{ marginTop: 8, gap: 6, flexShrink: 0 }}
          >
            {best_for && best_for.length > 0 && (
              <div className="flex flex-wrap justify-center" style={{ gap: 6 }}>
                {best_for.map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      background: BRAND.slate100,
                      color: BRAND.slate900,
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: "clamp(9px, 1cqi, 11px)",
                      fontWeight: 700,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {callout && (
              <div
                className="flex items-start gap-2"
                style={{ flexShrink: 0 }}
              >
                <Sparkles
                  size={14}
                  strokeWidth={2.5}
                  style={{ color: BRAND.candy, marginTop: 1, flexShrink: 0 }}
                />
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
        )}
      </div>
    </ChartCard>
  );
}
