"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Check, Clock, Coins, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Expense } from "@/lib/types";
import { addMonths, monthKey, monthLabelFr, monthOfDateStr, todayDateStr } from "@/lib/date";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { useNavBack } from "@/lib/nav-history";
import { useRefreshData } from "@/lib/use-refresh-data";
import { errorMessage, keepAboveKeyboard, type PaymentStatusInit } from "@/components/expense-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MAX_MONTHS = 600;
const MONTH_STEPS = [3, 6, 10, 12, 18, 24, 36];
const AMOUNT_STEPS = [200, 500, 1000, 1500, 2000, 3000, 5000];

type Mode = "monthly" | "months";

/** Schedule of a credit: number of installments, end month, last one. */
function schedule(total: number, monthly: number, startDate: string) {
  if (!(total > 0) || !(monthly > 0)) return null;
  const count = Math.ceil(total / monthly - 1e-9);
  const last = Math.round((total - (count - 1) * monthly) * 100) / 100;
  return { count, last, end: addMonths(monthOfDateStr(startDate), count - 1) };
}

/** Monthly amount to repay `total` in `months` (rounded up to the dirham). */
const monthlyFor = (total: number, months: number) => Math.ceil(total / months);

/**
 * Ajouter / modifier un crédit: the total on top, then either the amount
 * per month or the number of months (one computes the other), suggestions
 * for both, and a live summary (installments, end, last payment).
 */
export function CreditEditor({
  expense,
  paymentStatus,
}: {
  /** Present when editing. */
  expense?: Expense;
  paymentStatus?: PaymentStatusInit | null;
}) {
  const isEdit = expense != null;
  const nav = useNavBack();
  const refreshData = useRefreshData();
  const startDate = expense?.startDate ?? todayDateStr();

  const [total, setTotal] = useState(toDecimalInput(expense?.creditInitialAmount ?? null));
  const [name, setName] = useState(expense?.name ?? "");
  const [mode, setMode] = useState<Mode>("monthly");
  const [monthly, setMonthly] = useState(toDecimalInput(expense?.amount ?? null));
  const initialMonths =
    expense?.creditInitialAmount && expense.amount > 0
      ? String(Math.ceil(expense.creditInitialAmount / expense.amount - 1e-9))
      : "";
  const [months, setMonths] = useState(initialMonths);
  const [alreadyPaid, setAlreadyPaid] = useState(isEdit ? (paymentStatus?.paid ?? false) : false);
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalValue = parseDecimalInput(total);
  const monthsValue = Math.floor(Number(months) || 0);
  // The amount per month actually saved: typed, or derived from the months.
  const monthlyValue =
    mode === "monthly" ? parseDecimalInput(monthly) : totalValue > 0 && monthsValue > 0 ? monthlyFor(totalValue, monthsValue) : 0;
  const plan = schedule(totalValue, monthlyValue, startDate);
  const money = (n: number) => formatMoney(n);

  function pickMonths(n: number) {
    setMode("months");
    setMonths(String(n));
    setMonthly(toDecimalInput(monthlyFor(totalValue, n)));
  }
  function pickMonthly(n: number) {
    setMode("monthly");
    setMonthly(toDecimalInput(n));
    setMonths(String(Math.ceil(totalValue / n - 1e-9)));
  }
  function switchMode(next: Mode) {
    // Carry the current plan over so switching never loses what was typed.
    if (next === "months" && plan) setMonths(String(plan.count));
    if (next === "monthly" && monthlyValue > 0) setMonthly(toDecimalInput(monthlyValue));
    setMode(next);
  }

  const monthSuggestions = totalValue > 0 ? MONTH_STEPS.filter((n) => monthlyFor(totalValue, n) >= 50) : [];
  const amountSuggestions = totalValue > 0 ? AMOUNT_STEPS.filter((n) => n < totalValue && totalValue / n <= 120) : [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(totalValue > 0)) return setError("Indique le montant total du crédit.");
    if (!name.trim()) return setError("Indique un nom.");
    if (mode === "months" && (monthsValue < 1 || monthsValue > MAX_MONTHS)) return setError("Indique le nombre de mois.");
    if (!(monthlyValue > 0)) return setError("Indique le montant par mois.");

    const fields = {
      name: name.trim(),
      amount: monthlyValue,
      notes: notes.trim() || null,
      type: "credit",
      frequency: "monthly",
      color: "blue",
      endDate: null,
      creditInitialAmount: totalValue,
    };

    startTransition(async () => {
      if (isEdit) {
        const res = await fetch(`/api/expenses/${expense.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        if (!res.ok) return setError(await errorMessage(res));
        if (paymentStatus && alreadyPaid !== paymentStatus.paid) {
          const payRes = alreadyPaid
            ? await fetch(`/api/expenses/${expense.id}/payments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ monthKey: paymentStatus.monthKey }),
              })
            : await fetch(`/api/expenses/${expense.id}/payments?monthKey=${paymentStatus.monthKey}`, { method: "DELETE" });
          if (!payRes.ok) toast.error("Enregistré, mais le statut de paiement n'a pas pu être mis à jour.");
        }
        await refreshData();
        toast.success("Crédit enregistré.");
        nav.back();
        return;
      }

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fields,
          startDate,
          active: true,
          creditPriorPaid: null,
          icon: null,
          categoryId: null,
          linkedExpenseId: null,
        }),
      });
      if (!res.ok) return setError(await errorMessage(res));
      const created: { id: string } = await res.json();
      if (alreadyPaid) {
        const paidRes = await fetch(`/api/expenses/${created.id}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ monthKey: monthKey(monthOfDateStr(startDate)) }),
        });
        if (!paidRes.ok) toast.error("Ajouté, mais le paiement n'a pas pu être enregistré.");
      }
      await refreshData();
      toast.success("Crédit ajouté.");
      nav.back();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Total */}
      <div className="flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 px-4 py-5 text-white shadow-sm">
        <Label htmlFor="total" className="text-xs text-white/80">
          Montant total du crédit
        </Label>
        <div className="flex items-baseline gap-2">
          <input
            id="total"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={total}
            onChange={(e) => setTotal(cleanDecimalInput(e.target.value))}
            placeholder="0"
            style={{ width: `${Math.max(1, total.length) + 0.3}ch` }}
            className="max-w-[70vw] bg-transparent text-center text-4xl font-bold text-white outline-none placeholder:text-white/40"
          />
          <span className="text-lg font-semibold text-white/70">DH</span>
        </div>
        {isEdit && (expense.creditPriorPaid ?? 0) > 0 && (
          <p className="text-[11px] text-white/75">+ {money(expense.creditPriorPaid ?? 0)} déjà remboursés avant</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Dnya, Banque…" />
      </div>

      {/* Per month OR number of months */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
        <div role="radiogroup" aria-label="Mode de remboursement" className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <ModeButton selected={mode === "monthly"} onClick={() => switchMode("monthly")} icon={Coins}>
            Par mois
          </ModeButton>
          <span className="text-xs font-semibold uppercase text-slate-400">ou</span>
          <ModeButton selected={mode === "months"} onClick={() => switchMode("months")} icon={CalendarClock}>
            Nombre de mois
          </ModeButton>
        </div>

        {mode === "monthly" ? (
          <div className="flex items-center gap-2">
            <Input
              id="monthly"
              aria-label="Montant par mois (DH)"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={monthly}
              onChange={(e) => setMonthly(cleanDecimalInput(e.target.value))}
              placeholder="Ex: 1000"
              onFocus={(e) => keepAboveKeyboard(e.currentTarget)}
              className="text-base"
            />
            <span className="shrink-0 text-sm text-slate-500">DH / mois</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              id="months"
              aria-label="Nombre de mois"
              type="number"
              inputMode="numeric"
              min="1"
              max={MAX_MONTHS}
              step="1"
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              placeholder="Ex: 12"
              onFocus={(e) => keepAboveKeyboard(e.currentTarget)}
              className="text-base"
            />
            <span className="shrink-0 text-sm text-slate-500">mois</span>
          </div>
        )}

        {/* Live result */}
        {plan ? (
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-sky-50 p-3 text-center dark:bg-sky-950/40">
            <Stat label="Par mois" value={money(monthlyValue)} highlight={mode === "months"} />
            <Stat label="Durée" value={`${plan.count} mois`} highlight={mode === "monthly"} />
            <Stat label="Fin" value={monthLabelFr(plan.end)} />
            {plan.last !== monthlyValue && (
              <p className="col-span-3 text-[11px] text-slate-500 dark:text-slate-400">
                Dernier versement : <b>{money(plan.last)}</b>
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Indique le total, puis le montant par mois ou le nombre de mois.</p>
        )}

        {/* Suggestions */}
        {totalValue > 0 && (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <Sparkles className="h-3.5 w-3.5" />
              Suggestions
            </p>
            <SuggestionRow label="Selon la durée">
              {monthSuggestions.map((n) => (
                <Chip key={n} selected={mode === "months" && monthsValue === n} onClick={() => pickMonths(n)}>
                  <b>{n} mois</b>
                  <span className="text-[10px] opacity-75">{money(monthlyFor(totalValue, n))}/mois</span>
                </Chip>
              ))}
            </SuggestionRow>
            <SuggestionRow label="Selon le montant">
              {amountSuggestions.map((n) => (
                <Chip key={n} selected={mode === "monthly" && monthlyValue === n} onClick={() => pickMonthly(n)}>
                  <b>{money(n)}</b>
                  <span className="text-[10px] opacity-75">{Math.ceil(totalValue / n - 1e-9)} mois</span>
                </Chip>
              ))}
            </SuggestionRow>
          </div>
        )}
      </div>

      {(!isEdit || paymentStatus) && (
        <div className="flex flex-col gap-1.5">
          <Label>Statut de paiement {isEdit ? (paymentStatus?.hint ?? "") : "(1er mois)"}</Label>
          <div
            role="radiogroup"
            aria-label="Statut de paiement"
            className="flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
          >
            <button
              type="button"
              role="radio"
              aria-checked={alreadyPaid}
              onClick={() => setAlreadyPaid(true)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors duration-200",
                alreadyPaid ? "bg-emerald-500 text-white" : "bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400",
              )}
            >
              <Check className="h-4 w-4" />
              Payé
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={!alreadyPaid}
              onClick={() => setAlreadyPaid(false)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors duration-200",
                !alreadyPaid ? "bg-rose-500 text-white" : "bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400",
              )}
            >
              <Clock className="h-4 w-4" />
              Pas encore
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Note (optionnel)</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => nav.back()}>
          Annuler
        </Button>
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}

function ModeButton({
  selected,
  onClick,
  icon: Icon,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  icon: typeof Coins;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-2 text-[13px] font-medium transition-colors duration-200",
        selected
          ? "border-blue-600 bg-blue-600 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 active:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {children}
    </button>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={cn(
          "text-sm font-bold tabular-nums",
          highlight ? "text-blue-700 dark:text-sky-300" : "text-slate-800 dark:text-slate-100",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SuggestionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <div className="-mx-3.5 flex gap-1.5 overflow-x-auto px-3.5 pb-1 [scrollbar-width:none]">{children}</div>
    </div>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 flex-col items-center rounded-xl border px-3 py-1.5 text-xs leading-tight transition-colors",
        selected
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-slate-200 bg-white text-slate-700 active:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
      )}
    >
      {children}
    </button>
  );
}
