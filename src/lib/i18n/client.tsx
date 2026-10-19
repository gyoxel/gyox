"use client";

// The language in the browser: given by the root layout (from the cookie the
// server read), so the first render matches the server's.
import { createContext, useContext, useMemo } from "react";
import { LANG_COOKIE, isLang, makeT, type Lang } from "./index";

const LangContext = createContext<Lang>("fr");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext value={lang}>{children}</LangContext>;
}

/** The language and its t(), for a client component. */
export function useI18n() {
  const lang = useContext(LangContext);
  return useMemo(() => ({ lang, t: makeT(lang) }), [lang]);
}

export function useT() {
  return useI18n().t;
}

/** The device's language outside React (a toast from plain code…). */
export function currentLang(): Lang {
  if (typeof document === "undefined") return "fr";
  const value = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`))?.[1];
  return isLang(value) ? value : "fr";
}

export function currentT() {
  return makeT(currentLang());
}

/** Switches the device's language: kept a year, the app reloaded in it. */
export function setLang(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  try {
    localStorage.removeItem("gx-tab-snapshots"); // the tabs' last looks, in the old language
  } catch {
    // storage blocked: nothing kept to clear
  }
  window.location.reload();
}
