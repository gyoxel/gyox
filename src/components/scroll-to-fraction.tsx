"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * A sideways-scrolling box that opens with `fraction` (0-1) of its content
 * a third of the way in, e.g. a timeline opening on the current month.
 */
export function ScrollToFraction({ fraction, children }: { fraction: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft = Math.max(0, fraction * el.scrollWidth - el.clientWidth / 3);
  }, [fraction]);
  return (
    <div ref={ref} className="overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
  );
}
