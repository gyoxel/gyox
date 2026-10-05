"use client";

import { useEffect } from "react";
import { SIMPLE_HEADER } from "@/lib/theme";

// The browser's bar (theme-color) follows the page's header colour.
//
// Timing: a phone shows a new theme-color the moment the meta changes, but
// the page's new frame only reaches the screen a frame or two after React
// commits it: the colour is applied once the page has been painted (two
// frames) plus a little of that display delay.
//
// Only this file writes the meta (the layout doesn't declare a themeColor):
// any other value, even for one frame, would flash in the bar.
const DISPLAY_DELAY_MS = 10;

let desired: string | null = null;
// While a tab is being swiped: the colour between the two pages.
let override: string | null = null;
let pending: { frame: number; timer?: ReturnType<typeof setTimeout> } | null = null;

function paint() {
  const color = override ?? desired;
  if (!color) return;
  const root = document.documentElement;
  const value = root.classList.contains("simple") ? SIMPLE_HEADER[root.classList.contains("dark") ? "dark" : "light"] : color;
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  if (metas.length === 0) {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = value;
    document.head.appendChild(meta);
    return;
  }
  metas.forEach((m) => {
    if (m.hasAttribute("media")) m.removeAttribute("media");
    if (m.content !== value) m.content = value;
  });
}

function cancelPending() {
  if (!pending) return;
  cancelAnimationFrame(pending.frame);
  if (pending.timer) clearTimeout(pending.timer);
  pending = null;
}

/**
 * Mounted once in the root layout, so it never goes away between pages:
 * repaints when the theme changes (Paramètres, system dark mode) or the
 * meta goes missing.
 */
export function ThemeColorKeeper() {
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(paint);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    observer.observe(document.head, { childList: true });
    return () => observer.disconnect();
  }, []);
  return null;
}

/** Paints the browser's bar in this page's colour — or in the plain
 *  header's colour with the simple theme — in step with the header. */
export function ThemeColor({ color }: { color: string }) {
  useEffect(() => {
    cancelPending();
    if (desired === null) {
      // First page of the visit: nothing to keep in step with.
      desired = color;
      paint();
      return;
    }
    const entry: NonNullable<typeof pending> = { frame: 0 };
    entry.frame = requestAnimationFrame(() => {
      entry.frame = requestAnimationFrame(() => {
        entry.timer = setTimeout(() => {
          pending = null;
          desired = color;
          // A swipe that brought this page ends on its colour already.
          override = null;
          paint();
        }, DISPLAY_DELAY_MS);
      });
    });
    pending = entry;
  }, [color]);
  return null;
}

/** The bar's colour while a tab is swiped (null: back to the page's own). */
export function setSwipeColor(color: string | null) {
  if (override === color) return;
  override = color;
  paint();
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** `from` → `to` at `t` (0-1), for "#rrggbb" colours. */
export function mixColor(from: string, to: string, t: number): string {
  const a = rgb(from);
  const b = rgb(to);
  const k = Math.min(1, Math.max(0, t));
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, "0")).join("")}`;
}
