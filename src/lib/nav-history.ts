"use client";

// In-app back navigation. The header's back arrow used to be a plain link to
// a fixed page, which *added* a history entry: A → B → C, back (→ B), back
// again went to C instead of A. Here we mirror the tab's history (pathnames
// only, in sessionStorage so a reload keeps it) to know whether a previous
// in-app page exists: if so, back is a real history.back(); if this is the
// first page of the session, back goes to the home page instead.
//
// The history also keeps how pages were opened, so the phone's back goes
// back to the page one came in from, up to Accueil: Paramètres → Profil →
// Admin, back → Profil → Paramètres → Accueil. A section opened from the
// bar's tabs, the Menu or the header's Paramètres stands right after Accueil
// instead of stacking on the page it was opened from: back from it is
// Accueil. On Accueil, back asks for a second press before leaving the app.
import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { watchBack } from "./close-on-back";
import { currentT } from "./i18n/client";
import { SIGNED_OUT_PAGES } from "@/lib/signed-out-pages";

const KEY = "gx-nav";
const MAX = 50;

interface NavState {
  stack: string[];
  pos: number;
}

function read(): NavState | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as NavState;
    return Array.isArray(s.stack) && Number.isInteger(s.pos) && s.stack[s.pos] !== undefined ? s : null;
  } catch {
    return null;
  }
}

function write(s: NavState) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private mode / storage blocked: back simply falls back to home.
  }
}

let nextIsReplace = false;

function record(path: string) {
  const s = read() ?? { stack: [path], pos: 0 };
  if (s.stack[s.pos] === path) return write(s);
  if (nextIsReplace) {
    nextIsReplace = false;
    s.stack[s.pos] = path;
    s.stack = s.stack.slice(0, s.pos + 1);
  } else {
    s.stack = [...s.stack.slice(0, s.pos + 1), path].slice(-MAX);
    s.pos = s.stack.length - 1;
  }
  write(s);
}

/** Browser back/forward: move in the mirrored stack (or start over if lost). */
function onPop() {
  const path = location.pathname;
  const s = read();
  if (!s) return write({ stack: [path], pos: 0 });
  if (s.stack[s.pos] === path) return; // same page, only the query changed
  if (s.stack[s.pos - 1] === path) s.pos -= 1;
  else if (s.stack[s.pos + 1] === path) s.pos += 1;
  else return write({ stack: [path], pos: 0 });
  write(s);
}

// Run once the router has actually shown `path` (see NavHistoryTracker):
// on popstate alone it may still be busy with the page being left (e.g.
// finishing a Server Action's refresh), and a router.refresh() then would
// reload that page instead of the one arrived on.
let arrival: { path: string; run: () => void } | null = null;

/** Several steps back at once: the mirror moves first, so the popstate
 *  finds itself in place instead of starting over. */
function jump(s: NavState, to: number, onArrive?: () => void) {
  const by = to - s.pos;
  write({ ...s, pos: to });
  if (onArrive) {
    const entry = { path: s.stack[to], run: onArrive };
    arrival = entry;
    setTimeout(() => {
      if (arrival === entry) arrival = null;
    }, 5000);
  }
  history.go(by);
}

type Router = ReturnType<typeof useRouter>;

type Plan = { kind: "push" } | { kind: "replace" } | { kind: "hop"; to: number; replace: boolean };

/** Links opening a section rather than something inside the page they're
 *  on: the bar's tabs, the Menu's pages, the header's Paramètres. */
const SECTION_LINK = "[data-nav='section']";

/**
 * How to go to `path` so back returns the way one came: a page opened from
 * within another stacks on it; a section takes the place right after
 * Accueil (replacing the one open, or going back to it from deeper);
 * Accueil is gone back to.
 */
function plan(path: string, section: boolean): Plan {
  const s = read();
  if (!s || s.stack[s.pos] !== location.pathname) return { kind: "push" };
  if (path !== "/" && !section) return { kind: "push" };
  // Its place in the history: Accueil first, the section after it.
  const slot = path === "/" || s.stack[0] !== "/" ? 0 : 1;
  if (slot > s.pos) return { kind: "push" };
  if (slot === s.pos) return { kind: "replace" };
  return { kind: "hop", to: slot, replace: s.stack[slot] !== path };
}

/** While hopping back through pages on the way to another, they aren't
 *  shown (see .gx-nav-hop in globals.css). */
const HOP_CLASS = "gx-nav-hop";
let hopTarget: string | null = null;

function endHop() {
  hopTarget = null;
  document.documentElement.classList.remove(HOP_CLASS);
}

function replaceWith(router: Router, href: string) {
  nextIsReplace = true;
  router.replace(href);
}

/** Goes to `href` the way `plan` says (`section`: opening a section). */
function navigate(router: Router, href: string, section: boolean) {
  const url = new URL(href, location.href);
  const target = url.pathname + url.search + url.hash;
  const p = url.pathname === location.pathname ? ({ kind: "push" } as const) : plan(url.pathname, section);
  if (p.kind === "push") return router.push(target);
  if (p.kind === "replace") return replaceWith(router, target);
  const s = read();
  if (!s) return router.push(target);
  if (!p.replace) return jump(s, p.to);
  hopTarget = url.pathname;
  document.documentElement.classList.add(HOP_CLASS);
  setTimeout(() => hopTarget === url.pathname && endHop(), 1500);
  jump(s, p.to, () => replaceWith(router, target));
}

/** For code that opens a section by itself (the tabs' swipe). */
export function useOpenSection() {
  const router = useRouter();
  return useCallback((href: string) => navigate(router, href, true), [router]);
}

/** The links' taps go through `navigate` too. The link's own onClick still
 *  runs (closing a menu, highlighting a tab…); the default prevented here
 *  only stops next/link's own push. */
function onLinkClick(router: Router, e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const target = e.target instanceof Element ? e.target : null;
  const link = target?.closest<HTMLAnchorElement>("a[href]");
  if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
  // A button inside the link (Disponible's eye…) does its own thing.
  const control = target?.closest("button, input, select, textarea, label, [role='button']");
  if (control && control !== link && link.contains(control)) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/") || url.pathname === location.pathname) return;
  const section = link.closest(SECTION_LINK) !== null;
  if (plan(url.pathname, section).kind === "push") return;
  e.preventDefault();
  navigate(router, url.href, section);
}

/** The installed app (home screen, Play Store): there, back on the
 *  history's first page would close it. */
const installed = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches;

/** Time to press back a second time on Accueil to leave the app. */
const LEAVE_MS = 2000;

/**
 * On the history's first page of the installed app, the phone's back would
 * close it: from a section it goes to Accueil instead, and on Accueil the
 * first press only says to press again — a second one within 2 s leaves.
 */
function guardFirstPage(router: Router): () => void {
  let watcher: ReturnType<typeof watchBack> = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = () => {
    watcher = watchBack(() => {
      watcher = null;
      if (location.pathname !== "/") return replaceWith(router, "/");
      toast(currentT()("Appuie encore sur retour pour quitter"), { id: "leave", duration: LEAVE_MS });
      timer = setTimeout(arm, LEAVE_MS);
    });
  };
  arm();
  return () => {
    clearTimeout(timer);
    watcher?.destroy();
  };
}

/** Mounted once in the root layout. */
export function NavHistoryTracker() {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (window.self !== window.top) return;
    const onClick = (e: MouseEvent) => onLinkClick(router, e);
    window.addEventListener("popstate", onPop);
    // Capturing on window: before next/link's own handler.
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("click", onClick, true);
    };
  }, [router]);
  useEffect(() => {
    // The tab swipe's hidden preload frames share this sessionStorage: they
    // must not write their page into the tab's history.
    if (window.self !== window.top) return;
    record(pathname);
    if (hopTarget === pathname) endHop();
    if (arrival?.path === pathname) {
      const { run } = arrival;
      arrival = null;
      run();
    }
    const s = read();
    if (installed() && (!s || s.pos === 0) && !SIGNED_OUT_PAGES.includes(pathname)) return guardFirstPage(router);
  }, [pathname, router]);
  return null;
}

/** The pages a DELETE response says went away (for `leave`). */
export async function pagesGone(res: Response): Promise<string[]> {
  const body = (await res.json().catch(() => null)) as { gone?: unknown } | null;
  return Array.isArray(body?.gone) ? body.gone.filter((g): g is string => typeof g === "string") : [];
}

/** Two frames: lets the router finish what it's applying first. */
function afterRouterSettles(go: () => void) {
  requestAnimationFrame(() => requestAnimationFrame(go));
}

/**
 * - `back(fallback)`: previous in-app page, or `fallback` (home by default)
 *   when this is the first page of the session.
 * - `backTo(path)`: return to the latest `path` in the history (skipping the
 *   pages in between, e.g. a deleted item's page), or replace with it.
 * - `leave(gone, fallback)`: after a delete, back to the latest page that
 *   still exists — skipping every page under one of the `gone` paths (the
 *   deleted item's pages and those of what went with it) — or `fallback`.
 */
export function useNavBack() {
  const router = useRouter();
  function replace(path: string) {
    nextIsReplace = true;
    router.replace(path);
  }
  return {
    back(fallback = "/") {
      const s = read();
      if (s && s.pos > 0) history.back();
      else replace(fallback);
    },
    backTo(path: string) {
      const s = read();
      const i = s ? s.stack.lastIndexOf(path, s.pos - 1) : -1;
      if (s && i >= 0 && s.pos > 0) jump(s, i);
      else replace(path);
    },
    leave(gone: string[], fallback = "/") {
      const s = read();
      const dead = (p: string) => gone.some((g) => p === g || p.startsWith(`${g}/`));
      let i = s ? s.pos - 1 : -1;
      while (s && i >= 0 && dead(s.stack[i])) i -= 1;
      // Back / forward shows the page as it was cached: reload its data so
      // what was just deleted isn't listed there anymore. Once the router
      // has finished restoring it — and again a moment later: a refresh sent
      // while the router is still busy can be dropped (about 1 time in 5),
      // leaving the old list showing.
      if (s && i >= 0) {
        jump(s, i, () => {
          afterRouterSettles(() => router.refresh());
          setTimeout(() => router.refresh(), 500);
        });
      } else replace(fallback);
    },
  };
}
