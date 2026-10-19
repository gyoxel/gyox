"use client";

import { useState, useTransition } from "react";
import { Check, Clock } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import type { GoalDeposit, PaymentMethod } from "@/lib/types";
import type { MonthlyPlan } from "@/lib/monthly-plan";
import { parseMonthKey } from "@/lib/date";
import { useNavBack } from "@/lib/nav-history";
import { mutate } from "@/lib/use-refresh-data";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";
import { DeleteButton } from "@/components/delete-button";
import { depositDelete } from "@/lib/delete-specs";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { StopMonthlyButton } from "@/components/stop-monthly-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, monthLabel } from "@/lib/i18n/dates";
import { useI18n } from "@/lib/i18n/client";

const DATE_FMT: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };

/**
 * Modifier un versement: amount, name, cash / card and — for one shown in
 * Dépenses — paid or not (not paid: it stays here but doesn't count). It's
 * deleted from here only (with its expense). Made every month (`plan`): the
 * amount is for the months to come (each month is ticked in Dépenses), and
 * it can be stopped.
 */
export function DepositEditor({
  goal,
  deposit,
  paid: initialPaid,
  currency,
  plan,
}: {
  goal: { id: string; name: string; emoji: string };
  deposit: GoalDeposit;
  paid: boolean;
  currency: string;
  plan: MonthlyPlan | null;
}) {
  const nav = useNavBack();
  const { lang, t } = useI18n();
  const [amount, setAmount] = useState(toDecimalInput(deposit.amount));
  const [name, setName] = useState(deposit.name === "Versement" ? "" : deposit.name);
  const [method, setMethod] = useState<PaymentMethod>(deposit.method === "card" ? "card" : "cash");
  const fromSavings = deposit.method === "savings";
  const [paid, setPaid] = useState(initialPaid);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const linked = deposit.expenseId != null;
  const value = parseDecimalInput(amount);
  const month = (key: string) => monthLabel(parseMonthKey(key), lang).toLowerCase();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(value > 0)) return setError(t("Indique un montant."));
    startTransition(async () => {
      const res = await mutate({
        method: "PATCH",
        path: `/api/goals/${goal.id}/deposits/${deposit.id}`,
        body: { name: name.trim(), amount: value, method, paid: linked ? paid : true },
      });
      if (!res.ok) return setError(await errorMessage(res));
      toast.success(t("Versement modifié."));
      nav.back(`/goals/${goal.id}`);
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <div className="relative flex flex-col items-center gap-1 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 px-4 py-5 text-white shadow-lg shadow-orange-500/20 dark:shadow-none">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
        <Label htmlFor="amount" className="relative text-xs text-white/80">
          {plan ? `${t("Chaque mois")} 🔁` : t("Versement")} · {goal.emoji} {goal.name}
        </Label>
        <div className="relative flex items-baseline gap-2">
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
        <p className="relative text-[11px] text-white/80">
          {plan
            ? plan.until
              ? t("De {from} à {to}", { from: month(plan.since), to: month(plan.until) })
              : t("Depuis {month}", { month: month(plan.since) })
            : formatDate(new Date(`${deposit.date}T12:00:00`), lang, DATE_FMT)}
        </p>
      </div>

      {plan && (
        <p className="-mt-2 px-1 text-center text-sm text-slate-600 dark:text-slate-300">
          {t("{n} mois mis de côté : {amount}", { n: plan.paid.length, amount: formatMoney(plan.total, currency) })}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{t("Nom (optionnel)")}</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Ex : Prime, reste du mois…")} maxLength={60} />
      </div>

      {plan ? (
        <p className="px-1 text-[11px] text-slate-400">
          {plan.running
            ? t("Revient chaque mois dans tes dépenses : coche-le quand tu le mets de côté (espèces ou carte). Un nouveau montant compte pour les mois à venir.")
            : t("Arrêté : il ne revient plus dans tes dépenses. Les mois mis de côté restent dans l'objectif.")}
        </p>
      ) : fromSavings ? (
        <p className="flex items-center gap-2 rounded-xl bg-lime-50 px-3 py-2.5 text-sm text-lime-800 dark:bg-lime-950/40 dark:text-lime-300">
          <span className="text-base leading-none">🐷</span>
          {t("Pris de l'épargne : il en sort, ton solde ne bouge pas.")}
        </p>
      ) : linked ? (
        <div className="flex flex-col gap-2">
          <Label>{t("Statut de paiement")}</Label>
          <div role="radiogroup" aria-label={t("Statut de paiement")} className="grid grid-cols-2 gap-2">
            <StatusButton selected={paid} onClick={() => setPaid(true)} className="bg-emerald-500">
              <Check weight="bold" className="h-4 w-4" />
              {t("Payé")}
            </StatusButton>
            <StatusButton selected={!paid} onClick={() => setPaid(false)} className="bg-rose-500">
              <Clock weight="bold" className="h-4 w-4" />
              {t("Pas encore")}
            </StatusButton>
          </div>
          <div className={cn("transition-opacity", !paid && "opacity-60")}>
            <PaymentMethodPicker
              value={method}
              onChange={(m) => {
                setMethod(m);
                setPaid(true);
              }}
              label={t("Pris en")}
            />
          </div>
          {!paid && (
            <p className="text-[11px] text-slate-400">
              {t("Pas encore payé : il reste dans l'objectif mais ne compte pas, et ne sort pas de ton solde.")}
            </p>
          )}
        </div>
      ) : (
        <PaymentMethodPicker value={method} onChange={setMethod} label={t("Pris en")} />
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => nav.back(`/goals/${goal.id}`)}>
          {t("Annuler")}
        </Button>
        <Button type="submit" className="flex-1 gx-cta" disabled={pending}>
          {pending ? t("Enregistrement…") : t("Enregistrer")}
        </Button>
      </div>

      {plan?.running && (
        <StopMonthlyButton
          endpoint={`/api/goals/${goal.id}/deposits/${deposit.id}/stop`}
          fallback={`/goals/${goal.id}`}
          description={t("Il ne reviendra plus dans tes dépenses. Ce qui est déjà mis de côté ({amount}) reste dans l'objectif.", {
            amount: formatMoney(plan.total, currency),
          })}
        />
      )}

      <DeleteButton variant="full" {...depositDelete(goal.id, deposit, currency, t)} />
    </form>
  );
}

function StatusButton({
  selected,
  onClick,
  className,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-xl border py-3 text-sm font-semibold transition-colors",
        selected
          ? cn("border-transparent text-white shadow-sm", className)
          : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
      )}
    >
      {children}
    </button>
  );
}

