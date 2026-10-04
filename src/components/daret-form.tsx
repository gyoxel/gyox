"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { pagesGone, useNavBack } from "@/lib/nav-history";
import { useRefreshData } from "@/lib/use-refresh-data";
import { addMonths, monthKey, monthLabelFr, monthLabelShortFr, parseMonthKey, todayMonth } from "@/lib/date";
import type { DaretWithExpense } from "@/lib/types";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_MEMBERS = 2;
const MAX_MEMBERS = 60;

/**
 * Ajouter / modifier une daret: the monthly contribution on top (with what
 * the pot will be), the name, the number of members (− / +), the first
 * month (‹ ›) and the user's turn picked among the daret's months.
 */
export function DaretForm({ currency, daret }: { currency: string; daret?: DaretWithExpense }) {
  const isEdit = daret != null;
  const nav = useNavBack();
  const refreshData = useRefreshData();
  const [name, setName] = useState(daret?.expense.name ?? "");
  const [amount, setAmount] = useState(toDecimalInput(daret?.expense.amount ?? null));
  const [members, setMembers] = useState(daret?.members ?? 10);
  const [startMonth, setStartMonth] = useState(() => daret?.expense.startDate.slice(0, 7) ?? monthKey(todayMonth()));
  const [turnMonth, setTurnMonth] = useState(() => daret?.turnMonth ?? monthKey(todayMonth()));
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const money = (n: number) => formatMoney(n, currency);

  const start = parseMonthKey(startMonth);
  const months = useMemo(
    () => Array.from({ length: members }, (_, i) => addMonths(parseMonthKey(startMonth), i)),
    [startMonth, members],
  );
  // Keep the chosen turn within the daret when the start / members change.
  const turnIndex = Math.max(0, months.findIndex((m) => monthKey(m) === turnMonth));
  const effectiveTurn = months[turnIndex];
  const amountValue = parseDecimalInput(amount);
  const payout = amountValue > 0 ? amountValue * members : 0;
  const end = months[months.length - 1];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(amountValue > 0)) return setError("Indique la cotisation par mois.");
    startTransition(async () => {
      const res = await fetch(isEdit ? `/api/darets/${daret.id}` : "/api/darets", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Daret",
          amount: amountValue,
          members,
          startMonth,
          turnMonth: monthKey(effectiveTurn),
        }),
      });
      if (!res.ok) return setError(await errorMessage(res));
      await refreshData();
      toast.success(isEdit ? "Daret modifiée." : "Daret ajoutée.");
      nav.back("/daret");
    });
  }

  function remove() {
    if (!daret) return;
    startTransition(async () => {
      const res = await fetch(`/api/darets/${daret.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Suppression impossible.");
        return;
      }
      const gone = await pagesGone(res);
      setConfirmDelete(false);
      await refreshData();
      toast.success("Daret supprimée.");
      nav.leave(gone, "/daret");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Contribution and pot */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-400 via-emerald-500 to-[#007261] px-4 pb-4 pt-5 text-white shadow-lg shadow-emerald-600/20 dark:shadow-none">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
        <Label htmlFor="amount" className="relative block text-center text-xs text-white/80">
          Cotisation par mois
        </Label>
        <div className="relative mt-1 flex items-baseline justify-center gap-2">
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
        <div className="relative mt-4 flex items-center justify-between rounded-2xl bg-white/15 px-3.5 py-2.5 text-sm">
          <span className="text-white/85">
            × {members} membres
          </span>
          <span className="font-bold tabular-nums">🎉 {payout > 0 ? money(payout) : "—"}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Daret famille" maxLength={80} />
      </div>

      {/* Members */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <span>
          <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">Membres</span>
          <span className="block text-[11px] text-slate-400">= nombre de mois</span>
        </span>
        <div className="flex items-center gap-2">
          <StepButton label="Un membre de moins" onClick={() => setMembers((n) => Math.max(MIN_MEMBERS, n - 1))} disabled={members <= MIN_MEMBERS}>
            <Minus className="h-4 w-4" />
          </StepButton>
          <span className="w-8 text-center text-lg font-bold tabular-nums text-slate-900 dark:text-white">{members}</span>
          <StepButton label="Un membre de plus" onClick={() => setMembers((n) => Math.min(MAX_MEMBERS, n + 1))} disabled={members >= MAX_MEMBERS}>
            <Plus className="h-4 w-4" />
          </StepButton>
        </div>
      </div>

      {/* First month */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">Premier mois</span>
        <div className="flex items-center gap-1">
          <StepButton label="Mois précédent" onClick={() => setStartMonth(monthKey(addMonths(start, -1)))}>
            <ChevronLeft className="h-4 w-4" />
          </StepButton>
          <span className="w-32 text-center text-sm font-semibold capitalize text-slate-900 dark:text-white">{monthLabelFr(start)}</span>
          <StepButton label="Mois suivant" onClick={() => setStartMonth(monthKey(addMonths(start, 1)))}>
            <ChevronRight className="h-4 w-4" />
          </StepButton>
        </div>
      </div>

      {/* Turn */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between px-1">
          <Label>Mon tour</Label>
          <span className="text-[11px] text-slate-400">le mois où tu reçois la daret</span>
        </div>
        <div role="radiogroup" aria-label="Mon tour" className="grid grid-cols-4 gap-2">
          {months.map((m, i) => {
            const selected = i === turnIndex;
            return (
              <button
                key={monthKey(m)}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTurnMonth(monthKey(m))}
                className={cn(
                  "flex flex-col items-center rounded-xl border px-1 py-2 transition-colors",
                  selected
                    ? "border-transparent bg-gradient-to-br from-teal-400 to-emerald-600 text-white shadow-md shadow-emerald-500/25"
                    : "border-slate-200 bg-white text-slate-600 active:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                )}
              >
                <span className={cn("text-[10px] font-semibold", selected ? "text-white/80" : "text-slate-400")}>{i + 1}</span>
                <span className="text-xs font-semibold">{monthLabelShortFr(m).replace(/ 20(\d\d)$/, " $1")}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-2xl bg-[#019c86]/10 px-4 py-3 text-sm text-[#007261] dark:bg-[#019c86]/15 dark:text-teal-200">
        <p>
          Du <b className="capitalize">{monthLabelFr(start)}</b> au <b className="capitalize">{monthLabelFr(end)}</b> · {members} mois
        </p>
        {payout > 0 && (
          <p className="mt-0.5">
            Tu reçois <b>{money(payout)}</b> en <b className="capitalize">{monthLabelFr(effectiveTurn)}</b> (tour {turnIndex + 1}/{members}).
          </p>
        )}
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => nav.back("/daret")}>
          Annuler
        </Button>
        <Button type="submit" className="flex-1 bg-[#019c86] text-white hover:bg-[#007261] dark:bg-[#019c86] dark:text-white" disabled={isPending}>
          {isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter la daret"}
        </Button>
      </div>

      {isEdit && (
        <>
          <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)} disabled={isPending}>
            <Trash2 className="h-4 w-4" />
            Supprimer cette daret
          </Button>
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title="Supprimer cette daret ?"
            description={<>« {daret.expense.name} » et ses cotisations enregistrées seront définitivement supprimées.</>}
            pending={isPending}
            onConfirm={remove}
          />
        </>
      )}
    </form>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors active:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:active:bg-slate-800"
    >
      {children}
    </button>
  );
}
