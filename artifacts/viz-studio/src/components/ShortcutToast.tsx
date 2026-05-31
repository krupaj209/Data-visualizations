import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BRAND } from "@/lib/brand";
import { KEYBOARD_SHORTCUTS } from "@/lib/keyboard-shortcuts";

const DISMISSED_KEY = "viz-studio:shortcut-toast-dismissed";

export function ShortcutToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISSED_KEY) === "1") return;
    } catch {
      return;
    }
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => dismiss(), 6000);
    return () => clearTimeout(t);
  }, [visible]);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch { /* ignore */ }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
          onClick={dismiss}
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            zIndex: 9900,
            background: BRAND.slate950,
            color: "white",
            borderRadius: 16,
            padding: "14px 18px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.28)",
            cursor: "pointer",
            maxWidth: 340,
            userSelect: "none",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
            Keyboard shortcuts
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {KEYBOARD_SHORTCUTS.map((s) => (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + KEYBOARD_SHORTCUTS.indexOf(s) * 0.06, duration: 0.22 }}
                style={{ display: "flex", alignItems: "center", gap: 7 }}
              >
                <ToastKeyCap>{s.key}</ToastKeyCap>
                <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{s.label}</span>
              </motion.div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 10.5, color: "rgba(255,255,255,0.35)" }}>
            Click to dismiss · won't show again
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ToastKeyCap({ children }: { children: React.ReactNode }) {
  return (
    <motion.span
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 26,
        height: 26,
        borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.2)",
        background: "rgba(255,255,255,0.1)",
        color: "white",
        fontSize: 13,
        fontWeight: 800,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        boxShadow: "0 2px 0 rgba(0,0,0,0.3)",
        flexShrink: 0,
      }}
    >
      {children}
    </motion.span>
  );
}
