"use client";

import { useEffect } from "react";

/** Paints the browser's bar (theme-color) in the page's colour. */
export function ThemeColor({ color }: { color: string }) {
  useEffect(() => {
    const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
    if (metas.length === 0) {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
      meta.content = color;
    } else {
      metas.forEach((m) => {
        m.removeAttribute("media");
        m.content = color;
      });
    }
  }, [color]);
  return null;
}
