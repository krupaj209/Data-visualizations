import type { CSSProperties, ReactNode } from "react";
import { CALLOUT_PILL } from "@/lib/chart-system";

interface Props {
  /** Background color (use the soft companion of the accent). */
  bg: string;
  /** Foreground (text) color. */
  fg: string;
  /** Optional 1.5px border in the foreground color. */
  bordered?: boolean;
  /** Renders as a `motion.div` with absolute positioning when used as a placement wrapper instead. */
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

/**
 * One pill shape for every "Busiest" / "Sweet spot" / "Best weather" /
 * "Peak" / "Quietest" callout across the system. Always pill-rounded
 * (radius 999), shared padding (4px / 10px), shared type (callout token).
 *
 * Use this whenever you need an inline pill. For pills that need to
 * animate position (e.g. SeasonalCurve), use the CALLOUT_PILL tokens
 * directly inside a motion wrapper so the visual rhyme is preserved.
 */
export function CalloutPill({
  bg,
  fg,
  bordered = false,
  children,
  style,
  className,
}: Props) {
  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        background: bg,
        color: fg,
        border: bordered ? `1.5px solid ${fg}` : "none",
        padding: `${CALLOUT_PILL.paddingY}px ${CALLOUT_PILL.paddingX}px`,
        borderRadius: CALLOUT_PILL.radius,
        fontSize: CALLOUT_PILL.fontSize,
        fontWeight: CALLOUT_PILL.fontWeight,
        whiteSpace: "nowrap",
        lineHeight: 1.15,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
