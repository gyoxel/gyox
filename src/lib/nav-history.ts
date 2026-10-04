"use client";

// In-app back navigation. The header's back arrow used to be a plain link to
// a fixed page, which *added* a history entry: A → B → C, back (→ B), back
// again went to C instead of A. Here we mirror the tab's history (pathnames
// only, in sessionStorage so a reload keeps it) to know whether a previous
// in-app page exists: if so, back is a real history.back(); if this is the
// first page of the session, back goes to the home page instead.
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

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

/** Several steps back at once: the mirror moves first, so the popstate
 *  finds itself in place instead of starting over. */
function jump(s: NavState, to: number, onArrive?: () => void) {
  const by = to - s.pos;
  write({ ...s, pos: to });
  if (onArrive) window.addEventListener("popstate", () => setTimeout(onArrive, 0), { once: true });
  history.go(by);
}

/** Mounted once in the root layout. */
export function NavHistoryTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.self !== window.top) return;
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    // The tab swipe's hidden preload frames share this sessionStorage: they
    // must not write their page into the tab's history.
    if (window.self !== window.top) return;
    record(pathname);
  }, [pathname]);
  return null;
}

/** The pages a DELETE response says went away (for `leave`). */
export async function pagesGone(res: Response): Promise<string[]> {
  const body = (await res.json().catch(() => null)) as { gone?: unknown } | null;
  return Array.isArray(body?.gone) ? body.gone.filter((g): g is string => typeof g === "string") : [];
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
      // what was just deleted isn't listed there anymore.
      if (s && i >= 0) jump(s, i, () => router.refresh());
      else replace(fallback);
    },
  };
}
