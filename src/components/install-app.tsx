"use client";

// Installing the app from the site: Chrome offers it (beforeinstallprompt)
// when the site isn't installed yet. The offer is caught as soon as it comes
// (InstallAppListener, in the root layout) and shown as a card on Accueil
// and Connexion; tapping Installer opens Chrome's own install window.
// Safari on an iPhone / iPad offers nothing: there the same card's
// Installer shows how to do it by hand (Partager → Sur l'écran d'accueil).
// Closed with its ×, the card comes back after a week.
import { useEffect, useState, useSyncExternalStore } from "react";
import { CheckCircle, DownloadSimple, Export, PlusSquare, X } from "@phosphor-icons/react/ssr";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

interface InstallOffer extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "gx-install-dismissed";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

let offer: InstallOffer | null = null;
/** Closed while storage is blocked: hidden for this visit only. */
let hidden = false;
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

/** Safari on an iPhone / iPad, the site not yet on the home screen (other
 *  browsers there and apps' own browsers can't add it the same way). */
function iosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const safari = /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|FBAN|FBAV|Instagram|Line\//.test(ua);
  const installed = (navigator as Navigator & { standalone?: boolean }).standalone === true || matchMedia("(display-mode: standalone)").matches;
  return ios && safari && !installed;
}

/** What the card offers: Chrome's install window, the iPhone's steps, or nothing. */
function installMode(): "offer" | "ios" | null {
  if (hidden || dismissedRecently()) return null;
  if (offer) return "offer";
  return iosSafari() ? "ios" : null;
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

/** "Installer l'app": while Chrome offers it, or in Safari on an iPhone, and
 *  it wasn't closed in the last week. */
export function InstallAppCard({ className }: { className?: string }) {
  const t = useT();
  const mode = useSyncExternalStore(subscribe, installMode, () => null);
  const [steps, setSteps] = useState(false);
  if (!mode) return null;

  async function install() {
    if (mode === "ios") return setSteps(true);
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
      hidden = true; // storage blocked: hidden for this visit only
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
      {mode === "ios" && <IosSteps open={steps} onOpenChange={setSteps} />}
    </div>
  );
}

/** Safari on an iPhone: adding the site to the home screen, step by step. */
function IosSteps({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const steps = [
    { icon: Export, text: t("Touche Partager en bas de Safari (ou « ••• » puis Partager).") },
    { icon: PlusSquare, text: t("Choisis « Sur l'écran d'accueil » (fais défiler la liste si tu ne le vois pas).") },
    { icon: CheckCircle, text: t("Touche « Ajouter » : GX Salaire s'ouvre ensuite comme une app.") },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("Installer GX Salaire")}</DialogTitle>
          <DialogDescription>{t("Sur iPhone, Safari l'ajoute à ton écran d'accueil en trois gestes :")}</DialogDescription>
        </DialogHeader>
        <ol className="flex flex-col gap-3">
          {steps.map(({ icon: Icon, text }, i) => (
            <li key={i} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
              <span className="gx-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--gx-tile-ink)]">
                <Icon weight="bold" className="h-5 w-5" />
              </span>
              <span>
                <b className="mr-1 text-slate-400">{i + 1}.</b>
                {text}
              </span>
            </li>
          ))}
        </ol>
        <Button type="button" className="gx-cta mt-1 w-full" onClick={() => onOpenChange(false)}>
          {t("J'ai compris")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
