"use client";

// Installing the app from the site: Chrome offers it (beforeinstallprompt)
// when the site isn't installed yet. The offer is caught as soon as it comes
// (InstallAppListener, in the root layout) and shown as a card on Accueil
// and Connexion; tapping Installer opens Chrome's own install window. Closed
// with its ×, the card comes back after a week.
import { useEffect, useSyncExternalStore } from "react";
import { DownloadSimple, X } from "@phosphor-icons/react/ssr";
import { useT } from "@/lib/i18n/client";

interface InstallOffer extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "gx-install-dismissed";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

let offer: InstallOffer | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function dismissedRecently(): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISSED_KEY) ?? 0) < WEEK_MS;
  } catch {
    return false;
  }
}

/** Mounted once in the root layout: keeps Chrome's offer for the card
 *  (instead of Chrome's own little bar). */
export function InstallAppListener() {
  useEffect(() => {
    const onOffer = (e: Event) => {
      e.preventDefault();
      offer = e as InstallOffer;
      changed();
    };
    const onInstalled = () => {
      offer = null;
      changed();
    };
    window.addEventListener("beforeinstallprompt", onOffer);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onOffer);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}

/** "Installer l'app": only while Chrome offers it and it wasn't closed in
 *  the last week. */
export function InstallAppCard({ className }: { className?: string }) {
  const t = useT();
  const available = useSyncExternalStore(
    subscribe,
    () => offer !== null && !dismissedRecently(),
    () => false,
  );
  if (!available) return null;

  async function install() {
    const current = offer;
    if (!current) return;
    await current.prompt();
    const { outcome } = await current.userChoice;
    if (outcome === "accepted") offer = null;
    changed();
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // storage blocked: hidden for this visit only
      offer = null;
    }
    changed();
  }

  return (
    <div className={`gx-glass flex items-center gap-3 rounded-[22px] border py-2.5 pl-3 pr-2 ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{t("Installer GX Salaire")}</span>
        <span className="block truncate text-[11.5px] text-slate-500 dark:text-slate-400">{t("Sur ton écran d'accueil")}</span>
      </span>
      <button
        type="button"
        onClick={install}
        className="gx-cta flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-transform active:scale-95"
      >
        <DownloadSimple weight="bold" className="h-4 w-4" />
        {t("Installer")}
      </button>
      <button type="button" onClick={dismiss} aria-label={t("Fermer")} className="flex h-9 w-7 shrink-0 items-center justify-center text-slate-400">
        <X weight="bold" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
