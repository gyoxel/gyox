"use client";

import { useRef, useState, useTransition } from "react";
import { useRefreshData } from "@/lib/use-refresh-data";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import type { Settings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export function SettingsForm({ settings }: { settings: Settings }) {
  const refreshData = useRefreshData();
  const [salary, setSalary] = useState(String(settings.salary));
  const [savingsTarget, setSavingsTarget] = useState(String(settings.savingsTarget));
  const [startMonth, setStartMonth] = useState(settings.startMonth);
  const [theme, setTheme] = useState(settings.theme);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salary: Number(salary),
          currency: "MAD",
          savingsTarget: Number(savingsTarget),
          startMonth,
          theme,
        }),
      });
      if (!res.ok) {
        setError("Impossible d'enregistrer les réglages.");
        return;
      }
      toast.success("Réglages enregistrés. Tous les calculs sont mis à jour.");
      await refreshData();
    });
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="salary">Salaire mensuel (DH)</Label>
          <Input id="salary" type="number" min="0.01" step="0.01" value={salary} onChange={(e) => setSalary(e.target.value)} required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currency">Devise</Label>
          <Select id="currency" value="MAD" disabled>
            <option value="MAD">MAD / DH</option>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="savingsTarget">Objectif d&apos;épargne mensuel (DH)</Label>
          <Input
            id="savingsTarget"
            type="number"
            min="0"
            step="0.01"
            value={savingsTarget}
            onChange={(e) => setSavingsTarget(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startMonth">Mois de départ (navigation)</Label>
          <Input
            id="startMonth"
            type="month"
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="theme">Thème</Label>
          <Select id="theme" value={theme} onChange={(e) => setTheme(e.target.value as Settings["theme"])}>
            <option value="system">Système</option>
            <option value="light">Clair</option>
            <option value="dark">Sombre</option>
          </Select>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>

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
              if (file) handleImportFile(file);
              e.target.value = "";
            }}
          />
          <p className="text-xs text-slate-400">
            L&apos;import remplace toutes les données actuelles par celles du fichier.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
