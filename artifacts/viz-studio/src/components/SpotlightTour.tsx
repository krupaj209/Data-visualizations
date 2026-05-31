import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, BookOpen, ChevronRight, Keyboard, X } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { KEYBOARD_SHORTCUTS } from "@/lib/keyboard-shortcuts";

const TOUR_KEY = "viz-studio:tour-completed";
const TOUR_VERSION = "1";

export function useTourCompleted() {
  try {
    return window.localStorage.getItem(TOUR_KEY) === TOUR_VERSION;
  } catch {
    return true;
  }
}

export function resetTour() {
  try {
    window.localStorage.removeItem(TOUR_KEY);
  } catch { /* ignore */ }
}

function markTourCompleted() {
  try {
    window.localStorage.setItem(TOUR_KEY, TOUR_VERSION);
  } catch { /* ignore */ }
}

interface Step {
  id: string;
  targetSelector?: string;
  title: string;
  body: React.ReactNode;
  padding?: number;
}

const STEPS: Step[] = [
  {
    id: "library",
    targetSelector: "[data-tour='ce-library']",
    title: "Your chart library",
    body: "Each card is an attraction — a CE. Click one to start reviewing its AI-generated chart deck.",
    padding: 12,
  },
  {
    id: "nav",
    targetSelector: "[data-tour='main-nav']",
    title: "Top navigation",
    body: "Guide, Style Guide, and Question Bank live up here whenever you need a reference.",
    padding: 8,
  },
  {
    id: "create",
    targetSelector: "[data-tour='create-panel']",
    title: "Create a CE",
    body: "Type the name of any attraction and let the AI build its first chart deck automatically.",
    padding: 16,
  },
  {
    id: "ce-detail",
    targetSelector: undefined,
    title: "Inside a CE",
    body: (
      <span>
        Once inside, you'll review charts, approve facts, and copy embed links straight into the CMS.
        Each chart card shows a <strong>confidence pill</strong>, verifier notes, and a fact table.
      </span>
    ),
    padding: 0,
  },
  {
    id: "shortcuts",
    targetSelector: undefined,
    title: "Keyboard shortcuts make review fast",
    body: null,
    padding: 0,
  },
];

interface Rect { top: number; left: number; width: number; height: number }

function getTargetRect(selector: string, padding: number): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top - padding,
    left: r.left - padding,
    width: r.width + padding * 2,
    height: r.height + padding * 2,
  };
}

export function SpotlightTour({ forceOpen = false, onClose }: { forceOpen?: boolean; onClose?: () => void }) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const rafRef = useRef<number>(0);

  const currentStep = STEPS[step];

  const updateRect = useCallback(() => {
    if (!currentStep?.targetSelector) { setRect(null); return; }
    const r = getTargetRect(currentStep.targetSelector, currentStep.padding ?? 8);
    setRect(r);
  }, [currentStep]);

  useEffect(() => {
    if (!active) return;
    updateRect();
    function onResize() { updateRect(); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, updateRect]);

  useEffect(() => {
    if (forceOpen) {
      setStep(0);
      setActive(true);
      return;
    }
    try {
      if (window.localStorage.getItem(TOUR_KEY) === TOUR_VERSION) return;
    } catch { /* ignore */ }
    const t = setTimeout(() => { setActive(true); }, 600);
    return () => clearTimeout(t);
  }, [forceOpen]);

  function next() {
    if (step < STEPS.length - 1) { setStep((s) => s + 1); setRect(null); }
    else finish();
  }

  function finish() {
    setActive(false);
    markTourCompleted();
    onClose?.();
  }

  function skip() {
    setActive(false);
    markTourCompleted();
    onClose?.();
  }

  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") skip();
      if (e.key === "ArrowRight" || e.key === "Enter") next();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  if (!active) return null;

  const isLast = step === STEPS.length - 1;
  const isCenterStep = !currentStep.targetSelector;
  const clipPath = rect
    ? `polygon(
        0% 0%, 100% 0%, 100% 100%, 0% 100%,
        0% ${rect.top}px,
        ${rect.left}px ${rect.top}px,
        ${rect.left}px ${rect.top + rect.height}px,
        ${rect.left + rect.width}px ${rect.top + rect.height}px,
        ${rect.left + rect.width}px ${rect.top}px,
        0% ${rect.top}px
      )`
    : undefined;

  const cardTop = rect
    ? Math.min(
        rect.top + rect.height + 16,
        window.innerHeight - 240,
      )
    : undefined;

  const cardLeft = rect
    ? Math.max(16, Math.min(rect.left, window.innerWidth - 380))
    : undefined;

  return (
    <AnimatePresence>
      {active && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 8000,
              background: "rgba(15,15,16,0.68)",
              backdropFilter: "blur(1.5px)",
              clipPath,
              pointerEvents: "all",
            }}
            onClick={skip}
          />

          {isCenterStep && (
            <motion.div
              key="center-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 8000,
                background: "rgba(15,15,16,0.68)",
                backdropFilter: "blur(1.5px)",
              }}
            />
          )}

          <motion.div
            key={`card-${step}`}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            style={{
              position: "fixed",
              zIndex: 8100,
              top: isCenterStep ? "50%" : cardTop,
              left: isCenterStep ? "50%" : cardLeft,
              transform: isCenterStep ? "translate(-50%, -50%)" : undefined,
              width: 360,
              background: "white",
              borderRadius: 20,
              padding: "22px 24px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)",
            }}
          >
            <button
              type="button"
              onClick={skip}
              aria-label="Skip tour"
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                background: BRAND.slate100,
                border: "none",
                borderRadius: "50%",
                width: 26,
                height: 26,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: BRAND.slate500,
              }}
            >
              <X size={13} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{
                background: BRAND.purpsSoft,
                color: BRAND.purps,
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {step < 3 ? <BookOpen size={15} strokeWidth={2.5} /> : step === 3 ? <ArrowRight size={15} strokeWidth={2.5} /> : <Keyboard size={15} strokeWidth={2.5} />}
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, color: BRAND.purps, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {step + 1} of {STEPS.length}
              </span>
            </div>

            <h3 style={{ fontSize: 17, fontWeight: 800, color: BRAND.slate950, letterSpacing: "-0.01em", marginBottom: 8 }}>
              {currentStep.title}
            </h3>

            {currentStep.id === "shortcuts" ? (
              <div>
                <p style={{ fontSize: 13, color: BRAND.slate700, fontWeight: 500, lineHeight: 1.5, marginBottom: 14 }}>
                  We'll remind you as you go — for now, here's the full set:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {KEYBOARD_SHORTCUTS.map((s, i) => (
                    <motion.div
                      key={s.key}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07, duration: 0.2 }}
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <TourKeyCap>{s.key}</TourKeyCap>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: BRAND.slate900 }}>{s.label}</span>
                      <span style={{ fontSize: 11.5, color: BRAND.slate500, fontWeight: 500 }}>— {s.description}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: BRAND.slate700, fontWeight: 500, lineHeight: 1.55, marginBottom: 4 }}>
                {currentStep.body}
              </p>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
              <div style={{ display: "flex", gap: 5 }}>
                {STEPS.map((_, i) => (
                  <div key={i} style={{
                    width: i === step ? 18 : 6,
                    height: 6,
                    borderRadius: 999,
                    background: i === step ? BRAND.purps : BRAND.slate200,
                    transition: "width 200ms, background 200ms",
                  }} />
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  onClick={skip}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: BRAND.slate500,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "4px 0",
                  }}
                >
                  Skip tour
                </button>
                <button
                  type="button"
                  onClick={next}
                  style={{
                    background: BRAND.purps,
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    padding: "9px 16px",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  {isLast ? "Done" : "Next"}
                  {!isLast && <ChevronRight size={14} strokeWidth={2.5} />}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function TourKeyCap({ children }: { children: React.ReactNode }) {
  return (
    <motion.span
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 0.45, delay: 0.3, ease: "easeOut" }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 26,
        height: 26,
        borderRadius: 6,
        border: `1px solid ${BRAND.slate200}`,
        background: BRAND.slate50,
        color: BRAND.slate950,
        fontSize: 13,
        fontWeight: 800,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        boxShadow: "0 2px 0 rgba(0,0,0,0.08)",
        flexShrink: 0,
      }}
    >
      {children}
    </motion.span>
  );
}
