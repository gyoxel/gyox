"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Check, Clock, Coins, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import type { Expense, PaymentMethod } from "@/lib/types";
import { addMonths, monthKey, monthLabelShortFr, monthOfDateStr, todayDateStr } from "@/lib/date";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { useNavBack } from "@/lib/nav-history";
import { monthlyFor } from "@/lib/plan";
import { useRefreshData } from "@/lib/use-refresh-data";
import { errorMessage, keepAboveKeyboard, syncPaymentStatus, type PaymentStatusInit } from "@/components/expense-editor";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { Switch } from "@/components/ui/switch";
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

  // The credit's full amount; what's already repaid comes off it.
  const [total, setTotal] = useState(
    toDecimalInput(expense ? Math.round(((expense.creditInitialAmount ?? 0) + (expense.creditPriorPaid ?? 0)) * 100) / 100 || null : null),
  );
  const [name, setName] = useState(expense?.name ?? "");
  const [mode, setMode] = useState<Mode>("monthly");
  const [monthly, setMonthly] = useState(toDecimalInput(expense?.amount ?? null));
  const initialMonths =
    expense?.creditInitialAmount && expense.amount > 0
      ? String(Math.ceil(expense.creditInitialAmount / expense.amount - 1e-9))
      : "";
  const [months, setMonths] = useState(initialMonths);
  const [alreadyPaid, setAlreadyPaid] = useState(isEdit ? (paymentStatus?.paid ?? false) : false);
  const [method, setMethod] = useState<PaymentMethod>(paymentStatus?.method ?? "cash");
  const [notes, setNotes] = useState(expense?.notes ?? "");
  // Repaid before the credit was added here (display only, not in the Solde).
  const [priorPaid, setPriorPaid] = useState(toDecimalInput(expense?.creditPriorPaid || null));
  const [priorOpen, setPriorOpen] = useState((expense?.creditPriorPaid ?? 0) > 0);
  // New credit: the money borrowed comes in (an income, cash or card).
  const [received, setReceived] = useState(true);
  const [receivedMethod, setReceivedMethod] = useState<PaymentMethod>("cash");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fullTotal = parseDecimalInput(total);
  const priorValue = priorOpen ? parseDecimalInput(priorPaid) : 0;
  // Still to repay: the plan, suggestions and limits all work on this.
  const totalValue = Math.max(0, Math.round((fullTotal - priorValue) * 100) / 100);
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

  // "+" in a suggestion row: try any duration / amount, see the result,
  // and pick it — without adding it to the suggestions.
  const [custom, setCustom] = useState<"months" | "amount" | null>(null);
  const [customValue, setCustomValue] = useState("");
  const customNumber = custom === "months" ? Math.floor(Number(customValue) || 0) : parseDecimalInput(customValue);
  const customResult =
    totalValue > 0 && customNumber > 0
      ? custom === "months"
        ? customNumber <= MAX_MONTHS
          ? `${money(monthlyFor(totalValue, customNumber))} / mois`
          : null
        : `${Math.ceil(totalValue / customNumber - 1e-9)} mois`
      : null;
  function openCustom(row: "months" | "amount") {
    setCustomValue("");
    setCustom((c) => (c === row ? null : row));
  }
  function applyCustom() {
    if (!customResult) return;
    if (custom === "months") pickMonths(customNumber);
    else pickMonthly(customNumber);
    setCustom(null);
  }

  const monthSuggestions = totalValue > 0 ? MONTH_STEPS.filter((n) => monthlyFor(totalValue, n) >= 50) : [];
  // Shortest duration first (biggest amount first).
  const amountSuggestions =
    totalValue > 0 ? AMOUNT_STEPS.filter((n) => n < totalValue && totalValue / n <= 120).sort((a, b) => b - a) : [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(fullTotal > 0)) return setError("Indique le montant total du crédit.");
    if (!(totalValue > 0)) return setError("Le montant déjà remboursé doit être inférieur au total.");
    if (!name.trim()) return setError("Indique un nom.");
    if (mode === "months" && (monthsValue < 1 || monthsValue > MAX_MONTHS)) return setError("Indique le nombre de mois.");
    if (!(monthlyValue > 0)) return setError("Indique le montant par mois.");
    // (An older credit saved that way keeps it until its plan is changed.)
    const planChanged = !isEdit || monthlyValue !== expense.amount || totalValue !== expense.creditInitialAmount;
    if (planChanged && monthlyValue > totalValue) {
      return setError("Le montant par mois ne peut pas dépasser ce qu'il reste à rembourser.");
    }

    const fields = {
      name: name.trim(),
      amount: monthlyValue,
      notes: notes.trim() || null,
      type: "credit",
      frequency: "monthly",
      color: "blue",
      endDate: null,
      creditInitialAmount: totalValue,
      creditPriorPaid: priorValue > 0 ? priorValue : null,
    };

    startTransition(async () => {
      if (isEdit) {
        const res = await fetch(`/api/expenses/${expense.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        if (!res.ok) return setError(await errorMessage(res));
        if (paymentStatus && !(await syncPaymentStatus(expense.id, paymentStatus, alreadyPaid, method))) {
          toast.error("Enregistré, mais le statut de paiement n'a pas pu être mis à jour.");
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
          icon: null,
          categoryId: null,
          linkedExpenseId: null,
        }),
      });
      if (!res.ok) return setError(await errorMessage(res));
      const created: { id: string } = await res.json();
      if (received) {
        const incomeRes = await fetch("/api/incomes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `Crédit · ${name.trim()}`,
            amount: totalValue,
            category: "credit",
            date: todayDateStr(),
            method: receivedMethod,
            notes: null,
            expenseId: created.id,
          }),
        });
        if (!incomeRes.ok) toast.error("Crédit ajouté, mais l'argent reçu n'a pas pu être enregistré.");
      }
      if (alreadyPaid) {
        const paidRes = await fetch(`/api/expenses/${created.id}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ monthKey: monthKey(monthOfDateStr(startDate)), method }),
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
      <div className="relative flex flex-col items-center gap-1 overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 to-blue-700 px-4 py-5 text-white shadow-lg dark:shadow-none">
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
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Ahmed, Louza, Solaih…" />
      </div>

      {/* Already repaid before it was added here */}
      {priorOpen ? (
        <div className="flex flex-col gap-1.5 rounded-2xl border border-sky-200 bg-sky-50/60 p-3 dark:border-sky-900 dark:bg-sky-950/30">
          <div className="flex items-center justify-between">
            <Label htmlFor="priorPaid">Montant déjà remboursé</Label>
            <button
              type="button"
              onClick={() => {
                setPriorOpen(false);
                setPriorPaid("");
              }}
              aria-label="Retirer le montant déjà remboursé"
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-white dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id="priorPaid"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={priorPaid}
              onChange={(e) => setPriorPaid(cleanDecimalInput(e.target.value))}
              placeholder="Ex : 4000"
            />
            <span className="shrink-0 text-sm text-slate-500">DH</span>
          </div>
          {fullTotal > 0 && priorValue > 0 && (
            <p className="text-sm text-sky-800 dark:text-sky-200">
              Reste à rembourser : <b>{money(totalValue)}</b>
            </p>
          )}
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Déjà remboursé avant d&apos;ajouter ce crédit ici : retiré du total, pas de ton solde.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPriorOpen(true)}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sky-200 py-3 text-sm font-semibold text-sky-700 active:bg-sky-50 dark:border-sky-900 dark:text-sky-300 dark:active:bg-sky-950/30"
        >
          <Plus className="h-4 w-4" />
          Montant déjà remboursé
        </button>
      )}

      {/* The money borrowed comes in (new credit only) */}
      {!isEdit && (
        <div className="flex flex-col gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">J&apos;ai reçu cet argent</span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                {totalValue > 0 ? `+${money(totalValue)} ` : ""}ajouté à ton solde comme revenu, aujourd&apos;hui
                {priorValue > 0 ? " (total − déjà remboursé)" : ""}
              </span>
            </span>
            <Switch checked={received} onCheckedChange={setReceived} aria-label="J'ai reçu cet argent" />
          </label>
          {received && <PaymentMethodPicker value={receivedMethod} onChange={setReceivedMethod} label="Reçu en" />}
        </div>
      )}

      {/* Per month OR number of months */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
        {totalValue > 0 && monthlyValue > totalValue && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            Le montant par mois ({money(monthlyValue)}) dépasse {priorValue > 0 ? "le reste à rembourser" : "le total du crédit"} (
            {money(totalValue)}).
          </p>
        )}
        {/* Live result, on top */}
        {plan ? (
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-sky-50 p-3 text-center dark:bg-sky-950/40">
            <Stat label="Par mois" value={money(monthlyValue)} highlight={mode === "months"} />
            <Stat label="Durée" value={`${plan.count} mois`} highlight={mode === "monthly"} />
            <Stat label="Fin" value={monthLabelShortFr(plan.end)} />
            {plan.last !== monthlyValue && (
              <p className="col-span-3 text-[11px] text-slate-500 dark:text-slate-400">
                {mode === "months" && plan.count > monthsValue ? (
                  <>
                    Arrondi à {money(monthlyValue)} : il faut <b>{plan.count} mois</b>, dernier versement{" "}
                    <b>{money(plan.last)}</b>.
                  </>
                ) : (
                  <>
                    Dernier versement (le reste) : <b>{money(plan.last)}</b>
                  </>
                )}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Indique le total, puis le montant par mois ou le nombre de mois.</p>
        )}

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

        {/* Suggestions */}
        {totalValue > 0 && (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <Sparkles className="h-3.5 w-3.5" />
              Suggestions
            </p>
            <SuggestionRow label="Selon la durée">
              <PlusChip open={custom === "months"} onClick={() => openCustom("months")} label="Autre durée" />
              {monthSuggestions.map((n) => (
                <Chip key={n} selected={mode === "months" && monthsValue === n} onClick={() => pickMonths(n)}>
                  <b>{n} mois</b>
                  <span className="text-[10px] opacity-75">{money(monthlyFor(totalValue, n))}/mois</span>
                </Chip>
              ))}
            </SuggestionRow>
            {custom === "months" && (
              <CustomTry
                inputMode="numeric"
                unit="mois"
                placeholder="Ex: 15"
                value={customValue}
                onChange={(v) => setCustomValue(v.replace(/\D/g, "").slice(0, 3))}
                result={customResult}
                onApply={applyCustom}
                onClose={() => setCustom(null)}
              />
            )}
            <SuggestionRow label="Selon le montant">
              <PlusChip open={custom === "amount"} onClick={() => openCustom("amount")} label="Autre montant" />
              {amountSuggestions.map((n) => (
                <Chip key={n} selected={mode === "monthly" && monthlyValue === n} onClick={() => pickMonthly(n)}>
                  <b>{money(n)}</b>
                  <span className="text-[10px] opacity-75">{Math.ceil(totalValue / n - 1e-9)} mois</span>
                </Chip>
              ))}
            </SuggestionRow>
            {custom === "amount" && (
              <CustomTry
                inputMode="decimal"
                unit="DH / mois"
                placeholder="Ex: 1200"
                value={customValue}
                onChange={(v) => setCustomValue(cleanDecimalInput(v))}
                result={customResult}
                onApply={applyCustom}
                onClose={() => setCustom(null)}
              />
            )}
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
          {/* Always shown: picking cash / card also marks it paid. */}
          <div className={cn("transition-opacity", !alreadyPaid && "opacity-60")}>
            <PaymentMethodPicker
              value={method}
              onChange={(m) => {
                setMethod(m);
                setAlreadyPaid(true);
              }}
            />
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
        <Button type="submit" className="flex-1 bg-blue-600 text-white hover:bg-blue-700" disabled={isPending}>
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
          "whitespace-nowrap text-sm font-bold tabular-nums",
          highlight ? "text-blue-700 dark:text-sky-300" : "text-slate-800 dark:text-slate-100",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** First chip of a suggestion row: opens the "try your own" field. */
function PlusChip({ open, onClick, label }: { open: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={open}
      className={cn(
        "flex w-11 shrink-0 items-center justify-center rounded-xl border border-dashed transition-colors",
        open
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-blue-300 bg-blue-50 text-blue-600 active:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-sky-300",
      )}
    >
      <Plus className={cn("h-4 w-4 transition-transform", open && "rotate-45")} />
    </button>
  );
}

/** Try a value: the result shows right away; "Choisir" applies it. */
function CustomTry({
  inputMode,
  unit,
  placeholder,
  value,
  onChange,
  result,
  onApply,
  onClose,
}: {
  inputMode: "numeric" | "decimal";
  unit: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  result: string | null;
  onApply: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50/60 p-2.5 dark:border-blue-900/60 dark:bg-blue-950/30">
      {/* Result first, so it stays visible above the keyboard */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {result ? (
            <>
              = <b className="text-blue-700 dark:text-sky-300">{result}</b>
            </>
          ) : (
            <span className="text-xs text-slate-400">Le résultat s&apos;affiche ici.</span>
          )}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="rounded-lg p-1 text-slate-400 hover:bg-white/70 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Input
            type="text"
            inputMode={inputMode}
            autoComplete="off"
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={(e) => keepAboveKeyboard(e.currentTarget)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onApply();
              }
            }}
            placeholder={placeholder}
            aria-label={unit}
            className="h-10 bg-white pr-16 dark:bg-slate-900"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {unit}
          </span>
        </div>
        <Button
          type="button"
          className="h-10 shrink-0 bg-blue-600 px-3 text-white hover:bg-blue-700"
          onClick={onApply}
          disabled={!result}
        >
          <Check className="h-4 w-4" />
          Choisir
        </Button>
      </div>
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
