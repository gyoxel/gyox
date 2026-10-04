"use client";

import { useEffect, useRef, useState } from "react";
import { useRefreshData } from "@/lib/use-refresh-data";
import Link from "next/link";
import { Banknote, ChevronRight, Download, Leaf, Monitor, Moon, Sun, Tags, Upload } from "lucide-react";
import { toast } from "sonner";
import type { Settings } from "@/lib/types";
import { THEME_STORAGE_KEY, applyTheme, composeTheme, parseTheme, type ThemeBase, type ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Switch } from "@/components/ui/switch";

const THEMES: { value: ThemeBase; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Système", icon: Monitor },
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
];

/** Paramètres: theme (applied instantly) and data backup. */
export function SettingsForm({ settings }: { settings: Settings }) {
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
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: choice }),
    });
    if (!res.ok) {
      setTheme(previous);
      applyTheme(previous);
      toast.error("Impossible d'enregistrer le thème.");
      return;
    }
    // Drop cached pages so none of them comes back with the old theme.
    await refreshData();
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
        toast.error("Import impossible : fichier invalide.");
        return;
      }
      toast.success("Données importées avec succès.");
      await refreshData();
    } catch {
      toast.error("Le fichier sélectionné n'est pas un JSON valide.");
    }
  }

  const section = "overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";
  const rowClass =
    "flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3.5 text-left first:border-t-0 active:bg-slate-50 dark:border-slate-800 dark:active:bg-slate-800/60";

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Apparence</h2>
        <div role="radiogroup" aria-label="Thème" className="grid grid-cols-3 gap-2.5">
          {THEMES.map(({ value, label, icon: Icon }) => {
            const selected = base === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={label}
                onClick={() => chooseTheme(composeTheme(value, simple))}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border bg-white p-2.5 transition-colors dark:bg-slate-900",
                  selected ? "border-slate-500 ring-2 ring-slate-500 dark:border-slate-300 dark:ring-slate-300" : "border-slate-200 dark:border-slate-700",
                )}
              >
                <ThemePreview kind={value} simple={simple} />
                <span className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            <Leaf className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">Mode simple</span>
            <span className="block text-xs text-slate-400">Moins de couleurs, plus doux pour les yeux</span>
          </span>
          <Switch checked={simple} onCheckedChange={(on) => chooseTheme(composeTheme(base, on))} aria-label="Mode simple" />
        </label>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Raccourcis</h2>
        <div className={section}>
          <Link href="/salary" className={rowClass}>
            <RowIcon className="from-emerald-400 to-teal-600">
              <Banknote className="h-4 w-4" />
            </RowIcon>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">Salaire</span>
              <span className="block text-xs text-slate-400">Montant, jour de paie, cash ou carte</span>
            </span>
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </Link>
          <Link href="/categories" className={rowClass}>
            <RowIcon className="from-violet-400 to-purple-600">
              <Tags className="h-4 w-4" />
            </RowIcon>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">Catégories</span>
              <span className="block text-xs text-slate-400">Ajouter, renommer, ordonner</span>
            </span>
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Sauvegarde des données</h2>
        <div className={section}>
          <a href="/api/export" download className={rowClass}>
            <RowIcon className="from-sky-400 to-blue-600">
              <Download className="h-4 w-4" />
            </RowIcon>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">Exporter</span>
              <span className="block text-xs text-slate-400">Télécharger toutes tes données (JSON)</span>
            </span>
          </a>
          <button type="button" onClick={() => fileInputRef.current?.click()} className={rowClass}>
            <RowIcon className="from-amber-400 to-orange-500">
              <Upload className="h-4 w-4" />
            </RowIcon>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">Importer</span>
              <span className="block text-xs text-slate-400">Remplace toutes les données actuelles</span>
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
          title="Remplacer toutes les données ?"
          description={
            <>
              Toutes les données actuelles (dépenses, crédits, darets, objectifs…) seront remplacées par celles de «{" "}
              {pendingImport?.name} ». Cette action est irréversible.
            </>
          }
          confirmLabel="Importer"
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
    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm", className)}>
      {children}
    </span>
  );
}

/** A tiny phone screen in that theme (system: half light, half dark;
 *  simple: grey header instead of a coloured one). */
function ThemePreview({ kind, simple }: { kind: ThemeBase; simple: boolean }) {
  const screen = (dark: boolean) => (
    <span className={cn("flex h-full flex-1 flex-col gap-1 p-1.5", dark ? "bg-slate-900" : "bg-slate-50")}>
      <span
        className={cn(
          "h-3 rounded",
          simple ? (dark ? "bg-slate-700" : "bg-slate-300") : "bg-gradient-to-r from-emerald-400 to-cyan-500",
        )}
      />
      <span className={cn("h-2 rounded", dark ? "bg-slate-700" : "bg-white shadow-sm")} />
      <span className={cn("h-2 rounded", dark ? "bg-slate-700" : "bg-white shadow-sm")} />
      <span className={cn("h-2 w-2/3 rounded", dark ? "bg-slate-700" : "bg-white shadow-sm")} />
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
