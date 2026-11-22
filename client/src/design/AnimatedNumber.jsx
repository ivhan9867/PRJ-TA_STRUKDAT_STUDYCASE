import { useEffect, useRef, useState } from 'react';

/**
 * Menampilkan angka dengan transisi hitung halus 400 ms (01_DESIGN_SYSTEM.md bagian 7).
 * Menghormati prefers-reduced-motion.
 */
export function AnimatedNumber({ value = 0, suffix = '', durationMs = 400 }) {
  const [display, setDisplay] = useState(value);
  const currentRef = useRef(value);

  useEffect(() => {
    const target = Number(value) || 0;
    const from = currentRef.current;
    if (from === target) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reducedMotion) {
      currentRef.current = target;
      setDisplay(target);
      return;
    }

    const start = performance.now();
    let rafId = null;

    function tick(now) {
      const t = Math.min(1, (now - start) / durationMs);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      const nextVal = Math.round(from + (target - from) * eased);
      currentRef.current = nextVal;
      setDisplay(nextVal);
      if (t < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        currentRef.current = target;
        setDisplay(target);
      }
    }

    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [value, durationMs]);

  return (
    <>
      {display}
      {suffix}
    </>
  );
}
