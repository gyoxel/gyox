"use client";

import { useEffect } from "react";
import { HEADER_COLOR, SIMPLE_HEADER } from "@/lib/theme";

// The browser's bar (theme-color) takes the header's colour — the same on
// every page, light or dark (the simple theme's plain one with it).
//
// Only this file writes the meta (the layout doesn't declare a themeColor):
// any other value, even for one frame, would flash in the bar.
function paint() {
  const root = document.documentElement;
  const colors = root.classList.contains("simple") ? SIMPLE_HEADER : HEADER_COLOR;
  const value = root.classList.contains("dark") ? colors.dark : colors.light;
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

/**
 * Mounted once in the root layout, so it never goes away between pages:
 * repaints when the theme changes (Paramètres, system dark mode) or the
 * meta goes missing.
 */
export function ThemeColorKeeper() {
  useEffect(() => {
    paint();
    const root = document.documentElement;
    const observer = new MutationObserver(paint);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    observer.observe(document.head, { childList: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
