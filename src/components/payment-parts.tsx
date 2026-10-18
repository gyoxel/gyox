"use client";

import { useState } from "react";
import { PencilSimple } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import type { Expense, Payment, PaymentMethod } from "@/lib/types";
import { METHOD_META } from "@/lib/payment-method";
import { insufficientMessage } from "@/lib/balance-message";
import { mutate } from "@/lib/use-refresh-data";
import { formatMoney } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";
import { AmountSheet } from "@/components/amount-sheet";

const round = (n: number) => Math.round(n * 100) / 100;
const WHEN = new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Casablanca", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** What paying `value` of a month does, `left` being still to pay of it. */
export function explainPayment(expense: Expense, left: number, value: number, money: (n: number) => string): string {
  const credit = expense.type === "credit";
  const after = round(left - value);
  if (after > 0.005) {
    return `Il restera ${money(after)} à payer ce mois-ci (« ${expense.name} · reste »). Pas payés d'ici la fin du mois, ${
      credit ? "ils s'ajoutent à la dernière mensualité du crédit." : "ils ne passent pas au mois suivant."
    }`;
  }
  if (after < -0.005) {
    return credit ? `${money(-after)} en avance : la dernière mensualité baisse d'autant.` : `${money(-after)} de plus que prévu ce mois-ci.`;
  }
  return "Ce mois est réglé ✓";
}

/** One payment of a month: when, cash / card, how much — tap to correct it. */
export function PaymentPartRow({ payment, currency, onClick }: { payment: Payment; currency: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm active:bg-slate-50 dark:active:bg-slate-800"
    >
      <span className="text-slate-500 dark:text-slate-400">{WHEN.format(new Date(payment.paidAt))}</span>
      {payment.method && (
        <span className="text-slate-500 dark:text-slate-400">
          {METHOD_META[payment.method].emoji} {METHOD_META[payment.method].label}
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
  const money = (n: number) => formatMoney(n, currency);
  const left = round(Math.max(0, due - others));
  const path = `/api/expenses/${expense.id}/payments/${payment.id}`;
  return (
    <AmountSheet
      title="Modifier le paiement"
      subtitle={`${expense.icon ?? "🧾"} ${expense.name} · ${monthLabel} · prévu ${money(due)}`}
      expected={due}
      already={others}
      initialAmount={payment.amountPaid}
      initialMethod={payment.method ?? "cash"}
      chips={left > 0 && Math.abs(left - payment.amountPaid) > 0.005 ? [[others > 0 ? "Tout le reste" : "Tout", left]] : []}
      explain={(v) => explainPayment(expense, left, v, money)}
      methodLabel="Payé en"
      confirmLabel={(v) => `Enregistrer ${money(v)}`}
      tone="rose"
      onClose={onClose}
      onSubmit={async (value, method) => {
        // Same account: only what's added comes out of it.
        const out = method === payment.method ? value - payment.amountPaid : value;
        if (balance && out > balance[method] + 0.005) return insufficientMessage(method, balance[method]);
        const res = await mutate({ method: "PATCH", path, body: { amount: value, method } });
        if (!res.ok) return errorMessage(res);
        toast.success("Paiement modifié.");
        return null;
      }}
      onDelete={async () => {
        const res = await mutate({ method: "DELETE", path });
        if (!res.ok) return errorMessage(res);
        toast.success("Paiement supprimé.");
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
  const money = (n: number) => formatMoney(n, currency);
  const paid = round(parts.reduce((s, p) => s + p.amountPaid, 0));
  const rest = round(due - paid);
  return (
    <section className="flex flex-col gap-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold capitalize text-slate-800 dark:text-slate-100">Paiements · {monthLabel}</h2>
        <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {money(paid)} sur {money(due)}
        </span>
      </div>
      <span className="flex h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <span
          className={rest > 0.005 ? "h-full rounded-full bg-amber-500" : "h-full rounded-full bg-emerald-500"}
          style={{ width: `${Math.min(100, (paid / Math.max(due, 0.01)) * 100)}%` }}
        />
      </span>
      {rest > 0.005 && <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Reste {money(rest)} à payer ce mois-ci</p>}
      <ul className="-mx-1 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
        {parts.map((p) => (
          <li key={p.id} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
            <PaymentPartRow payment={p} currency={currency} onClick={() => setPicked(p)} />
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-slate-400">Touche un paiement pour corriger son montant, cash ou carte, ou le supprimer.</p>
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
