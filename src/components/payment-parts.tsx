"use client";

import { Fragment, useState } from "react";
import { PencilSimple } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import type { Expense, Payment, PaymentMethod } from "@/lib/types";
import { insufficientMessage } from "@/lib/balance-message";
import { mutate } from "@/lib/use-refresh-data";
import { formatMoney } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";
import { AmountSheet } from "@/components/amount-sheet";
import { MethodLabel } from "@/components/method-icon";
import { DateDivider, dividersOf } from "@/components/date-divider";
import { localName, type T } from "@/lib/i18n";
import { whenLabel } from "@/lib/i18n/dates";
import { useI18n } from "@/lib/i18n/client";

const round = (n: number) => Math.round(n * 100) / 100;

/** What paying `value` of a month does, `left` being still to pay of it. */
export function explainPayment(expense: Expense, left: number, value: number, money: (n: number) => string, t: T): string {
  const credit = expense.type === "credit";
  const after = round(left - value);
  if (after > 0.005) {
    const vars = { amount: money(after), rest: `${localName(expense.name, t)} · ${t("reste")}` };
    return credit
      ? t("Il restera {amount} à payer ce mois-ci (« {rest} »). Pas payés d'ici la fin du mois, ils s'ajoutent à la dernière mensualité de la dette.", vars)
      : t("Il restera {amount} à payer ce mois-ci (« {rest} »). Pas payés d'ici la fin du mois, ils ne passent pas au mois suivant.", vars);
  }
  if (after < -0.005) {
    return credit
      ? t("{amount} en avance : la dernière mensualité baisse d'autant.", { amount: money(-after) })
      : t("{amount} de plus que prévu ce mois-ci.", { amount: money(-after) });
  }
  return t("Ce mois est réglé ✓");
}

/** A month's payments, each under the day it was paid (over the line above
 *  it, once for the same day) — tap one to correct it. */
export function PaymentPartList({ parts, currency, onPick, className }: { parts: Payment[]; currency: string; onPick: (payment: Payment) => void; className?: string }) {
  const { lang, t } = useI18n();
  const days = dividersOf(
    parts.map((p) => whenLabel(p.paidAt, lang, t)),
    "",
  );
  return (
    <ul className={className}>
      {parts.map((p, i) => (
        <Fragment key={p.id}>
          {days[i] && <DateDivider label={days[i]} className="px-3" />}
          <li className={days[i] ? undefined : "border-t border-slate-100 first:border-t-0 dark:border-slate-800"}>
            <PaymentPartRow payment={p} currency={currency} onClick={() => onPick(p)} />
          </li>
        </Fragment>
      ))}
    </ul>
  );
}

/** One payment of a month: cash / card, how much — tap to correct it. */
function PaymentPartRow({ payment, currency, onClick }: { payment: Payment; currency: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm active:bg-slate-50 dark:active:bg-slate-800"
    >
      {payment.method && (
        <span className="text-slate-500 dark:text-slate-400">
          <MethodLabel method={payment.method} />
        </span>
      )}
      <span className="ml-auto font-semibold tabular-nums text-slate-900 dark:text-white">{formatMoney(payment.amountPaid, currency)}</span>
      <PencilSimple weight="bold" className="h-3.5 w-3.5 text-slate-300" />
    </button>
  );
}

/**
 * Correcting one payment of a month (paid 200, it was 300): its amount,
 * cash / card, or removed. The rest ("X · reste") follows.
 */
export function PaymentPartSheet({
  expense,
  payment,
  others,
  due,
  monthLabel,
  currency,
  balance,
  onClose,
}: {
  expense: Expense;
  payment: Payment;
  /** The month's other payments, added up. */
  others: number;
  /** The month's amount. */
  due: number;
  monthLabel: string;
  currency: string;
  /** Cash and card right now, when known: refused at once if short. */
  balance?: Record<PaymentMethod, number>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const money = (n: number) => formatMoney(n, currency);
  const left = round(Math.max(0, due - others));
  const path = `/api/expenses/${expense.id}/payments/${payment.id}`;
  return (
    <AmountSheet
      title={t("Modifier le paiement")}
      subtitle={`${expense.icon ?? "🧾"} ${localName(expense.name, t)} · ${monthLabel} · ${t("prévu {amount}", { amount: money(due) })}`}
      expected={due}
      already={others}
      initialAmount={payment.amountPaid}
      initialMethod={payment.method ?? "cash"}
      chips={left > 0 && Math.abs(left - payment.amountPaid) > 0.005 ? [[others > 0 ? t("Tout le reste") : t("Tout"), left]] : []}
      explain={(v) => explainPayment(expense, left, v, money, t)}
      methodLabel={t("Payé en")}
      confirmLabel={(v) => t("Enregistrer {amount}", { amount: money(v) })}
      tone="rose"
      onClose={onClose}
      onSubmit={async (value, method) => {
        // Same account: only what's added comes out of it.
        const out = method === payment.method ? value - payment.amountPaid : value;
        if (balance && out > balance[method] + 0.005) return insufficientMessage(method, balance[method], t);
        const res = await mutate({ method: "PATCH", path, body: { amount: value, method } });
        if (!res.ok) return errorMessage(res);
        toast.success(t("Paiement modifié."));
        return null;
      }}
      onDelete={async () => {
        const res = await mutate({ method: "DELETE", path });
        if (!res.ok) return errorMessage(res);
        toast.success(t("Paiement supprimé."));
        return null;
      }}
    />
  );
}

/**
 * On an expense's page: what's been paid of the month (each payment, tap to
 * correct it), against what the month asks for.
 */
export function MonthPayments({
  expense,
  parts,
  due,
  monthLabel,
  currency,
}: {
  expense: Expense;
  /** The month's payments, first one first. */
  parts: Payment[];
  due: number;
  monthLabel: string;
  currency: string;
}) {
  const [picked, setPicked] = useState<Payment | null>(null);
  const { t } = useI18n();
  const money = (n: number) => formatMoney(n, currency);
  const paid = round(parts.reduce((s, p) => s + p.amountPaid, 0));
  const rest = round(due - paid);
  return (
    <section className="flex flex-col gap-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {t("Paiements")} · {monthLabel}
        </h2>
        <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {t("{paid} sur {due}", { paid: money(paid), due: money(due) })}
        </span>
      </div>
      <span className="flex h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <span
          className={rest > 0.005 ? "h-full rounded-full bg-amber-500" : "h-full rounded-full bg-emerald-500"}
          style={{ width: `${Math.min(100, (paid / Math.max(due, 0.01)) * 100)}%` }}
        />
      </span>
      {rest > 0.005 && (
        <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">{t("Reste {amount} à payer ce mois-ci", { amount: money(rest) })}</p>
      )}
      <PaymentPartList parts={parts} currency={currency} onPick={setPicked} className="-mx-1 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800" />
      <p className="text-[11px] text-slate-400">{t("Touche un paiement pour corriger son montant, espèces ou carte, ou le supprimer.")}</p>
      {picked && (
        <PaymentPartSheet
          expense={expense}
          payment={picked}
          others={round(paid - picked.amountPaid)}
          due={due}
          monthLabel={monthLabel}
          currency={currency}
          onClose={() => setPicked(null)}
        />
      )}
    </section>
  );
}
