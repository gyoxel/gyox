"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/** The bottom bar's tabs, in order: swipe left → next, right → previous. */
const TABS = ["/", "/budget", "/credits", "/menu"];
const PAGE_ID = "page-root";
const LOCK_PX = 12; // movement before deciding horizontal vs vertical
const GO_PX = 80; // drag past this (or a quick flick) switches tab

/**
 * Swipe between Accueil / Dépenses / Crédits / Menu: the page follows the
 * finger, and past a threshold slides out while the next tab slides in.
 * Areas with their own horizontal swipe (month switchers, horizontal
 * scrollers) are left alone.
 */
export function TabSwipe() {
  const pathname = usePathname();
  const router = useRouter();
  const enteringFrom = useRef<number>(0); // -1 / 1: the new tab slides in from that side

  // A tab just opened by swipe slides in.
  useEffect(() => {
    const page = document.getElementById(PAGE_ID);
    const from = enteringFrom.current;
    if (!page || !from) return;
    enteringFrom.current = 0;
    page
      .animate(
        [
          { transform: `translateX(${from * 35}%)`, opacity: 0.4 },
          { transform: "translateX(0)", opacity: 1 },
        ],
        { duration: 220, easing: "cubic-bezier(0.2, 0, 0, 1)" },
      )
      .finished.catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const index = TABS.indexOf(pathname);
    if (index < 0) return;
    const page = document.getElementById(PAGE_ID);
    if (!page) return;

    let start: { x: number; y: number; t: number } | null = null;
    let mode: "undecided" | "horizontal" | "vertical" = "undecided";
    let dx = 0;

    const blocked = (target: EventTarget | null) => {
      for (let el = target as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
        if (el.dataset?.noTabSwipe !== undefined) return true;
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
        const ox = getComputedStyle(el).overflowX;
        if ((ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth + 1) return true;
      }
      return false;
    };

    const neighbour = (dir: number) => TABS[index + dir] ?? null; // dir 1 = next (swipe left)

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || blocked(e.target) || document.querySelector("[role=dialog]")) {
        start = null;
        return;
      }
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
      mode = "undecided";
      dx = 0;
    };

    const onMove = (e: TouchEvent) => {
      if (!start) return;
      const mx = e.touches[0].clientX - start.x;
      const my = e.touches[0].clientY - start.y;
      if (mode === "undecided") {
        if (Math.abs(mx) < LOCK_PX && Math.abs(my) < LOCK_PX) return;
        mode = Math.abs(mx) > Math.abs(my) * 1.2 ? "horizontal" : "vertical";
      }
      if (mode !== "horizontal") return;
      e.preventDefault(); // the page doesn't scroll while it's being swiped
      dx = mx;
      const target = neighbour(mx < 0 ? 1 : -1);
      // Rubber band at the ends (no tab before Accueil / after Menu).
      const shown = target ? mx * 0.6 : mx * 0.15;
      page.style.transform = `translateX(${shown}px)`;
      page.style.opacity = String(1 - Math.min(0.35, Math.abs(shown) / 900));
    };

    const onEnd = () => {
      if (!start || mode !== "horizontal") {
        start = null;
        return;
      }
      const fast = Math.abs(dx) > 40 && Date.now() - start.t < 250;
      const dir = dx < 0 ? 1 : -1;
      const target = neighbour(dir);
      start = null;
      if (target && (Math.abs(dx) > GO_PX || fast)) {
        page
          .animate([{ transform: page.style.transform || "translateX(0)" }, { transform: `translateX(${-dir * 100}%)`, opacity: 0 }], {
            duration: 140,
            easing: "ease-in",
          })
          .finished.then(() => {
            page.style.transform = "";
            page.style.opacity = "";
            enteringFrom.current = dir;
            router.push(target);
          })
          .catch(() => {});
        return;
      }
      // Not far enough: back in place.
      const from = page.style.transform;
      page.style.transform = "";
      page.style.opacity = "";
      if (from) {
        page.animate([{ transform: from }, { transform: "translateX(0)" }], { duration: 180, easing: "ease-out" });
      }
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", onEnd);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
      page.style.transform = "";
      page.style.opacity = "";
    };
  }, [pathname, router]);

  return null;
}
