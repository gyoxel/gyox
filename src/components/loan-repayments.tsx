"use client";

import { useState } from "react";
import { HandCoins, PencilSimple } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import type { LoanRepayment } from "@/lib/types";
import { METHOD_META } from "@/lib/payment-method";
import { mutate } from "@/lib/use-refresh-data";
import { cn, formatMoney } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";
import { AmountSheet } from "@/components/amount-sheet";
import { MethodLabel } from "@/components/method-icon";
import type { T } from "@/lib/i18n";
import { formatDate } from "@/lib/i18n/dates";
import { useI18n, useT } from "@/lib/i18n/client";

const round = (n: number) => Math.round(n * 100) / 100;
const DAY: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

/** What a repayment of `value` does, `left` being still expected that month. */
function explain(value: number, left: number, t: T): string {
  const rest = round(left - value);
  if (rest > 0.005)
    return t("Il restera {amount} à recevoir ce mois-ci. Pas reçus d'ici la fin du mois, ils passeront au mois suivant.", { amount: formatMoney(rest) });
  if (rest < -0.005) return t("{amount} en avance : le mois suivant attendra moins.", { amount: formatMoney(-rest) });
  return t("Ce mois est réglé ✓");
}

interface MonthInfo {
  loanId: string;
  slot: number;
  /** Who it was lent to. */
  name: string;
  /** "Octobre 2026", in the device's language. */
  monthLabel: string;
  /** Expected that month in all. */
  expected: number;
  /** Already received that month. */
  received: number;
}

/**
 * "J'ai reçu": money given back for a month — how much (what's left that
 * month by default, or less, or more) and how. An income in Revenus.
 */
export function ReceiveRepayment({ variant = "full", ...info }: MonthInfo & { variant?: "full" | "compact" }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const left = round(Math.max(0, info.expected - info.received));
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "gx-cta flex shrink-0 items-center justify-center gap-1.5 rounded-full font-semibold transition-transform active:scale-95",
          variant === "full" ? "h-11 w-full text-sm" : "h-9 px-3 text-xs",
        )}
      >
        <HandCoins weight="bold" className="h-4 w-4" />
        {variant === "full" ? (info.received > 0 ? t("J'ai reçu encore") : t("J'ai reçu")) : t("Reçu ?")}
      </button>
      {open && (
        <AmountSheet
          title={t("{name} t'a rendu combien ?", { name: info.name })}
          subtitle={`💸 ${info.monthLabel} · ${t("attendu {amount}", { amount: formatMoney(info.expected) })}`}
          expected={info.expected}
          already={info.received}
          initialAmount={left}
          initialMethod="cash"
          chips={left > 0 ? [[info.received > 0 ? t("Tout le reste") : t("Tout"), left]] : []}
          explain={(v) => explain(v, left, t)}
          methodLabel={t("Reçu en")}
          confirmLabel={(v) => t("Enregistrer {amount}", { amount: `+${formatMoney(v)}` })}
          tone="amber"
          onClose={() => setOpen(false)}
          onSubmit={async (value, method) => {
            const res = await mutate({ method: "POST", path: `/api/loans/${info.loanId}/repayments`, body: { slot: info.slot, method, amount: value } });
            if (!res.ok) return errorMessage(res);
            toast.success(t("{amount} ajouté à ton solde ({method}).", { amount: `+${formatMoney(value)}`, method: t(METHOD_META[method].label) }));
            return null;
          }}
        />
      )}
    </>
  );
}

/** One repayment of a month: tap to change it (amount, cash / card) or delete it. */
export function RepaymentRow({ repayment, ...info }: MonthInfo & { repayment: LoanRepayment }) {
  const { lang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const others = round(info.received - repayment.amount);
  const path = `/api/loans/${info.loanId}/repayments/${repayment.id}`;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs active:bg-slate-100 dark:active:bg-slate-800"
      >
        <span className="text-slate-500 dark:text-slate-400">{formatDate(new Date(`${repayment.date}T12:00:00`), lang, DAY)}</span>
        <span className="text-slate-500 dark:text-slate-400">
          <MethodLabel method={repayment.method} />
        </span>
        <span className="ml-auto font-semibold tabular-nums text-emerald-600">+{formatMoney(repayment.amount)}</span>
        <PencilSimple weight="bold" className="h-3 w-3 text-slate-300" />
      </button>
      {open && (
        <AmountSheet
          title={t("Modifier le remboursement")}
          subtitle={`💸 ${info.name} · ${info.monthLabel} · ${t("attendu {amount}", { amount: formatMoney(info.expected) })}`}
          expected={info.expected}
          already={others}
          initialAmount={repayment.amount}
          initialMethod={repayment.method}
          chips={[]}
          explain={(v) => explain(v, round(info.expected - others), t)}
          methodLabel={t("Reçu en")}
          confirmLabel={(v) => t("Enregistrer {amount}", { amount: formatMoney(v) })}
          tone="amber"
          onClose={() => setOpen(false)}
          onSubmit={async (value, method) => {
            const res = await mutate({ method: "PATCH", path, body: { amount: value, method } });
            if (!res.ok) return errorMessage(res);
            toast.success(t("Remboursement modifié."));
            return null;
          }}
          onDelete={async () => {
            const res = await mutate({ method: "DELETE", path });
            if (!res.ok) return errorMessage(res);
            toast.success(t("Remboursement supprimé."));
            return null;
          }}
        />
      )}
    </>
  );
}
