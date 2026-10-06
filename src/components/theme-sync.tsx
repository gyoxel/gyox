"use client";

import { useEffect } from "react";
import { applyTheme, THEME_STORAGE_KEY, type ThemeChoice } from "@/lib/theme";

const SYNCED_KEY = "gx-theme-synced";

/**
 * The theme is applied before the first paint from this device's copy
 * (localStorage), which a new address (e.g. gxsalaire.ma after
 * gx-salaire.vercel.app) or another phone doesn't have yet. Once per visit,
 * take the choice saved in Paramètres and apply it if it differs.
 */
export function ThemeSync() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SYNCED_KEY)) return;
      sessionStorage.setItem(SYNCED_KEY, "1");
    } catch {}
    fetch("/api/settings", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ theme?: ThemeChoice }>) : null))
      .then((settings) => {
        if (!settings?.theme) return;
        let local: string | null = null;
        try {
          local = localStorage.getItem(THEME_STORAGE_KEY);
        } catch {}
        if (local !== settings.theme) applyTheme(settings.theme);
      })
      .catch(() => {});
  }, []);
  return null;
}
