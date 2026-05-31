import { useEffect, useRef, useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { BRAND } from "@/lib/brand";

interface HelpPopoverProps {
  children?: React.ReactNode;
  content?: string;
  label?: string;
  maxWidth?: number;
  side?: "top" | "bottom" | "auto";
}

export function HelpPopover({ children, content, maxWidth = 320, side = "auto" }: HelpPopoverProps) {
  const body = children ?? content;
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ top: number; left: number; openUp: boolean }>({
    top: 0,
    left: 0,
    openUp: false,
  });

  function computePlacement() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const popW = Math.min(maxWidth, vw - 24);
    const openUp = side === "top" || (side === "auto" && rect.bottom + 220 > vh && rect.top > 220);
    let left = rect.left;
    if (left + popW > vw - 12) left = vw - popW - 12;
    if (left < 12) left = 12;
    const top = openUp ? rect.top - 8 : rect.bottom + 8;
    setPlacement({ top, left, openUp });
  }

  function toggle() {
    if (!open) computePlacement();
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClickOutside(e: MouseEvent) {
      if (
        popRef.current &&
        !popRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        ref={btnRef}
        type="button"
        aria-label="Help"
        onClick={toggle}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: `1px solid ${BRAND.slate200}`,
          background: open ? BRAND.purpsSoft : "white",
          color: open ? BRAND.purps : BRAND.slate500,
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
          transition: "background 120ms, color 120ms, border-color 120ms",
        }}
      >
        <HelpCircle size={11} strokeWidth={2} />
      </button>

      {open && (
        <div
          ref={popRef}
          role="tooltip"
          style={{
            position: "fixed",
            top: placement.openUp ? undefined : placement.top,
            bottom: placement.openUp ? `calc(100vh - ${placement.top}px)` : undefined,
            left: placement.left,
            zIndex: 9999,
            width: Math.min(maxWidth, window.innerWidth - 24),
            background: BRAND.slate950,
            color: "white",
            borderRadius: 12,
            padding: "10px 13px",
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 1.55,
            boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
            pointerEvents: "auto",
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 7,
              right: 8,
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
              padding: 2,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <X size={10} />
          </button>
          <div style={{ paddingRight: 14 }}>{body}</div>
        </div>
      )}
    </span>
  );
}

export function KeyCap({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 20,
        height: 20,
        padding: "0 5px",
        borderRadius: 4,
        border: `1px solid ${BRAND.slate300}`,
        background: BRAND.slate50,
        color: BRAND.slate700,
        fontSize: 11,
        fontWeight: 800,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        boxShadow: "0 1px 0 0 rgba(0,0,0,0.12)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
