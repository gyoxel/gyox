import { getAllCategories, getAllExpenses, getAllPayments, getDaretOfExpense, getDepositOfExpense, getLoanOfExpense, getSavingsMoveOfExpense, getSettings } from "@/lib/page-data";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PencilSimple } from "@phosphor-icons/react/ssr";

import { LockedDelete, LockedDeleteIcon } from "@/components/locked-delete";
import { LinkedSourcePage } from "@/components/linked-source";

import { DeleteButton } from "@/components/delete-button";
import { expenseDelete } from "@/lib/delete-specs";
import { Button } from "@/components/ui/button";
import { findPayment, getCreditRealState, getEffectiveEndMonth, getOccurrenceForMonth } from "@/lib/engine";
import { compareMonths, monthKey, monthOfDateStr, monthsBetween, todayMonth, type MonthId } from "@/lib/date";
import { monthLabel } from "@/lib/i18n/dates";
import { localName, type Lang, type T } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { PageHeader } from "@/components/page-header";

import { ExpenseEditor, type PaymentStatusInit, type RecurrenceInit } from "@/components/expense-editor";
import { CreditEditor } from "@/components/credit-editor";
import { MonthPayments } from "@/components/payment-parts";
import { formatMoney } from "@/lib/utils";
import type { Expense, Payment, PaymentMethod } from "@/lib/types";
import { MethodIcon, MethodLabel } from "@/components/method-icon";

export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [settings, allExpenses, payments, categories, linkedDeposit, linkedDaret, linkedMove, linkedLoan, { lang, t }] = await Promise.all([
    getSettings(),
    getAllExpenses(),
    getAllPayments(),
    getAllCategories(),
    getDepositOfExpense(id),
    getDaretOfExpense(id),
    getSavingsMoveOfExpense(id),
    getLoanOfExpense(id),
    getI18n(),
  ]);
  const expense = allExpenses.find((e) => e.id === id);
  if (!expense) notFound();

  // Put aside every month (Épargne, a goal): what counts here is this month.
  const monthly = Boolean(linkedMove?.monthly || linkedDeposit?.deposit.monthly);
  const thisMonth = monthKey(todayMonth());
  const paidNow = payments.find((p) => p.expenseId === expense.id && p.amountPaid > 0 && (!monthly || p.monthKey === thisMonth));
  // This month's payments, to correct (its amount is free, like any expense).
  const monthParts = monthly ? getPaidMonth(expense, payments.filter((p) => p.expenseId === expense.id), todayMonth(), lang) : null;
  const partPaid = monthParts ? Math.round(monthParts.parts.reduce((s, p) => s + p.amountPaid, 0) * 100) / 100 : 0;
  const status = (method: PaymentMethod | null | undefined, paid: boolean) => (
    <>
      {monthly && <>{t("Chaque mois")} · </>}
      {monthParts && partPaid < monthParts.due - 0.005
        ? t("{paid} payés sur {due}", { paid: formatMoney(partPaid, settings.currency), due: formatMoney(monthParts.due, settings.currency) })
        : paid
          ? <>{monthly ? t("Payé ce mois") : t("Payé")}{method && <> <MethodIcon method={method} /></>}</>
          : monthly
            ? t("Pas encore ce mois")
            : t("Pas encore payé")}
    </>
  );
  const monthPayments = monthParts && <MonthPayments expense={expense} {...monthParts} currency={settings.currency} />;

  // A goal deposit: edited and deleted from the goal only; here it can just
  // be ticked / unticked (from Dépenses).
  if (linkedDeposit) {
    const { goal, deposit } = linkedDeposit;
    const payment = paidNow;
    return (
      <>
        <PageHeader
          title={localName(expense.name, t)}
          back
          info="linked"
          action={<LockedDeleteIcon hint={t("Ce versement vient de l'objectif « {goal} » : supprime-le depuis le versement.", { goal: goal.name })} />}
        />
        <main className="flex flex-col gap-5 px-4 py-5">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-5 text-white shadow-lg shadow-orange-500/20 dark:shadow-none">
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
            <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">{t("Versement · objectif")}</p>
            <p className="relative mt-1 text-4xl font-bold tabular-nums">{formatMoney(expense.amount, settings.currency)}</p>
            <p className="relative mt-1 text-sm text-white/90">
              {goal.emoji} {goal.name} · {status(payment?.method, !!payment)}
            </p>
          </div>
          <p className="px-1 text-sm text-slate-500 dark:text-slate-400">
            {monthly
              ? t("Ce versement revient chaque mois pour l'objectif « {goal} ». Coche-le dans tes dépenses quand tu le mets de côté : il s'ajoute à l'objectif. Pour le modifier ou l'arrêter, c'est depuis le versement.", { goal: goal.name })
              : t("Ce versement vient de l'objectif « {goal} ». Tu peux le cocher ou le décocher dans tes dépenses ; pour le modifier, c'est depuis le versement.", { goal: goal.name })}
          </p>
          {monthPayments}
          <Button asChild className="gx-cta">
            <Link href={`/goals/${goal.id}/deposits/${deposit.id}`}>
              <PencilSimple weight="bold" className="h-4 w-4" />
              {t("Modifier le versement")}
            </Link>
          </Button>
          <LockedDelete
            hint={t("Ce versement vient de l'objectif « {goal} » : supprime-le depuis", { goal: goal.name })}
            href={`/goals/${goal.id}/deposits/${deposit.id}`}
            linkLabel={t("le versement")}
          />
        </main>
      </>
    );
  }
  const paidWith = paidNow?.method;
  if (linkedMove) {
    return (
      <LinkedSourcePage
        title={localName(expense.name, t)}
        gradient="from-lime-400 via-green-500 to-emerald-700"
        eyebrow={`${t("Épargne")} ${monthly ? "🔁" : "🐷"}`}
        amount={formatMoney(expense.amount, settings.currency)}
        subtitle={<>{linkedMove.note ?? t("Mis de côté")} · {status(paidWith, !!paidNow)}</>}
        text={
          monthly
            ? t("Cette épargne revient chaque mois. Coche-la dans tes dépenses quand tu la mets de côté : elle s'ajoute à l'épargne. Pour la modifier ou l'arrêter, c'est depuis l'épargne.")
            : t("Cet argent a été mis dans ton épargne. Tu peux le cocher ou le décocher dans tes dépenses ; pour le modifier ou le supprimer, c'est depuis l'épargne.")
        }
        href={`/epargne/${linkedMove.id}`}
        editLabel={t("Modifier l'épargne")}
        buttonClass="gx-cta"
        sourceLabel={t("l'épargne")}
      >
        {monthPayments}
      </LinkedSourcePage>
    );
  }
  if (linkedLoan) {
    return (
      <LinkedSourcePage
        title={localName(expense.name, t)}
        gradient="from-amber-400 via-orange-500 to-amber-700"
        eyebrow={`${t("Argent prêté")} 💸`}
        amount={formatMoney(expense.amount, settings.currency)}
        subtitle={<>{t("Prêté à {name}", { name: linkedLoan.name })}{paidWith && <> · <MethodLabel method={paidWith} /></>}</>}
        text={t("Cet argent a été prêté à {name}. Pour le modifier ou le supprimer, c'est depuis « Argent prêté » — où tu confirmes aussi chaque remboursement reçu.", { name: linkedLoan.name })}
        href={`/prets/${linkedLoan.id}`}
        editLabel={t("Voir l'argent prêté")}
        buttonClass="gx-cta"
        sourceLabel={t("Argent prêté")}
      />
    );
  }

  // A daret's monthly contribution: edited and deleted from the daret only.
  if (linkedDaret) {
    return (
      <>
        <PageHeader
          title={localName(expense.name, t)}
          back
          info="linked"
          action={<LockedDeleteIcon hint={t("Cette cotisation vient de la daret « {name} » : supprime-la depuis la daret.", { name: expense.name })} />}
        />
        <main className="flex flex-col gap-5 px-4 py-5">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-400 via-emerald-500 to-emerald-700 p-5 text-white shadow-lg shadow-emerald-600/20 dark:shadow-none">
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
            <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">{t("Cotisation · daret")}</p>
            <p className="relative mt-1 text-4xl font-bold tabular-nums">
              {formatMoney(expense.amount, settings.currency)}
              <span className="text-lg font-semibold text-white/80">{t("/mois")}</span>
            </p>
            <p className="relative mt-1 text-sm text-white/90">
              {expense.icon ?? "🤝🏻"} {expense.name} · {t("{n} membres", { n: linkedDaret.members })}
            </p>
          </div>
          <p className="px-1 text-sm text-slate-500 dark:text-slate-400">
            {t("Cette cotisation vient de la daret « {name} ». Tu peux la cocher ou la décocher dans tes dépenses ; pour la modifier ou la supprimer, c'est depuis la daret.", { name: expense.name })}
          </p>
          <Button asChild className="gx-cta">
            <Link href={`/daret/${linkedDaret.id}`}>
              <PencilSimple weight="bold" className="h-4 w-4" />
              {t("Modifier la daret")}
            </Link>
          </Button>
          <LockedDelete
            hint={t("Cette cotisation vient de la daret « {name} » : supprime-la depuis", { name: expense.name })}
            href={`/daret/${linkedDaret.id}`}
            linkLabel={t("la daret")}
          />
        </main>
      </>
    );
  }

  const byId = new Map(allExpenses.map((e) => [e.id, e]));
  const recurrenceInit = getRecurrenceInit(expense, byId);
  const paymentStatus = getPaymentStatusInit(expense, payments, byId, lang, t);
  const ownPayments = payments.filter((p) => p.expenseId === expense.id);
  const current = todayMonth();
  const paidMonth = getPaidMonth(expense, ownPayments, current, lang);

  return (
    <>
      <PageHeader
        title={`${t("Modifier")} · ${expense.name}`}
        back
        info={expense.type === "credit" ? "credit-edit" : "expense-edit"}
        action={<DeleteButton variant="icon" {...expenseDelete(expense, t)} />}
      />
      <main className="flex flex-col gap-5 px-4 py-5">
        {paidMonth && <MonthPayments expense={expense} {...paidMonth} currency={settings.currency} />}

        {expense.type === "credit" ? (
          <CreditEditor
            expense={expense}
            paymentStatus={paymentStatus}
          />
        ) : (
          <ExpenseEditor
            expense={expense}
            categories={categories}
            recurrenceInit={recurrenceInit}
            paymentStatus={paymentStatus}
          />
        )}

        <DeleteButton variant="full" {...expenseDelete(expense, t)} />
      </main>
    </>
  );
}

/** What's been paid of the month that matters (the expense's own month for a
 *  one-time one, this month otherwise): its payments, to correct. */
function getPaidMonth(expense: Expense, payments: Payment[], current: MonthId, lang: Lang) {
  const month = expense.type !== "credit" && expense.frequency === "one-time" ? monthOfDateStr(expense.startDate) : current;
  const key = monthKey(month);
  const parts = payments
    .filter((p) => p.monthKey === key && p.amountPaid > 0 && (expense.type !== "credit" || p.slotIndex != null))
    .sort((a, b) => (a.part ?? 0) - (b.part ?? 0));
  const settled = findPayment(parts, expense.id, key);
  return settled ? { parts, due: settled.amountDue, monthLabel: monthLabel(month, lang) } : null;
}

/** Which recurrence option the form should open on for this expense. */
function getRecurrenceInit(expense: Expense, byId: Map<string, Expense>): RecurrenceInit {
  if (expense.type === "credit") {
    return { recurring: true, kind: "until", months: "", until: String(expense.creditInitialAmount ?? "") };
  }
  if (expense.type === "permanent") return { recurring: true, kind: "permanent", months: "", until: "" };
  if (expense.frequency === "one-time") return { recurring: false, kind: "months", months: "", until: "" };
  const end = getEffectiveEndMonth(expense, byId);
  if (!end) return { recurring: true, kind: "permanent", months: "", until: "" };
  const count = Math.max(1, monthsBetween(monthOfDateStr(expense.startDate), end) + 1);
  return { recurring: true, kind: "months", months: String(count), until: "" };
}

/** Payment status of the period that matters: the expense's own month for a
 *  one-time expense, this month otherwise. Null when nothing is due then. */
function getPaymentStatusInit(
  expense: Expense,
  payments: Payment[],
  byId: Map<string, Expense>,
  lang: Lang,
  t: T,
): PaymentStatusInit | null {
  const current = todayMonth();
  const currentKey = monthKey(current);

  if (expense.type === "credit") {
    const state = getCreditRealState(expense, payments, current);
    // Paid in part: not paid yet (ticking pays the rest).
    const payment = findPayment(payments.filter((p) => p.slotIndex != null), expense.id, currentKey);
    const paid = payment != null && payment.amountPaid >= payment.amountDue - 0.005;
    if (state.status === "not-started" || (state.status === "completed" && !paid)) return null;
    return { monthKey: currentKey, paid, method: payment?.method ?? null, hint: t("(ce mois-ci)") };
  }

  const target = expense.frequency === "one-time" ? monthOfDateStr(expense.startDate) : current;
  if (!getOccurrenceForMonth(expense, target, byId)) return null;
  const key = monthKey(target);
  const settled = findPayment(payments, expense.id, key);
  const payment = settled && settled.amountPaid >= settled.amountDue - 0.005 ? settled : undefined;
  const hint = compareMonths(target, current) === 0 ? t("(ce mois-ci)") : `(${monthLabel(target, lang)})`;
  return { monthKey: key, paid: payment != null, method: payment?.method ?? null, hint };
}
