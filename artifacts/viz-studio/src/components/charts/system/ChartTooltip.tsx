import type { CSSProperties, ReactNode } from "react";
import { CHART_TOOLTIP_TOKENS, clampHorizontal } from "@/lib/chart-system";

interface Props {
  /**
   * Anchor x position in % of the plot area (0..100). When provided the
   * tooltip is auto-clamped at the left/right edges so it never spills out
   * of the plot — folds in #15's edge-clamp lesson.
   */
  anchorXPct?: number;
  /** Place above (default) or below the anchor. */
  placement?: "above" | "below";
  /** Distance in px from the anchor to the tooltip. */
  offset?: number;
  children: ReactNode;
  /** Extra positioning style. The tooltip is `position: absolute`. */
  style?: CSSProperties;
  className?: string;
}

/**
 * One shared tooltip surface for every chart. Slate-900 pill, white text,
 * rounded 8, weight 700. Owns the edge-clamp behavior so callers don't have
 * to re-derive it. Pointer events are disabled — hover state is owned by
 * the chart, not the tooltip.
 */
export function ChartTooltip({
  anchorXPct,
  placement = "above",
  offset = 8,
  children,
  style,
  className,
}: Props) {
  const clamp = anchorXPct !== undefined ? clampHorizontal(anchorXPct) : null;
  const placementStyle: CSSProperties =
    placement === "above"
      ? { bottom: `calc(100% + ${offset}px)` }
      : { top: `calc(100% + ${offset}px)` };

  return (
    <div
      className={`pointer-events-none ${className ?? ""}`}
      style={{
        position: "absolute",
        left: clamp?.left ?? "50%",
        transform: clamp?.transform ?? "translateX(-50%)",
        background: CHART_TOOLTIP_TOKENS.bg,
        color: CHART_TOOLTIP_TOKENS.fg,
        padding: `${CHART_TOOLTIP_TOKENS.paddingY}px ${CHART_TOOLTIP_TOKENS.paddingX}px`,
        borderRadius: CHART_TOOLTIP_TOKENS.radius,
        fontSize: CHART_TOOLTIP_TOKENS.fontSize,
        fontWeight: CHART_TOOLTIP_TOKENS.fontWeight,
        whiteSpace: "nowrap",
        zIndex: 30,
        ...placementStyle,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
