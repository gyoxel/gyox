"use client";

import { useState, useTransition } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, Coins, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { Loan, PaymentMethod } from "@/lib/types";
import { addMonths, monthKey, monthLabelFr, monthLabelShortFr, parseMonthKey, todayDateStr, todayMonth } from "@/lib/date";
import { monthlyFor, planFor } from "@/lib/plan";
import { loanDelete } from "@/lib/delete-specs";
import { useNavBack } from "@/lib/nav-history";
import { useRefreshData } from "@/lib/use-refresh-data";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { errorMessage, keepAboveKeyboard } from "@/components/expense-editor";
import { DeleteButton } from "@/components/delete-button";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Mode = "monthly" | "months";
const MONTH_STEPS = [1, 2, 3, 4, 6, 10, 12];

/**
 * Ajouter / modifier un prêt — a credit the other way round: the amount
 * lent on top, who to, whether it left cash / the card (then it's in
 * Dépenses), and how it comes back (per month or in how many months, from
 * which month). Each installment is then confirmed received on its page.
 */
export function LoanEditor({ loan }: { loan?: Loan }) {
  const isEdit = loan != null;
  const nav = useNavBack();
  const refreshData = useRefreshData();
  const [amount, setAmount] = useState(toDecimalInput(loan?.amount ?? null));
  const [name, setName] = useState(loan?.name ?? "");
  const [priorOpen, setPriorOpen] = useState((loan?.priorRepaid ?? 0) > 0);
  const [prior, setPrior] = useState(toDecimalInput(loan?.priorRepaid || null));
  const [fromSolde, setFromSolde] = useState(isEdit ? loan.method != null : true);
  const [method, setMethod] = useState<PaymentMethod>(loan?.method ?? "cash");
  const [mode, setMode] = useState<Mode>(isEdit ? "monthly" : "months");
  const [monthly, setMonthly] = useState(toDecimalInput(loan?.monthly ?? null));
  const [months, setMonths] = useState(loan ? String(loan.months) : "");
  const [start, setStart] = useState(loan ? parseMonthKey(loan.startMonth) : addMonths(todayMonth(), 1));
  const [note, setNote] = useState(loan?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const money = (n: number) => formatMoney(n);

  const amountValue = parseDecimalInput(amount);
  const priorValue = priorOpen ? parseDecimalInput(prior) : 0;
  const toRepay = Math.max(0, Math.round((amountValue - priorValue) * 100) / 100);
  const monthsValue = Math.floor(Number(months) || 0);
  const monthlyValue =
    mode === "monthly" ? parseDecimalInput(monthly) : toRepay > 0 && monthsValue > 0 ? monthlyFor(toRepay, monthsValue) : 0;
  const plan = planFor(toRepay, monthlyValue);

  function switchMode(next: Mode) {
    if (next === "months" && plan) setMonths(String(plan.count));
    if (next === "monthly" && monthlyValue > 0) setMonthly(toDecimalInput(monthlyValue));
    setMode(next);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(amountValue > 0)) return setError("Indique le montant prêté.");
    if (!name.trim()) return setError("Indique à qui tu as prêté.");
    if (!(toRepay > 0)) return setError("Le montant déjà rendu doit être inférieur au montant prêté.");
    if (!(monthlyValue > 0)) return setError("Indique le montant par mois ou le nombre de mois.");
    if (monthlyValue > toRepay) return setError("Le montant par mois ne peut pas dépasser ce qu'il reste à rendre.");
    const body = {
      name: name.trim(),
      amount: amountValue,
      priorRepaid: priorValue > 0 ? priorValue : null,
      date: loan?.date ?? todayDateStr(),
      method: fromSolde ? method : null,
      monthly: monthlyValue,
      startMonth: monthKey(start),
      note: note.trim() || null,
    };
    startTransition(async () => {
      const res = await fetch(isEdit ? `/api/loans/${loan.id}` : "/api/loans", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return setError(await errorMessage(res));
      await refreshData();
      toast.success(isEdit ? "Prêt enregistré." : "Prêt ajouté.");
      nav.back("/prets");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-700 px-4 py-5 text-white shadow-sm">
        <Label htmlFor="amount" className="text-xs text-white/80">
          Montant prêté
        </Label>
        <div className="flex items-baseline gap-2">
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(cleanDecimalInput(e.target.value))}
            placeholder="0"
            style={{ width: `${Math.max(1, amount.length) + 0.3}ch` }}
            className="max-w-[70vw] bg-transparent text-center text-4xl font-bold text-white outline-none placeholder:text-white/40"
          />
          <span className="text-lg font-semibold text-white/70">DH</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="À qui : un ami, la famille…" maxLength={60} />
      </div>

      {priorOpen ? (
        <div className="flex flex-col gap-1.5 rounded-2xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center justify-between">
            <Label htmlFor="prior">Montant déjà rendu</Label>
            <button
              type="button"
              onClick={() => {
                setPriorOpen(false);
                setPrior("");
              }}
              aria-label="Retirer le montant déjà rendu"
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-white dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id="prior"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={prior}
              onChange={(e) => setPrior(cleanDecimalInput(e.target.value))}
              placeholder="Ex : 1000"
            />
            <span className="shrink-0 text-sm text-slate-500">DH</span>
          </div>
          {amountValue > 0 && priorValue > 0 && (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Reste à te rendre : <b>{money(toRepay)}</b>
            </p>
          )}
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Déjà rendu avant d&apos;ajouter ce prêt ici : retiré du montant, pas ajouté à ton solde.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPriorOpen(true)}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-200 py-3 text-sm font-semibold text-amber-700 active:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:active:bg-amber-950/30"
        >
          <Plus className="h-4 w-4" />
          Montant déjà rendu
        </button>
      )}

      <div className="flex flex-col gap-2 rounded-2xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900 dark:bg-rose-950/30">
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">Cet argent sort de mon solde</span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">
              {toRepay > 0 ? `−${money(toRepay)} ` : ""}dans tes dépenses comme prêt
              {priorValue > 0 ? " (montant − déjà rendu)" : ""}
            </span>
          </span>
          <Switch checked={fromSolde} onCheckedChange={setFromSolde} aria-label="Cet argent sort de mon solde" />
        </label>
        {fromSolde && <PaymentMethodPicker value={method} onChange={setMethod} label="Pris en" />}
      </div>

      {/* How it comes back */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Remboursement</p>
        {plan ? (
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-amber-50 p-3 text-center dark:bg-amber-950/40">
            <Stat label="Par mois" value={money(monthlyValue)} />
            <Stat label="Durée" value={`${plan.count} mois`} />
            <Stat label="Fin" value={monthLabelShortFr(addMonths(start, plan.count - 1))} />
            {plan.last !== monthlyValue && (
              <p className="col-span-3 text-[11px] text-slate-500 dark:text-slate-400">
                Dernier remboursement (le reste) : <b>{money(plan.last)}</b>
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Indique le montant, puis combien par mois ou en combien de mois.</p>
        )}

        <div role="radiogroup" aria-label="Mode de remboursement" className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <ModeButton selected={mode === "months"} onClick={() => switchMode("months")} icon={CalendarClock}>
            Nombre de mois
          </ModeButton>
          <span className="text-xs font-semibold uppercase text-slate-400">ou</span>
          <ModeButton selected={mode === "monthly"} onClick={() => switchMode("monthly")} icon={Coins}>
            Par mois
          </ModeButton>
        </div>

        {mode === "monthly" ? (
          <div className="flex items-center gap-2">
            <Input
              aria-label="Montant par mois (DH)"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={monthly}
              onChange={(e) => setMonthly(cleanDecimalInput(e.target.value))}
              placeholder="Ex: 2500"
              onFocus={(e) => keepAboveKeyboard(e.currentTarget)}
              className="text-base"
            />
            <span className="shrink-0 text-sm text-slate-500">DH / mois</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Input
                aria-label="Nombre de mois"
                type="number"
                inputMode="numeric"
                min="1"
                max="600"
                step="1"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                placeholder="Ex: 2"
                onFocus={(e) => keepAboveKeyboard(e.currentTarget)}
                className="text-base"
              />
              <span className="shrink-0 text-sm text-slate-500">mois</span>
            </div>
            {toRepay > 0 && (
              <div className="-mx-3.5 flex gap-1.5 overflow-x-auto px-3.5 pb-1 [scrollbar-width:none]">
                {MONTH_STEPS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMonths(String(n))}
                    className={cn(
                      "flex shrink-0 flex-col items-center rounded-xl border px-3 py-1.5 text-xs leading-tight transition-colors",
                      monthsValue === n
                        ? "border-amber-600 bg-amber-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 active:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
                    )}
                  >
                    <b>{n} mois</b>
                    <span className="text-[10px] opacity-75">{money(monthlyFor(toRepay, n))}/mois</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-300">Premier remboursement</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Mois précédent"
              onClick={() => setStart((m) => addMonths(m, -1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-28 text-center text-sm font-semibold capitalize text-slate-800 dark:text-slate-100">
              {monthLabelFr(start)}
            </span>
            <button
              type="button"
              aria-label="Mois suivant"
              onClick={() => setStart((m) => addMonths(m, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">Note (optionnel)</Label>
        <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => nav.back("/prets")}>
          Annuler
        </Button>
        <Button type="submit" className="flex-1 bg-amber-600 text-white hover:bg-amber-700" disabled={pending}>
          {pending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter le prêt"}
        </Button>
      </div>

      {isEdit && <DeleteButton variant="full" {...loanDelete(loan)} />}
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
          ? "border-amber-600 bg-amber-600 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 active:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="whitespace-nowrap text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}
