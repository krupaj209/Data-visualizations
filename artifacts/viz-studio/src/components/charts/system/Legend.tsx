import type { CSSProperties, ReactNode } from "react";
import { CHART_TYPE } from "@/lib/chart-system";
import { BRAND } from "@/lib/brand";

interface LegendProps {
  children: ReactNode;
  /** When true, renders a slate-100 top border + 8px padding above (default false). */
  withDivider?: boolean;
  /** Override the default `marginTop: 8`. */
  style?: CSSProperties;
  className?: string;
}

/**
 * Horizontal legend rail. Charts that already sit above a divider line
 * (e.g. between bars and category labels) should pass `withDivider={false}`
 * so we don't double-stripe.
 */
export function Legend({
  children,
  withDivider = false,
  style,
  className,
}: LegendProps) {
  return (
    <div
      className={`flex flex-wrap gap-x-3 gap-y-1.5 ${className ?? ""}`}
      style={{
        marginTop: withDivider ? 0 : 8,
        borderTop: withDivider ? `1px solid ${BRAND.slate100}` : "none",
        paddingTop: withDivider ? 8 : 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface SwatchProps {
  color: string;
  shape?: "square" | "dot" | "bar";
  size?: number;
}

/**
 * Legend marker. Default is a 10×10 square with 3px corner radius — matches
 * the rhythm of a small "filled cell" you'd see inside a heatmap or bar.
 * Use `shape="dot"` for line/dot charts, `shape="bar"` for stacked-bar
 * legends.
 */
export function LegendSwatch({
  color,
  shape = "square",
  size = 10,
}: SwatchProps) {
  const radius = shape === "dot" ? "50%" : 3;
  const width = shape === "bar" ? size * 1.8 : size;
  return (
    <span
      style={{
        display: "inline-block",
        width,
        height: size,
        borderRadius: radius,
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

interface LegendItemProps {
  color: string;
  label: string;
  shape?: "square" | "dot" | "bar";
  size?: number;
  /** When true, label uses slate-900 instead of slate-700. */
  active?: boolean;
}

export function LegendItem({
  color,
  label,
  shape,
  size,
  active = false,
}: LegendItemProps) {
  return (
    <div className="flex items-center gap-1.5">
      <LegendSwatch color={color} shape={shape} size={size} />
      <span
        style={{
          color: active ? BRAND.slate900 : CHART_TYPE.legend.color,
          fontSize: CHART_TYPE.legend.fontSize,
          fontWeight: CHART_TYPE.legend.fontWeight,
        }}
      >
        {label}
      </span>
    </div>
  );
}
