"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Income } from "@/lib/types";
import { INCOME_CATEGORIES } from "@/lib/income";
import { todayDateStr } from "@/lib/date";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { useNavBack } from "@/lib/nav-history";
import { useRefreshData } from "@/lib/use-refresh-data";
import { errorMessage } from "@/components/expense-editor";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Ajouter / modifier un revenu (on top of the salary): amount, category
 * (prime, freelance, cadeau…), name, date and a note. It adds to the money
 * of the month it's received.
 */
export function IncomeEditor({ income }: { income?: Income }) {
  const isEdit = income != null;
  const nav = useNavBack();
  const refreshData = useRefreshData();
  const [amount, setAmount] = useState(toDecimalInput(income?.amount ?? null));
  const [category, setCategory] = useState(income?.category ?? INCOME_CATEGORIES[0].key);
  const [name, setName] = useState(income?.name ?? "");
  const [nameTouched, setNameTouched] = useState(isEdit);
  const [date, setDate] = useState(income?.date ?? todayDateStr());
  const [notes, setNotes] = useState(income?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const amountValue = parseDecimalInput(amount);
  const selected = INCOME_CATEGORIES.find((c) => c.key === category) ?? INCOME_CATEGORIES[0];
  // Until a name is typed, the category's label is the name.
  const finalName = (nameTouched ? name : name || selected.label).trim();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(amountValue > 0)) return setError("Indique un montant.");
    if (!finalName) return setError("Indique un nom.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Indique une date.");
    const body = JSON.stringify({ name: finalName, amount: amountValue, category, date, notes: notes.trim() || null });
    startTransition(async () => {
      const res = await fetch(isEdit ? `/api/incomes/${income.id}` : "/api/incomes", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!res.ok) return setError(await errorMessage(res));
      await refreshData();
      toast.success(isEdit ? "Revenu modifié." : `+${formatMoney(amountValue)} ajouté à ton solde.`);
      nav.back("/incomes");
    });
  }

  function remove() {
    if (!income) return;
    startTransition(async () => {
      const res = await fetch(`/api/incomes/${income.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Suppression impossible.");
        return;
      }
      setConfirmDelete(false);
      await refreshData();
      toast.success("Revenu supprimé.");
      nav.back("/incomes");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Amount */}
      <div className="flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 px-4 py-5 text-white shadow-sm">
        <Label htmlFor="amount" className="text-xs text-white/80">
          Montant reçu
        </Label>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white/80">+</span>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(cleanDecimalInput(e.target.value))}
            placeholder="0"
            style={{ width: `${Math.max(1, amount.length) + 0.3}ch` }}
            className="max-w-[60vw] bg-transparent text-center text-4xl font-bold text-white outline-none placeholder:text-white/40"
          />
          <span className="text-lg font-semibold text-white/70">DH</span>
        </div>
      </div>

      {/* Category */}
      <div className="flex flex-col gap-2">
        <Label>Type de revenu</Label>
        <div role="radiogroup" aria-label="Type de revenu" className="grid grid-cols-3 gap-2">
          {INCOME_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={category === c.key}
              onClick={() => setCategory(c.key)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-xs font-medium transition-colors",
                category === c.key
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-200"
                  : "border-slate-200 bg-white text-slate-600 active:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
              )}
            >
              <span className="text-xl leading-none">{c.emoji}</span>
              <span className="truncate">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="name">Nom</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => {
              setNameTouched(true);
              setName(e.target.value);
            }}
            placeholder={selected.label}
            maxLength={60}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[9.5rem]" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Note (optionnel)</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => nav.back("/incomes")}>
          Annuler
        </Button>
        <Button type="submit" className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700" disabled={isPending}>
          {isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter le revenu"}
        </Button>
      </div>

      {isEdit && (
        <>
          <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)} disabled={isPending}>
            <Trash2 className="h-4 w-4" />
            Supprimer ce revenu
          </Button>
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title="Supprimer ce revenu ?"
            description={
              <>
                « {income.name} » ({formatMoney(income.amount)}) sera supprimé.
              </>
            }
            pending={isPending}
            onConfirm={remove}
          />
        </>
      )}
    </form>
  );
}
