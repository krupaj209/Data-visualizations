import { type ReactNode, type CSSProperties } from "react";
import { BRAND } from "@/lib/brand";

interface Props {
  active: boolean;
  dim: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  children: ReactNode;
  bg: string;
  fg: string;
  ariaLabel?: string;
  ariaPressed?: boolean;
  style?: CSSProperties;
  title?: string;
}

/**
 * Small, brand-token-aware button used for chips that drive selection state
 * on a chart. Active = selected/locked; dim = another sibling is selected and
 * this one should fade. Focus + hover share the same boxShadow ring so
 * pointer + keyboard read identically.
 */
export function ChipButton({
  active,
  dim,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  children,
  bg,
  fg,
  ariaLabel,
  ariaPressed,
  style,
  title,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      title={title}
      style={{
        background: bg,
        color: fg,
        border: active ? `1.5px solid ${fg}` : `1px solid ${fg}25`,
        opacity: dim ? 0.4 : 1,
        cursor: "pointer",
        font: "inherit",
        textAlign: "left",
        outline: "none",
        boxShadow: active ? `0 0 0 3px ${BRAND.purpsSoft}` : undefined,
        transition:
          "opacity .15s ease, box-shadow .15s ease, border-color .15s ease",
        ...style,
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {children}
    </button>
  );
}
