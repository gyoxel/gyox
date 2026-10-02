"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRefreshData } from "@/lib/use-refresh-data";
import type { Settings } from "@/lib/types";
import { cleanDecimalInput, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/** Salaire: the monthly amount, and the day it arrives (the Accueil
 *  countdown counts down to that day). */
export function SalaryForm({ settings }: { settings: Settings }) {
  const refreshData = useRefreshData();
  const [salary, setSalary] = useState(toDecimalInput(settings.salary));
  const [payDay, setPayDay] = useState(String(settings.payDay));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salary: parseDecimalInput(salary), payDay: Number(payDay) }),
      });
      if (!res.ok) {
        setError("Impossible d'enregistrer. Vérifie le montant.");
        return;
      }
      toast.success("Salaire enregistré. Tous les calculs sont mis à jour.");
      await refreshData();
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="salary">Salaire mensuel (DH)</Label>
            <Input
              id="salary"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={salary}
              onChange={(e) => setSalary(cleanDecimalInput(e.target.value))}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payDay">Jour du salaire</Label>
            <Select id="payDay" value={payDay} onChange={(e) => setPayDay(e.target.value)}>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  Le {d === 1 ? "1er" : d} du mois
                </option>
              ))}
            </Select>
            <p className="text-xs text-slate-400">
              Le compte à rebours de l&apos;accueil compte jusqu&apos;à ce jour. Si le mois est plus court, c&apos;est son
              dernier jour.
            </p>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
