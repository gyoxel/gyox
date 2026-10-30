"use client";

import { useState, useTransition } from "react";
import { CalendarCheck, CaretLeft, CaretRight, ClockCountdown, Coins, Plus, X } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import type { Loan, PaymentMethod } from "@/lib/types";
import { addMonths, monthKey, parseMonthKey, todayDateStr, todayMonth } from "@/lib/date";
import { monthLabel, monthLabelShort } from "@/lib/i18n/dates";
import { useI18n } from "@/lib/i18n/client";
import { monthlyFor, planFor } from "@/lib/plan";
import { loanDelete } from "@/lib/delete-specs";
import { useNavBack } from "@/lib/nav-history";
import { mutate } from "@/lib/use-refresh-data";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { errorMessage, keepAboveKeyboard } from "@/components/expense-editor";
import { DeleteButton } from "@/components/delete-button";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// « once »: all of it back in one month (the one picked below).
type Mode = "monthly" | "months" | "once";
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
  const { lang, t } = useI18n();
  const [amount, setAmount] = useState(toDecimalInput(loan?.amount ?? null));
  const [name, setName] = useState(loan?.name ?? "");
  const [priorOpen, setPriorOpen] = useState((loan?.priorRepaid ?? 0) > 0);
  const [prior, setPrior] = useState(toDecimalInput(loan?.priorRepaid || null));
  const [fromSolde, setFromSolde] = useState(isEdit ? loan.method != null : true);
  const [method, setMethod] = useState<PaymentMethod>(loan?.method ?? "cash");
  const [mode, setMode] = useState<Mode>(isEdit ? "monthly" : "months");
  const [monthly, setMonthly] = useState(toDecimalInput(loan?.monthly ?? null));
  const [months, setMonths] = useState(loan ? String(loan.months) : "");
  const [start, setStart] = useState(loan ? parseMonthKey(loan.startMonth) : todayMonth());
  const [note, setNote] = useState(loan?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const money = (n: number) => formatMoney(n);

  const amountValue = parseDecimalInput(amount);
  const priorValue = priorOpen ? parseDecimalInput(prior) : 0;
  const toRepay = Math.max(0, Math.round((amountValue - priorValue) * 100) / 100);
  const monthsValue = Math.floor(Number(months) || 0);
  // Neither a number of months nor an amount per month: all of it back at
  // once, in the month picked below (as « En une fois »).
  const nothingSet = mode !== "once" && !(mode === "months" ? months : monthly).trim();
  const monthlyValue =
    mode === "once" || nothingSet
      ? toRepay
      : mode === "monthly"
        ? parseDecimalInput(monthly)
        : toRepay > 0 && monthsValue > 0
          ? monthlyFor(toRepay, monthsValue)
          : 0;
  const plan = planFor(toRepay, monthlyValue);

  function switchMode(next: Mode) {
    const carry = !nothingSet && mode !== "once";
    if (carry && next === "months" && plan) setMonths(String(plan.count));
    if (carry && next === "monthly" && monthlyValue > 0) setMonthly(toDecimalInput(monthlyValue));
    setMode(next);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(amountValue > 0)) return setError(t("Indique le montant prêté."));
    if (!name.trim()) return setError(t("Indique à qui tu as prêté."));
    if (!(toRepay > 0)) return setError(t("Le montant déjà rendu doit être inférieur au montant prêté."));
    if (!(monthlyValue > 0)) return setError(t("Indique le montant par mois ou le nombre de mois."));
    if (monthlyValue > toRepay) return setError(t("Le montant par mois ne peut pas dépasser ce qu'il reste à rendre."));
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
      const res = await mutate({
        method: isEdit ? "PATCH" : "POST",
        path: isEdit ? `/api/loans/${loan.id}` : "/api/loans",
        body,
      });
      if (!res.ok) return setError(await errorMessage(res));
      toast.success(isEdit ? t("Enregistré.") : t("Argent prêté ajouté."));
      nav.back("/prets");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="relative flex flex-col items-center gap-1 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 to-orange-700 px-4 py-5 text-white shadow-lg dark:shadow-none">
        <Label htmlFor="amount" className="text-xs text-white/80">
          {t("Montant prêté")}
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
        <Label htmlFor="name">{t("Nom")}</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("À qui : Karim, Sara, Youssef…")} maxLength={60} />
      </div>

      {priorOpen ? (
        <div className="flex flex-col gap-1.5 rounded-2xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center justify-between">
            <Label htmlFor="prior">{t("Montant déjà rendu")}</Label>
            <button
              type="button"
              onClick={() => {
                setPriorOpen(false);
                setPrior("");
              }}
              aria-label={t("Retirer le montant déjà rendu")}
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-white dark:hover:bg-slate-800"
            >
              <X weight="bold" className="h-4 w-4" />
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
              placeholder={t("Ex : 1000")}
            />
            <span className="shrink-0 text-sm text-slate-500">DH</span>
          </div>
          {amountValue > 0 && priorValue > 0 && (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {t("Reste à te rendre : {amount}", { amount: money(toRepay) })}
            </p>
          )}
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {t("Déjà rendu avant de le noter ici : retiré du montant, pas ajouté à ton solde.")}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPriorOpen(true)}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-200 py-3 text-sm font-semibold text-amber-700 active:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:active:bg-amber-950/30"
        >
          <Plus weight="bold" className="h-4 w-4" />
          {t("Montant déjà rendu")}
        </button>
      )}

      <div className="flex flex-col gap-2 rounded-2xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900 dark:bg-rose-950/30">
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{t("Cet argent sort de mon solde")}</span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">
              {toRepay > 0 ? `−${money(toRepay)} ` : ""}{t("dans tes dépenses comme argent prêté")}
              {priorValue > 0 ? ` ${t("(montant − déjà rendu)")}` : ""}
            </span>
          </span>
          <Switch checked={fromSolde} onCheckedChange={setFromSolde} aria-label={t("Cet argent sort de mon solde")} />
        </label>
        {fromSolde && <PaymentMethodPicker value={method} onChange={setMethod} label={t("Pris en")} />}
      </div>

      {/* How it comes back */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("Remboursement")}</p>
        {plan ? (
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-amber-50 p-3 text-center dark:bg-amber-950/40">
            <Stat label={t("Par mois")} value={money(monthlyValue)} />
            <Stat label={t("Durée")} value={t("{n} mois", { n: plan.count })} />
            <Stat label={t("Fin")} value={monthLabelShort(addMonths(start, plan.count - 1), lang)} />
            {plan.last !== monthlyValue && (
              <p className="col-span-3 text-[11px] text-slate-500 dark:text-slate-400">
                {t("Dernier remboursement (le reste) : {amount}", { amount: money(plan.last) })}
              </p>
            )}
            {plan.count === 1 && (mode === "once" || nothingSet) && (
              <p className="col-span-3 text-[11px] text-slate-500 dark:text-slate-400">
                {t("Tout rendu en une fois, en {month}.", { month: monthLabel(start, lang) })}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400">{t("Indique le montant, puis combien par mois ou en combien de mois.")}</p>
        )}

        <div role="radiogroup" aria-label={t("Mode de remboursement")} className="grid grid-cols-3 gap-2">
          <ModeButton selected={mode === "months"} onClick={() => switchMode("months")} icon={ClockCountdown}>
            {t("Nombre de mois")}
          </ModeButton>
          <ModeButton selected={mode === "monthly"} onClick={() => switchMode("monthly")} icon={Coins}>
            {t("Par mois")}
          </ModeButton>
          <ModeButton selected={mode === "once"} onClick={() => switchMode("once")} icon={CalendarCheck}>
            {t("En une fois")}
          </ModeButton>
        </div>

        {mode === "once" ? null : mode === "monthly" ? (
          <div className="flex items-center gap-2">
            <Input
              aria-label={t("Montant par mois (DH)")}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={monthly}
              onChange={(e) => setMonthly(cleanDecimalInput(e.target.value))}
              placeholder={t("Ex: 2500")}
              onFocus={(e) => keepAboveKeyboard(e.currentTarget)}
              className="text-base"
            />
            <span className="shrink-0 text-sm text-slate-500">{t("DH / mois")}</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Input
                aria-label={t("Nombre de mois")}
                type="number"
                inputMode="numeric"
                min="1"
                max="600"
                step="1"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                placeholder={t("Ex: 2")}
                onFocus={(e) => keepAboveKeyboard(e.currentTarget)}
                className="text-base"
              />
              <span className="shrink-0 text-sm text-slate-500">{t("mois")}</span>
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
                        ? "gx-cta border-transparent"
                        : "border-slate-200 bg-white text-slate-700 active:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
                    )}
                  >
                    <b>{t("{n} mois", { n })}</b>
                    <span className="text-[10px] opacity-75">{t("{amount}/mois", { amount: money(monthlyFor(toRepay, n)) })}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {mode === "once" || plan?.count === 1 ? t("Mois du remboursement") : t("Premier remboursement")}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={t("Mois précédent")}
              onClick={() => setStart((m) => addMonths(m, -1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <CaretLeft weight="bold" className="h-4 w-4" />
            </button>
            <span className="min-w-28 text-center text-sm font-semibold capitalize text-slate-800 dark:text-slate-100">
              {monthLabel(start, lang)}
            </span>
            <button
              type="button"
              aria-label={t("Mois suivant")}
              onClick={() => setStart((m) => addMonths(m, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <CaretRight weight="bold" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">{t("Note (optionnel)")}</Label>
        <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => nav.back("/prets")}>
          {t("Annuler")}
        </Button>
        <Button type="submit" className="flex-1 gx-cta" disabled={pending}>
          {pending ? t("Enregistrement…") : isEdit ? t("Enregistrer") : t("Ajouter")}
        </Button>
      </div>

      {isEdit && <DeleteButton variant="full" {...loanDelete(loan, t)} />}
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
        "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border px-1.5 py-1.5 text-center text-[12.5px] font-medium leading-tight transition-colors duration-200",
        selected
          ? "gx-cta border-transparent"
          : "border-slate-200 bg-white text-slate-600 active:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
      )}
    >
      <Icon weight="duotone" className="h-[18px] w-[18px] shrink-0" />
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
