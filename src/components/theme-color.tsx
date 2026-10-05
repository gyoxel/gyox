"use client";

import { useEffect } from "react";
import { SIMPLE_HEADER } from "@/lib/theme";

// The browser's bar (theme-color) follows the page's header colour.
//
// Timing: a phone shows a new theme-color right away, but the page's new
// frame only reaches the screen a few frames after React commits it, so the
// bar used to change ~80ms before the header. The new colour is applied once
// the page has been painted (two frames) plus that display delay.
const DISPLAY_DELAY_MS = 50;

let desired: string | null = null;
let pending: { frame: number; timer?: ReturnType<typeof setTimeout> } | null = null;

function paint() {
  if (!desired) return;
  const root = document.documentElement;
  const value = root.classList.contains("simple") ? SIMPLE_HEADER[root.classList.contains("dark") ? "dark" : "light"] : desired;
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
 * the theme can change (Paramètres, system dark mode), and a navigation
 * can put the layout's default colour back in <head> — repaint at once
 * with the current page's colour after both (no flash of the default).
 */
export function ThemeColorKeeper() {
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(paint);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    observer.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ["content", "media"] });
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
          paint();
        }, DISPLAY_DELAY_MS);
      });
    });
    pending = entry;
  }, [color]);
  return null;
}
