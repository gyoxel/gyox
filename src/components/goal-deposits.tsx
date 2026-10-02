"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { GoalDeposit } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { useRefreshData } from "@/lib/use-refresh-data";

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

/** Every "+ Versement" of a goal: name, amount and (small) date; removable. */
export function GoalDeposits({ goalId, deposits, currency }: { goalId: string; deposits: GoalDeposit[]; currency: string }) {
  const refreshData = useRefreshData();
  const [removing, setRemoving] = useState<string | null>(null);

  async function remove(id: string) {
    setRemoving(id);
    const res = await fetch(`/api/goals/${goalId}/deposits/${id}`, { method: "DELETE" });
    setRemoving(null);
    if (!res.ok) return toast.error("Suppression impossible.");
    toast.success("Versement supprimé.");
    await refreshData();
  }

  if (deposits.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400 dark:border-slate-700">
        Aucun versement pour le moment — utilise « + Versement ».
      </p>
    );
  }

  return (
    <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {deposits.map((d) => (
        <li key={d.id} className="flex items-center gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0 dark:border-slate-800">
          <span className="text-lg leading-none">💵</span>
          <span className="flex min-w-0 flex-1 items-baseline gap-2">
            <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{d.name}</span>
            <span className="shrink-0 text-[11px] text-slate-400">{DATE_FMT.format(new Date(`${d.date}T12:00:00`))}</span>
          </span>
          <span className="text-sm font-semibold tabular-nums text-emerald-600">+{formatMoney(d.amount, currency)}</span>
          <button
            type="button"
            onClick={() => remove(d.id)}
            disabled={removing === d.id}
            aria-label={`Supprimer le versement ${d.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:text-rose-600 disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
