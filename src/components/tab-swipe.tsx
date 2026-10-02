"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/** The bottom bar's tabs, in order: swipe left → next, right → previous. */
const TABS = ["/", "/budget", "/credits", "/menu"];
const PAGE_ID = "page-root";
const LOCK_PX = 12; // movement before deciding horizontal vs vertical
const GO_PX = 70; // drag past this (or a quick flick) switches tab
const SLIDE_MS = 200;

/** Last seen look of each tab (its page's HTML), shown next to the current
 *  page while swiping so the neighbour is already there — no blank. */
const snapshots = new Map<string, string>();

function snapshotCurrent(path: string) {
  const page = document.getElementById(PAGE_ID);
  if (page && TABS.includes(path)) snapshots.set(path, page.innerHTML);
}

/** Loads the tabs never seen yet in a hidden frame, once, to snapshot them. */
let preloading = false;
function preloadSnapshots() {
  if (preloading || window.self !== window.top) return;
  preloading = true;
  const missing = TABS.filter((t) => !snapshots.has(t));
  const next = () => {
    const path = missing.shift();
    if (!path) return;
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.style.cssText = "position:fixed;left:-9999px;top:0;width:390px;height:844px;border:0;visibility:hidden;";
    frame.src = path;
    frame.onload = () => {
      setTimeout(() => {
        try {
          const html = frame.contentDocument?.getElementById(PAGE_ID)?.innerHTML;
          if (html && !snapshots.has(path)) snapshots.set(path, html);
        } catch {
          // not readable: that tab simply has no preview yet
        }
        frame.remove();
        next();
      }, 900);
    };
    document.body.appendChild(frame);
  };
  next();
}

/**
 * Swipe between Accueil / Dépenses / Crédits / Menu like a carousel: the
 * page follows the finger with the neighbouring tab right beside it; let
 * go past the threshold and the neighbour slides in and becomes the page.
 * Areas with their own horizontal swipe (month switchers, horizontal
 * scrollers) are left alone.
 */
export function TabSwipe() {
  const pathname = usePathname();
  const router = useRouter();
  const preview = useRef<HTMLDivElement | null>(null);
  const navigating = useRef(false);

  // The new tab has rendered: drop the preview that stood in for it — once
  // the real content is there, not the loading skeleton.
  useLayoutEffect(() => {
    const page = document.getElementById(PAGE_ID);
    const finish = () => {
      if (page && navigating.current) {
        navigating.current = false;
        page.style.transform = "";
        page.style.transition = "";
        window.scrollTo(0, 0);
      }
      preview.current?.remove();
      preview.current = null;
    };
    if (!page || !navigating.current || !page.querySelector('[aria-busy="true"]')) return finish();
    const observer = new MutationObserver(() => {
      if (!page.querySelector('[aria-busy="true"]')) {
        observer.disconnect();
        finish();
      }
    });
    observer.observe(page, { childList: true, subtree: true });
    const timer = setTimeout(() => {
      observer.disconnect();
      finish();
    }, 4000);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [pathname]);

  // Keep this tab's snapshot fresh, and fetch the others once.
  useEffect(() => {
    if (!TABS.includes(pathname)) return;
    const t1 = setTimeout(() => snapshotCurrent(pathname), 1200);
    const t2 = setTimeout(preloadSnapshots, 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      snapshotCurrent(pathname);
    };
  }, [pathname]);

  useEffect(() => {
    const index = TABS.indexOf(pathname);
    if (index < 0 || window.self !== window.top) return;
    const page = document.getElementById(PAGE_ID);
    if (!page) return;

    let start: { x: number; y: number; t: number } | null = null;
    let mode: "undecided" | "horizontal" | "vertical" = "undecided";
    let dx = 0;
    let shownDir = 0; // which neighbour the preview shows: 1 next, -1 previous

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

    /** The neighbour's snapshot, fixed beside the page. */
    const showPreview = (dir: number) => {
      if (shownDir === dir && preview.current) return;
      preview.current?.remove();
      preview.current = null;
      shownDir = dir;
      const path = neighbour(dir);
      if (!path) return;
      const box = document.createElement("div");
      box.setAttribute("aria-hidden", "true");
      box.className = "fixed inset-0 z-40 overflow-hidden bg-slate-50 dark:bg-slate-950 pointer-events-none";
      const inner = document.createElement("div");
      inner.className = "mx-auto flex w-full max-w-lg flex-col";
      inner.innerHTML = snapshots.get(path) ?? "";
      box.appendChild(inner);
      document.body.appendChild(box);
      preview.current = box;
    };

    const place = (offset: number) => {
      const w = window.innerWidth;
      page.style.transform = `translateX(${offset}px)`;
      if (preview.current) preview.current.style.transform = `translateX(${offset + shownDir * w}px)`;
    };

    const onStart = (e: TouchEvent) => {
      if (navigating.current || e.touches.length !== 1 || blocked(e.target) || document.querySelector("[role=dialog]")) {
        start = null;
        return;
      }
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
      mode = "undecided";
      dx = 0;
      shownDir = 0;
    };

    const onMove = (e: TouchEvent) => {
      if (!start) return;
      const mx = e.touches[0].clientX - start.x;
      const my = e.touches[0].clientY - start.y;
      if (mode === "undecided") {
        if (Math.abs(mx) < LOCK_PX && Math.abs(my) < LOCK_PX) return;
        mode = Math.abs(mx) > Math.abs(my) * 1.2 ? "horizontal" : "vertical";
        if (mode === "horizontal") page.style.transition = "none";
      }
      if (mode !== "horizontal") return;
      e.preventDefault(); // the page doesn't scroll while it's being swiped
      dx = mx;
      const dir = mx < 0 ? 1 : -1;
      if (neighbour(dir)) {
        showPreview(dir);
        place(mx);
      } else {
        // Rubber band at the ends (no tab before Accueil / after Menu).
        preview.current?.remove();
        preview.current = null;
        shownDir = 0;
        page.style.transform = `translateX(${mx * 0.15}px)`;
      }
    };

    const animateTo = (offset: number, done?: () => void) => {
      const w = window.innerWidth;
      const ease = `transform ${SLIDE_MS}ms cubic-bezier(0.2, 0, 0, 1)`;
      page.style.transition = ease;
      page.style.transform = `translateX(${offset}px)`;
      if (preview.current) {
        preview.current.style.transition = ease;
        preview.current.style.transform = `translateX(${offset + shownDir * w}px)`;
      }
      setTimeout(() => done?.(), SLIDE_MS);
    };

    const onEnd = () => {
      if (!start || mode !== "horizontal") {
        start = null;
        return;
      }
      const fast = Math.abs(dx) > 35 && Date.now() - start.t < 250;
      const dir = dx < 0 ? 1 : -1;
      const target = neighbour(dir);
      start = null;
      if (target && preview.current && (Math.abs(dx) > GO_PX || fast)) {
        // The neighbour slides fully in; it stands in until the real tab renders.
        navigating.current = true;
        snapshotCurrent(pathname);
        animateTo(-dir * window.innerWidth, () => router.push(target));
        // Safety: if the navigation never lands, bring everything back.
        setTimeout(() => {
          if (!navigating.current) return;
          navigating.current = false;
          preview.current?.remove();
          preview.current = null;
          page.style.transition = "";
          page.style.transform = "";
        }, 5000);
        return;
      }
      // Not far enough: back in place.
      animateTo(0, () => {
        preview.current?.remove();
        preview.current = null;
        page.style.transition = "";
        page.style.transform = "";
      });
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
    };
  }, [pathname, router]);

  return null;
}
