"use client";

import { useEffect } from "react";
import { SIMPLE_HEADER } from "@/lib/theme";

/** Paints the browser's bar (theme-color) in the page's colour — or in the
 *  plain header's colour with the simple theme — and keeps it so. */
export function ThemeColor({ color }: { color: string }) {
  useEffect(() => {
    const root = document.documentElement;
    const paint = () => {
      const value = root.classList.contains("simple")
        ? SIMPLE_HEADER[root.classList.contains("dark") ? "dark" : "light"]
        : color;
      const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
      if (metas.length === 0) {
        const meta = document.createElement("meta");
        meta.name = "theme-color";
        meta.content = value;
        document.head.appendChild(meta);
      } else {
        metas.forEach((m) => {
          m.removeAttribute("media");
          if (m.content !== value) m.content = value;
        });
      }
    };
    paint();
    // The theme can change (Paramètres, system dark mode), and a refresh
    // puts the layout's default colour back in <head>: repaint after both.
    const observer = new MutationObserver(paint);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    observer.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ["content"] });
    return () => observer.disconnect();
  }, [color]);
  return null;
}
