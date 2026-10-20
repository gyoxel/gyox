"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { mutate, useRefreshData } from "@/lib/use-refresh-data";
import Link from "next/link";
import { CaretRight, DownloadSimple, Fingerprint, Leaf, Money, Monitor, Moon, Sun, Tag, UploadSimple } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import type { Settings } from "@/lib/types";
import { THEME_STORAGE_KEY, applyTheme, composeTheme, parseTheme, type ThemeBase, type ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { LANG_NAMES, SHOWN_LANGS, msg, type Lang } from "@/lib/i18n";
import { setLang, useI18n, useT } from "@/lib/i18n/client";
import { disableLock, enableLock, installedApp, lockEnabled, lockSupported, subscribeLock } from "@/lib/app-lock";

const THEMES: { value: ThemeBase; label: string; icon: typeof Sun }[] = [
  { value: "system", label: msg("Système"), icon: Monitor },
  { value: "light", label: msg("Clair"), icon: Sun },
  { value: "dark", label: msg("Sombre"), icon: Moon },
];

const LANG_FLAGS: Record<Lang, string> = { fr: "🇫🇷", en: "🇬🇧", dar: "🇲🇦" };

type LockAccount = { id: string; email: string; name: string | null };

/** Paramètres: theme (applied instantly), language, the lock and data backup. */
export function SettingsForm({ settings, account }: { settings: Settings; account: LockAccount | null }) {
  const { lang, t } = useI18n();
  const refreshData = useRefreshData();
  const [theme, setTheme] = useState<ThemeChoice>(settings.theme);
  const { base, simple } = parseTheme(theme);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<File | null>(null);

  // The saved theme wins: bring this device in line if it differs (e.g. the
  // theme was changed on another phone). Read fresh from the server — the
  // page itself can come from the client cache, prefetched before the last
  // change, and would otherwise put the old theme back.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<Settings>) : null))
      .then((fresh) => {
        if (cancelled || !fresh) return;
        setTheme(fresh.theme);
        try {
          if (localStorage.getItem(THEME_STORAGE_KEY) !== fresh.theme) applyTheme(fresh.theme);
        } catch {}
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function chooseTheme(choice: ThemeChoice) {
    const previous = theme;
    setTheme(choice);
    applyTheme(choice);
    // Also drops cached pages so none of them comes back with the old theme.
    const res = await mutate({ method: "PATCH", path: "/api/settings", body: { theme: choice } });
    if (!res.ok) {
      setTheme(previous);
      applyTheme(previous);
      toast.error(t("Impossible d'enregistrer le thème."));
    }
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      if (!res.ok) {
        toast.error(t("Import impossible : fichier invalide."));
        return;
      }
      toast.success(t("Données importées avec succès."));
      await refreshData();
    } catch {
      toast.error(t("Le fichier sélectionné n'est pas un JSON valide."));
    }
  }

  const section = "overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";
  const rowClass =
    "flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3.5 text-left first:border-t-0 active:bg-slate-50 dark:border-slate-800 dark:active:bg-slate-800/60";

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("Apparence")}</h2>
        <div role="radiogroup" aria-label={t("Thème")} className="grid grid-cols-3 gap-2.5">
          {THEMES.map(({ value, label, icon: Icon }) => {
            const selected = base === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={t(label)}
                onClick={() => chooseTheme(composeTheme(value, simple))}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border bg-white p-2.5 transition-colors dark:bg-slate-900",
                  selected ? "border-slate-500 ring-2 ring-slate-500 dark:border-slate-300 dark:ring-slate-300" : "border-slate-200 dark:border-slate-700",
                )}
              >
                <ThemePreview kind={value} simple={simple} />
                <span className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <Icon weight="bold" className="h-3.5 w-3.5" />
                  {t(label)}
                </span>
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl gx-tile text-slate-500 dark:text-slate-300">
            <Leaf weight="bold" className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{t("Mode simple")}</span>
            <span className="block text-xs text-slate-400">{t("Moins de couleurs, plus doux pour les yeux")}</span>
          </span>
          <Switch checked={simple} onCheckedChange={(on) => chooseTheme(composeTheme(base, on))} aria-label={t("Mode simple")} />
        </label>
      </section>

      {/* The app's language on this device (each name in its own language). */}
      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("Langue")}</h2>
        <div role="radiogroup" aria-label={t("Langue")} className={cn("grid gap-2.5", SHOWN_LANGS.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
          {SHOWN_LANGS.map((value) => {
            const selected = lang === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => !selected && setLang(value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl border bg-white px-2 py-3 transition-colors dark:bg-slate-900",
                  selected ? "border-slate-500 ring-2 ring-slate-500 dark:border-slate-300 dark:ring-slate-300" : "border-slate-200 dark:border-slate-700",
                )}
              >
                <span aria-hidden className="text-2xl leading-none">
                  {LANG_FLAGS[value]}
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{LANG_NAMES[value]}</span>
              </button>
            );
          })}
        </div>
      </section>

      {account && <LockSetting account={account} />}

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("Raccourcis")}</h2>
        <div className={section}>
          <Link href="/salary" className={rowClass}>
            <RowIcon className="from-emerald-400 to-teal-600">
              <Money weight="bold" className="h-4 w-4" />
            </RowIcon>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{t("Salaire")}</span>
              <span className="block text-xs text-slate-400">{t("Montant, jour de paie, espèces ou carte")}</span>
            </span>
            <CaretRight weight="bold" className="h-4 w-4 text-slate-300" />
          </Link>
          <Link href="/categories" className={rowClass}>
            <RowIcon className="from-violet-400 to-purple-600">
              <Tag weight="bold" className="h-4 w-4" />
            </RowIcon>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{t("Catégories")}</span>
              <span className="block text-xs text-slate-400">{t("Ajouter, renommer, ordonner")}</span>
            </span>
            <CaretRight weight="bold" className="h-4 w-4 text-slate-300" />
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("Sauvegarde des données")}</h2>
        <div className={section}>
          <a href="/api/export" download className={rowClass}>
            <RowIcon className="from-sky-400 to-blue-600">
              <DownloadSimple weight="bold" className="h-4 w-4" />
            </RowIcon>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{t("Exporter")}</span>
              <span className="block text-xs text-slate-400">{t("Télécharger toutes tes données (JSON)")}</span>
            </span>
          </a>
          <button type="button" onClick={() => fileInputRef.current?.click()} className={rowClass}>
            <RowIcon className="from-amber-400 to-orange-500">
              <UploadSimple weight="bold" className="h-4 w-4" />
            </RowIcon>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{t("Importer")}</span>
              <span className="block text-xs text-slate-400">{t("Remplace toutes les données actuelles")}</span>
            </span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPendingImport(file);
            e.target.value = "";
          }}
        />
        <ConfirmDialog
          open={pendingImport != null}
          onOpenChange={(open) => !open && setPendingImport(null)}
          title={t("Remplacer toutes les données ?")}
          description={t("Toutes les données actuelles (dépenses, dettes, darets, objectifs…) seront remplacées par celles de « {file} ». Cette action est irréversible.", { file: pendingImport?.name ?? "" })}
          confirmLabel={t("Importer")}
          onConfirm={() => {
            const file = pendingImport;
            setPendingImport(null);
            if (file) void handleImportFile(file);
          }}
        />
      </section>
    </div>
  );
}

function RowIcon({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-sm", className)}>
      {children}
    </span>
  );
}

const NIGHT_PREVIEW =
  "radial-gradient(120% 70% at 0% 0%, #3b2a7a 0%, transparent 60%), radial-gradient(100% 70% at 100% 0%, #0e5a73 0%, transparent 60%), #070c19";

/** A tiny phone screen in that theme (system: half light, half dark;
 *  simple: grey header instead of the night one). */
function ThemePreview({ kind, simple }: { kind: ThemeBase; simple: boolean }) {
  const screen = (dark: boolean) => (
    <span
      className={cn("flex h-full flex-1 flex-col gap-1 p-1.5", dark ? "bg-slate-900" : "bg-slate-50")}
      style={dark && !simple ? { background: NIGHT_PREVIEW } : undefined}
    >
      <span className={cn("h-2.5 rounded", simple ? (dark ? "bg-slate-700" : "bg-slate-300") : dark ? "bg-white/10" : "bg-white shadow-sm")} />
      <span
        className={cn(
          "h-3 rounded",
          simple
            ? dark
              ? "bg-slate-800"
              : "bg-white shadow-sm"
            : dark
              ? "bg-gradient-to-r from-violet-600 to-violet-900"
              : "bg-gradient-to-r from-violet-500 to-violet-700",
        )}
      />
      <span className={cn("h-2 rounded", dark ? "bg-white/10" : "bg-white shadow-sm")} />
      <span className={cn("h-2 w-2/3 rounded", dark ? "bg-white/10" : "bg-white shadow-sm")} />
    </span>
  );
  return (
    <span className="flex h-20 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      {kind === "dark" ? screen(true) : kind === "light" ? screen(false) : (
        <>
          {screen(false)}
          {screen(true)}
        </>
      )}
    </span>
  );
}

const noChange = () => () => {};

/** Sécurité: lock the app on this device with its fingerprint / Face ID —
 *  only in the installed app (not in Chrome or Safari). */
function LockSetting({ account }: { account: LockAccount }) {
  const t = useT();
  const on = useSyncExternalStore(subscribeLock, lockEnabled, () => false);
  const installed = useSyncExternalStore(noChange, installedApp, () => false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void lockSupported().then((ok) => !cancelled && setSupported(ok));
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(next: boolean) {
    if (!next) {
      disableLock();
      toast.success(t("Verrouillage désactivé."));
      return;
    }
    setBusy(true);
    const ok = await enableLock(account);
    setBusy(false);
    if (ok) toast.success(t("Verrouillage activé sur ce téléphone."));
    else toast.error(t("Pas activé : l'empreinte ou Face ID n'a pas été confirmé."));
  }

  if (!installed) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("Sécurité")}</h2>
      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl gx-tile text-slate-500 dark:text-slate-300">
          <Fingerprint weight="bold" className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{t("Verrouiller avec l'empreinte / Face ID")}</span>
          <span className="block text-xs text-slate-400">
            {supported === false && !on
              ? t("Pas disponible ici : active l'empreinte ou Face ID dans les réglages du téléphone.")
              : t("Demandé à l'ouverture de l'app installée et après une minute ailleurs, sur ce téléphone.")}
          </span>
        </span>
        <Switch
          checked={on}
          disabled={busy || (supported !== true && !on)}
          onCheckedChange={(next) => void toggle(next)}
          label={t("Verrouiller avec l'empreinte / Face ID")}
        />
      </label>
    </section>
  );
}
