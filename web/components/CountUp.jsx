'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Counts up to a number once it scrolls into view.
 *
 * Accepts values like "260+", "100%" or "9" and animates only the numeric
 * part, preserving any prefix or suffix. The final value is what renders on
 * the server and what a reduced-motion visitor sees, so the real figure is
 * always in the HTML.
 */
export default function CountUp({ value, duration = 1500 }) {
  const ref = useRef(null);
  const [text, setText] = useState(value);

  useEffect(() => {
    const el = ref.current;
    const match = String(value).match(/^(\D*)([\d.]+)(\D*)$/);
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!el || !match || reduced || typeof IntersectionObserver === 'undefined') return undefined;

    const [, prefix, numStr, suffix] = match;
    const target = parseFloat(numStr);
    const decimals = (numStr.split('.')[1] || '').length;
    let raf;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();

        const start = performance.now();
        const tick = (now) => {
          const t = Math.min((now - start) / duration, 1);
          // ease-out cubic, so it decelerates into the final value
          const eased = 1 - Math.pow(1 - t, 3);
          setText(`${prefix}${(target * eased).toFixed(decimals)}${suffix}`);
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );

    io.observe(el);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return <span ref={ref}>{text}</span>;
}
