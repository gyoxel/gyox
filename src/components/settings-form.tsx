"use client";

import { useEffect, useRef, useState } from "react";
import { useRefreshData } from "@/lib/use-refresh-data";
import { Download, Monitor, Moon, Sun, Upload } from "lucide-react";
import { toast } from "sonner";
import type { Settings } from "@/lib/types";
import { THEME_STORAGE_KEY, applyTheme, type ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/confirm-dialog";

const THEMES: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Système", icon: Monitor },
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
];

/** Paramètres: theme (applied instantly) and data backup. */
export function SettingsForm({ settings }: { settings: Settings }) {
  const refreshData = useRefreshData();
  const [theme, setTheme] = useState<ThemeChoice>(settings.theme);
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

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Thème</h2>
          <div role="radiogroup" aria-label="Thème" className="grid grid-cols-3 gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                onClick={() => chooseTheme(value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-sm font-medium transition-colors",
                  theme === value
                    ? "border-[#019c86] bg-[#019c86]/10 text-[#007261] dark:text-teal-300"
                    : "border-slate-200 text-slate-600 active:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:active:bg-slate-800",
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sauvegarde des données</h2>
          <Button asChild variant="outline">
            <a href="/api/export" download>
              <Download className="h-4 w-4" />
              Exporter (JSON)
            </a>
          </Button>
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Importer un fichier JSON
          </Button>
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
          <p className="text-xs text-slate-400">
            L&apos;import remplace toutes les données actuelles par celles du fichier.
          </p>
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
        </CardContent>
      </Card>
    </div>
  );
}
