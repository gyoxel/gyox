"use client";

import { useEffect, useState } from "react";
import { Fingerprint } from "@phosphor-icons/react/ssr";
import { awayTooLong, lockEnabled, lockablePage, markSeen, unlockDevice } from "@/lib/app-lock";
import { useT } from "@/lib/i18n/client";

const root = () => document.documentElement;

let asking = false;

/** Asks the phone once at a time; unlocks the page when it confirms.
 *  Null while another ask is still open. */
async function ask(): Promise<boolean | null> {
  if (asking) return null;
  asking = true;
  const ok = await unlockDevice();
  asking = false;
  if (ok) {
    root().classList.remove("gx-locked");
    markSeen();
  }
  return ok;
}

/**
 * The lock screen, over everything while <html> has gx-locked (set before
 * the page shows by LOCK_BOOT_SCRIPT, and again after a minute away). It
 * asks for the fingerprint / Face ID at once; where the phone wants a tap
 * first (Safari), the button does it. Unlocked, the moment the app is left
 * (hidden, reloaded, closed) is kept: back within a minute, it stays open.
 */
export function AppLock() {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // A tab preloaded in a hidden frame never asks: its own ask would take
    // the phone's prompt, and its yes would unlock only itself.
    if (window.self !== window.top) return;
    if (root().classList.contains("gx-locked")) void ask();
    // Only while unlocked: a locked page reloaded must still ask.
    const leaving = () => {
      if (!root().classList.contains("gx-locked")) markSeen();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") return leaving();
      if (!awayTooLong() || !lockEnabled() || !lockablePage()) return;
      root().classList.add("gx-locked");
      void ask();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", leaving);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", leaving);
    };
  }, []);

  async function unlock() {
    setBusy(true);
    setFailed(false);
    const ok = await ask();
    setBusy(false);
    if (ok === false) setFailed(true);
  }

  return (
    <section
      id="gx-lock"
      aria-label={t("GX Salaire est verrouillé")}
      className="gx-login fixed inset-0 z-[300] flex-col items-center justify-center gap-6 px-8 text-center text-white"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-192.png" alt="" width={80} height={80} className="h-20 w-20 drop-shadow-[0_20px_24px_rgba(20,8,60,0.45)]" />
      <div>
        <p className="text-xl font-extrabold tracking-tight">{t("GX Salaire est verrouillé")}</p>
        <p className="mt-1.5 text-sm text-white/80">{t("Ton empreinte, Face ID ou le code du téléphone.")}</p>
      </div>
      <button
        type="button"
        onClick={() => void unlock()}
        disabled={busy}
        className="flex h-14 items-center justify-center gap-2.5 rounded-full bg-white px-7 text-base font-semibold text-violet-700 shadow-[0_18px_36px_-16px_rgba(20,8,60,0.65)] transition-transform active:scale-[0.97] disabled:opacity-70"
      >
        <Fingerprint weight="bold" className="h-6 w-6" />
        {t("Déverrouiller")}
      </button>
      {failed && <p className="text-sm font-medium text-rose-100">{t("Pas reconnu : réessaie.")}</p>}
    </section>
  );
}
