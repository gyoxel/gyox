import { getAllCategories, getAllExpenses, getAllPayments, getBudgetOfExpense, getDaretOfExpense, getDepositOfExpense, getLoanOfExpense, getSavingsMoveOfExpense, getSettings } from "@/lib/page-data";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PencilSimple } from "@phosphor-icons/react/ssr";

import { LockedDelete, LockedDeleteIcon } from "@/components/locked-delete";
import { LinkedSourcePage } from "@/components/linked-source";

import { DeleteButton } from "@/components/delete-button";
import { expenseDelete } from "@/lib/delete-specs";
import { Button } from "@/components/ui/button";
import { findPayment, getCreditRealState, getEffectiveEndMonth, getOccurrenceForMonth } from "@/lib/engine";
import { compareMonths, monthKey, monthOfDateStr, monthsBetween, parseMonthKey, todayMonth, type MonthId } from "@/lib/date";
import { monthLabel } from "@/lib/i18n/dates";
import { localName, type Lang, type T } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { PageHeader } from "@/components/page-header";

import { ExpenseEditor, type PaymentStatusInit, type RecurrenceInit } from "@/components/expense-editor";
import { CreditEditor } from "@/components/credit-editor";
import { MonthPayments } from "@/components/payment-parts";
import { formatMoney } from "@/lib/utils";
import type { Expense, Payment } from "@/lib/types";
import { MethodIcon, MethodLabel } from "@/components/method-icon";

export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [settings, allExpenses, payments, categories, linkedDeposit, linkedDaret, linkedMove, linkedLoan, linkedBudget, { lang, t }] = await Promise.all([
    getSettings(),
    getAllExpenses(),
    getAllPayments(),
    getAllCategories(),
    getDepositOfExpense(id),
    getDaretOfExpense(id),
    getSavingsMoveOfExpense(id),
    getLoanOfExpense(id),
    getBudgetOfExpense(id),
    getI18n(),
  ]);
  const expense = allExpenses.find((e) => e.id === id);
  if (!expense) notFound();

  // A goal deposit: edited and deleted from the goal only; here it can just
  // be ticked / unticked (from Dépenses).
  if (linkedDeposit) {
    const { goal, deposit } = linkedDeposit;
    const payment = payments.find((p) => p.expenseId === expense.id && p.amountPaid > 0);
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
              {goal.emoji} {goal.name} ·{" "}
              {payment?.method ? <>{t("Payé")} <MethodIcon method={payment.method} /></> : payment ? t("Payé") : t("Pas encore payé")}
            </p>
          </div>
          <p className="px-1 text-sm text-slate-500 dark:text-slate-400">
            {t("Ce versement vient de l'objectif « {goal} ». Tu peux le cocher ou le décocher dans tes dépenses ; pour le modifier, c'est depuis le versement.", { goal: goal.name })}
          </p>
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
  const paidWith = payments.find((p) => p.expenseId === expense.id && p.amountPaid > 0)?.method;
  if (linkedMove) {
    return (
      <LinkedSourcePage
        title={localName(expense.name, t)}
        gradient="from-lime-400 via-green-500 to-emerald-700"
        eyebrow={`${t("Épargne")} 🐷`}
        amount={formatMoney(expense.amount, settings.currency)}
        subtitle={<>{linkedMove.note ?? t("Mis de côté")} · {paidWith ? <>{t("Payé")} <MethodIcon method={paidWith} /></> : t("Pas encore payé")}</>}
        text={t("Cet argent a été mis dans ton épargne. Tu peux le cocher ou le décocher dans tes dépenses ; pour le modifier ou le supprimer, c'est depuis l'épargne.")}
        href={`/epargne/${linkedMove.id}`}
        editLabel={t("Modifier l'épargne")}
        buttonClass="gx-cta"
        sourceLabel={t("l'épargne")}
      />
    );
  }
  if (linkedBudget) {
    const { budget, overflowOf } = linkedBudget;
    const name = budget.expense.name;
    return (
      <LinkedSourcePage
        title={localName(expense.name, t)}
        gradient="from-fuchsia-400 via-purple-500 to-violet-700"
        eyebrow={overflowOf ? t("Dépassement de budget") : `${t("Budget")} 👛`}
        amount={formatMoney(expense.amount, settings.currency)}
        subtitle={
          overflowOf
            ? <>{name} · {monthLabel(parseMonthKey(overflowOf), lang)}{paidWith && <> · <MethodIcon method={paidWith} /></>}</>
            : expense.type === "permanent" ? t("Chaque mois") : expense.frequency === "one-time" ? t("Une fois") : t("Pendant quelques mois")
        }
        text={
          overflowOf
            ? t("Ce qui a été dépensé au-delà du budget « {name} » ce mois-là. Il suit les dépenses notées dans le budget.", { name })
            : t("Le montant du budget « {name} » : coche-le dans tes dépenses quand tu le prends. Pour le modifier ou noter ce que tu en dépenses, c'est depuis le budget.", { name })
        }
        href={overflowOf ? `/budgets/${budget.id}?month=${overflowOf}` : `/budgets/${budget.id}`}
        editLabel={t("Voir le budget")}
        buttonClass="gx-cta"
        sourceLabel={t("le budget")}
      />
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
