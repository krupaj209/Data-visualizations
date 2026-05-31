import { Keyboard } from "lucide-react";
import { BRAND } from "@/lib/brand";

interface Props {
  onDismiss: () => void;
}

/**
 * Floating hint that tells the writer they can use arrow-keys (or j/k) to
 * navigate between charts on the CE detail page. Dismisses on click or after
 * the user presses any key.
 */
export function KeyboardHintTooltip({ onDismiss }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDismiss}
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: BRAND.slate900,
        color: "white",
        borderRadius: 10,
        padding: "8px 14px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
        cursor: "pointer",
        userSelect: "none",
        zIndex: 999,
        whiteSpace: "nowrap",
      }}
    >
      <Keyboard size={15} style={{ flexShrink: 0 }} />
      <span>
        Use <kbd style={{ background: BRAND.slate700, borderRadius: 4, padding: "1px 5px" }}>↑</kbd>{" "}
        <kbd style={{ background: BRAND.slate700, borderRadius: 4, padding: "1px 5px" }}>↓</kbd> to
        navigate charts
      </span>
      <span style={{ marginLeft: 6, color: BRAND.slate500, fontSize: 11 }}>click to dismiss</span>
    </div>
  );
}
