"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { pageColor } from "@/lib/page-theme";

/** The bottom bar's tabs, in order: swipe left → next, right → previous. */
const TABS = ["/", "/budget", "/credits", "/menu"];
const PAGE_ID = "page-root";
const LOCK_PX = 12; // movement before deciding horizontal vs vertical
const GO_PX = 70; // drag past this (or a quick flick) switches tab
const SLIDE_MS = 200;

/** Each tab's page title (its <h1>): a snapshot is only kept when it shows
 *  that title, so one tab can never be stored under another's name. */
const TITLES: Record<string, string> = { "/": "GX Salaire", "/budget": "Dépenses", "/credits": "Crédits", "/menu": "Menu" };

/** Last seen look of each tab (its page's HTML), shown next to the current
 *  page while swiping so the neighbour is already there — no blank. Kept in
 *  localStorage too, so even the first swipe after a reload has them. */
const STORE_KEY = "gx-tab-snapshots";
const snapshots = new Map<string, string>();
/** Tabs snapshotted since this load (the stored ones may be older). */
const fresh = new Set<string>();
let restored = false;

function restoreSnapshots() {
  if (restored) return;
  restored = true;
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}") as Record<string, unknown>;
    for (const t of TABS) if (typeof saved[t] === "string" && !snapshots.has(t)) snapshots.set(t, saved[t] as string);
  } catch {
    // nothing saved or storage blocked: the tabs get snapshotted as they load
  }
}

function saveSnapshot(path: string, html: string) {
  snapshots.set(path, html);
  fresh.add(path);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(snapshots)));
  } catch {
    // storage full or blocked: kept for this visit only
  }
}

function validSnapshot(root: Element | null | undefined, path: string): string | null {
  // (no `instanceof Element`: an element from a preload frame belongs to
  // that frame's window and would fail it)
  if (!root) return null;
  if (root.querySelector('[aria-busy="true"]')) return null; // still the loading skeleton
  if (root.querySelector("h1")?.textContent?.trim() !== TITLES[path]) return null;
  return root.innerHTML;
}

function snapshotCurrent(path: string) {
  if (!TABS.includes(path) || window.location.pathname !== path) return;
  const html = validSnapshot(document.getElementById(PAGE_ID), path);
  if (html) saveSnapshot(path, html);
}

/** Stand-in while a tab has no snapshot yet: its header and a skeleton. */
function placeholder(path: string): string {
  const block = (h: string) => `<div class="${h} animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70"></div>`;
  return `<div class="sticky top-0 z-30 flex h-[68px] items-center rounded-b-[28px] px-4 pb-3 pt-3 text-white" style="background-color:${pageColor(path)}"><h1 class="text-xl font-bold tracking-tight">${TITLES[path] ?? ""}</h1></div><div class="flex flex-col gap-4 px-4 py-5">${block("h-28")}${block("h-20")}${block("h-14")}${block("h-14")}${block("h-14")}</div>`;
}

/** Loads the other tabs in a hidden frame, once per visit, to snapshot them
 *  (fresh data); the current tab's neighbours first. */
let preloading = false;
function preloadSnapshots() {
  if (preloading || window.self !== window.top) return;
  preloading = true;
  const here = TABS.indexOf(window.location.pathname);
  const missing = TABS.filter((t) => !fresh.has(t) && t !== window.location.pathname).sort(
    (a, b) => Math.abs(TABS.indexOf(a) - here) - Math.abs(TABS.indexOf(b) - here),
  );
  const next = () => {
    const path = missing.shift();
    if (!path) return;
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.style.cssText = `position:fixed;left:-9999px;top:0;width:${window.innerWidth}px;height:${window.innerHeight}px;border:0;visibility:hidden;`;
    frame.src = path;
    const startedAt = Date.now();
    // Poll until the frame shows the real page (not the skeleton), max 10 s.
    const poll = () => {
      let html: string | null = null;
      try {
        html = validSnapshot(frame.contentDocument?.getElementById(PAGE_ID), path);
      } catch {
        // not readable: that tab simply keeps its placeholder
      }
      if (html || Date.now() - startedAt > 10000) {
        if (html && !fresh.has(path)) saveSnapshot(path, html);
        frame.remove();
        next();
        return;
      }
      setTimeout(poll, 250);
    };
    document.body.appendChild(frame);
    // The page is streamed: no need to wait for the frame's load event.
    setTimeout(poll, 250);
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

  // The new tab has rendered: drop the preview that stood in for it — only
  // once the page really shows that tab (its title, not the loading
  // skeleton). On a phone the path can change while the old tab is still
  // on screen for a moment; removing the preview then flashed it back.
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
    const arrived = () => !!page && validSnapshot(page, pathname) !== null;
    if (!page || !navigating.current || !TITLES[pathname] || arrived()) return finish();
    let frame = 0;
    const check = () => {
      if (!arrived()) return;
      cancelAnimationFrame(frame);
      observer.disconnect();
      clearTimeout(timer);
      // Let the browser paint the new tab once under the preview first.
      frame = requestAnimationFrame(finish);
    };
    const observer = new MutationObserver(check);
    observer.observe(page, { childList: true, subtree: true, characterData: true });
    const timer = setTimeout(() => {
      observer.disconnect();
      finish();
    }, 8000);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  // Keep this tab's snapshot fresh, and fetch the others once.
  useEffect(() => {
    if (!TABS.includes(pathname)) return;
    restoreSnapshots();
    const t1 = setTimeout(() => snapshotCurrent(pathname), 800);
    const t2 = setTimeout(preloadSnapshots, 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
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
    let lastSnap = 0;

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
      inner.innerHTML = snapshots.get(path) ?? placeholder(path);
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
      // Its latest look, in case the swipe leaves it (e.g. after a tick).
      if (Date.now() - lastSnap > 1500) {
        lastSnap = Date.now();
        snapshotCurrent(pathname);
      }
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
          if (!navigating.current || window.location.pathname !== pathname) return;
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
