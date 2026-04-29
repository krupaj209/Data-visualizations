import { useCallback, useEffect, useState } from "react";

/**
 * Click-to-lock selection primitive used across the Accademia interactive
 * charts. Selecting an item locks it; selecting it again or pressing Esc
 * clears the lock. `setHover` provides the soft "what would I select" state
 * that pointer + keyboard focus share, so hover and focus produce the same
 * visual treatment.
 *
 * `effective` is what the chart should actually render: the locked value if
 * present, otherwise the hover value. This keeps every consumer's render
 * branching to a single field.
 */
export function useLockable<T>() {
  const [locked, setLocked] = useState<T | null>(null);
  const [hover, setHover] = useState<T | null>(null);

  const toggle = useCallback((v: T, eq?: (a: T, b: T) => boolean) => {
    setLocked((prev) => {
      if (prev === null) return v;
      const isSame = eq ? eq(prev, v) : prev === v;
      return isSame ? null : v;
    });
  }, []);

  const clear = useCallback(() => setLocked(null), []);

  useEffect(() => {
    if (locked === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLocked(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked]);

  const effective = (locked ?? hover) as T | null;
  return { locked, hover, effective, setHover, toggle, clear };
}
