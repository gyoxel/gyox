import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarClock, Pencil } from "lucide-react";
import {
  getAllCategories,
  getAllExpenses,
  getAllPayments,
  getDaretOfExpense,
  getDepositOfExpense,
  getSettings,
} from "@/lib/repository";
import { LockedDelete, LockedDeleteIcon } from "@/components/locked-delete";
import { LinkedSourcePage } from "@/components/linked-source";
import { getSavingsMoveOfExpense } from "@/lib/savings-repo";
import { getLoanOfExpense } from "@/lib/loans-repo";
import { DeleteButton } from "@/components/delete-button";
import { expenseDelete } from "@/lib/delete-specs";
import { Button } from "@/components/ui/button";
import { METHOD_META } from "@/lib/payment-method";
import { getCreditDisplayProgress, getCreditRealState, getEffectiveEndMonth, getOccurrenceForMonth } from "@/lib/engine";
import { compareMonths, monthKey, monthLabelFr, monthOfDateStr, monthsBetween, todayMonth } from "@/lib/date";
import { PageHeader } from "@/components/page-header";
import { CREDIT_COLOR, pageColor } from "@/lib/page-theme";

const GOALS_COLOR = pageColor("/goals");
const DARET_COLOR = pageColor("/daret");
import { ExpenseEditor, type PaymentStatusInit, type RecurrenceInit } from "@/components/expense-editor";
import { CreditEditor } from "@/components/credit-editor";
import { formatMoney } from "@/lib/utils";
import type { Expense, Payment } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [settings, allExpenses, payments, categories, linkedDeposit, linkedDaret, linkedMove, linkedLoan] = await Promise.all([
    getSettings(),
    getAllExpenses(),
    getAllPayments(),
    getAllCategories(),
    getDepositOfExpense(id),
    getDaretOfExpense(id),
    getSavingsMoveOfExpense(id),
    getLoanOfExpense(id),
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
          title={expense.name}
          back
          tone={GOALS_COLOR}
          action={<LockedDeleteIcon hint={`Ce versement vient de l'objectif « ${goal.name} » : supprime-le depuis le versement.`} />}
        />
        <main className="flex flex-col gap-5 px-4 py-5">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-5 text-white shadow-lg shadow-orange-500/20 dark:shadow-none">
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
            <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">Versement · objectif</p>
            <p className="relative mt-1 text-4xl font-bold tabular-nums">{formatMoney(expense.amount, settings.currency)}</p>
            <p className="relative mt-1 text-sm text-white/90">
              {goal.emoji} {goal.name} ·{" "}
              {payment?.method ? `Payé ${METHOD_META[payment.method].emoji}` : payment ? "Payé" : "Pas encore payé"}
            </p>
          </div>
          <p className="px-1 text-sm text-slate-500 dark:text-slate-400">
            Ce versement vient de l&apos;objectif « {goal.name} ». Tu peux le cocher ou le décocher dans tes dépenses ; pour
            le modifier, c&apos;est depuis le versement.
          </p>
          <Button asChild className="bg-orange-500 text-white hover:bg-orange-600">
            <Link href={`/goals/${goal.id}/deposits/${deposit.id}`}>
              <Pencil className="h-4 w-4" />
              Modifier le versement
            </Link>
          </Button>
          <LockedDelete
            hint={`Ce versement vient de l'objectif « ${goal.name} » : supprime-le depuis`}
            href={`/goals/${goal.id}/deposits/${deposit.id}`}
            linkLabel="le versement"
          />
        </main>
      </>
    );
  }
  const paidWith = payments.find((p) => p.expenseId === expense.id && p.amountPaid > 0)?.method;
  if (linkedMove) {
    return (
      <LinkedSourcePage
        title={expense.name}
        tone={pageColor("/epargne")}
        gradient="from-lime-400 via-green-500 to-emerald-700"
        eyebrow="Épargne 🐷"
        amount={formatMoney(expense.amount, settings.currency)}
        subtitle={`${linkedMove.note ?? "Mis de côté"} · ${paidWith ? `Payé ${METHOD_META[paidWith].emoji}` : "Pas encore payé"}`}
        text="Cet argent a été mis dans ton épargne. Tu peux le cocher ou le décocher dans tes dépenses ; pour le modifier ou le supprimer, c'est depuis l'épargne."
        href={`/epargne/${linkedMove.id}`}
        editLabel="Modifier l'épargne"
        buttonClass="bg-lime-600 text-white hover:bg-lime-700"
        sourceLabel="l'épargne"
      />
    );
  }
  if (linkedLoan) {
    return (
      <LinkedSourcePage
        title={expense.name}
        tone={pageColor("/prets")}
        gradient="from-amber-400 via-orange-500 to-amber-700"
        eyebrow="Prêt 🤝"
        amount={formatMoney(expense.amount, settings.currency)}
        subtitle={`Prêté à ${linkedLoan.name}${paidWith ? ` · ${METHOD_META[paidWith].emoji} ${METHOD_META[paidWith].label}` : ""}`}
        text={`Cet argent a été prêté à ${linkedLoan.name}. Pour le modifier ou le supprimer, c'est depuis le prêt — où tu confirmes aussi chaque remboursement reçu.`}
        href={`/prets/${linkedLoan.id}`}
        editLabel="Voir le prêt"
        buttonClass="bg-amber-600 text-white hover:bg-amber-700"
        sourceLabel="le prêt"
      />
    );
  }

  // A daret's monthly contribution: edited and deleted from the daret only.
  if (linkedDaret) {
    return (
      <>
        <PageHeader
          title={expense.name}
          back
          tone={DARET_COLOR}
          action={<LockedDeleteIcon hint={`Cette cotisation vient de la daret « ${expense.name} » : supprime-la depuis la daret.`} />}
        />
        <main className="flex flex-col gap-5 px-4 py-5">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-400 via-emerald-500 to-[#007261] p-5 text-white shadow-lg shadow-emerald-600/20 dark:shadow-none">
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
            <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">Cotisation · daret</p>
            <p className="relative mt-1 text-4xl font-bold tabular-nums">
              {formatMoney(expense.amount, settings.currency)}
              <span className="text-lg font-semibold text-white/80">/mois</span>
            </p>
            <p className="relative mt-1 text-sm text-white/90">
              {expense.icon ?? "🤝🏻"} {expense.name} · {linkedDaret.members} membres
            </p>
          </div>
          <p className="px-1 text-sm text-slate-500 dark:text-slate-400">
            Cette cotisation vient de la daret « {expense.name} ». Tu peux la cocher ou la décocher dans tes dépenses ;
            pour la modifier ou la supprimer, c&apos;est depuis la daret.
          </p>
          <Button asChild className="bg-[#019c86] text-white hover:bg-[#007261]">
            <Link href={`/daret/${linkedDaret.id}`}>
              <Pencil className="h-4 w-4" />
              Modifier la daret
            </Link>
          </Button>
          <LockedDelete
            hint={`Cette cotisation vient de la daret « ${expense.name} » : supprime-la depuis`}
            href={`/daret/${linkedDaret.id}`}
            linkLabel="la daret"
          />
        </main>
      </>
    );
  }

  const byId = new Map(allExpenses.map((e) => [e.id, e]));
  const recurrenceInit = getRecurrenceInit(expense, byId);
  const paymentStatus = getPaymentStatusInit(expense, payments, byId);

  return (
    <>
      <PageHeader
        title={`Modifier · ${expense.name}`}
        back
        tone={expense.type === "credit" ? CREDIT_COLOR : undefined}
        action={<DeleteButton variant="icon" {...expenseDelete(expense)} />}
      />
      <main className="flex flex-col gap-5 px-4 py-5">
        {expense.type === "credit" ? (
          <CreditEditor
            expense={expense}
            paymentStatus={paymentStatus}
            info={<CreditInfo expense={expense} payments={payments} currency={settings.currency} />}
          />
        ) : (
          <ExpenseEditor
            expense={expense}
            categories={categories}
            recurrenceInit={recurrenceInit}
            paymentStatus={paymentStatus}
            info={expense.frequency === "monthly" ? <EndInfo expense={expense} allExpenses={allExpenses} /> : undefined}
          />
        )}

        <DeleteButton variant="full" {...expenseDelete(expense)} />
      </main>
    </>
  );
}

function CreditInfo({ expense, payments, currency }: { expense: Expense; payments: Payment[]; currency: string }) {
  const state = getCreditRealState(expense, payments, todayMonth());
  const paid = getCreditDisplayProgress(expense, state).paid;
  const percent = paid + state.remaining > 0 ? Math.round((paid / (paid + state.remaining)) * 100) : 0;
  const tile = (label: string, value: string, tone = "text-slate-900 dark:text-white") => (
    <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
  return (
    <div className="flex flex-col gap-2.5 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 px-1 pt-0.5">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600" style={{ width: `${percent}%` }} />
        </div>
        <span className="text-xs font-semibold tabular-nums text-blue-600 dark:text-sky-400">{percent}%</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {tile("Payé", formatMoney(paid, currency), "text-emerald-600")}
        {tile("Restant", formatMoney(state.remaining, currency))}
        {tile("En attente", state.pendingAmount > 0 ? formatMoney(state.pendingAmount, currency) : "—", state.pendingAmount > 0 ? "text-rose-600" : undefined)}
        {tile("Fin prévue", state.projectedEndMonth ? monthLabelFr(state.projectedEndMonth) : "—")}
      </div>
    </div>
  );
}

function EndInfo({ expense, allExpenses }: { expense: Expense; allExpenses: Expense[] }) {
  const byId = new Map(allExpenses.map((e) => [e.id, e]));
  const end = getEffectiveEndMonth(expense, byId);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <CalendarClock className="h-4 w-4 shrink-0 text-rose-500" />
      <span className="flex-1 text-sm text-slate-500 dark:text-slate-400">Fin calculée</span>
      <span className="text-sm font-semibold capitalize text-slate-900 dark:text-white">{end ? monthLabelFr(end) : "Permanent"}</span>
    </div>
  );
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
): PaymentStatusInit | null {
  const current = todayMonth();
  const currentKey = monthKey(current);

  if (expense.type === "credit") {
    const state = getCreditRealState(expense, payments, current);
    const payment = payments.find((p) => p.expenseId === expense.id && p.slotIndex != null && p.monthKey === currentKey);
    const paid = payment != null;
    if (state.status === "not-started" || (state.status === "completed" && !paid)) return null;
    return { monthKey: currentKey, paid, method: payment?.method ?? null, hint: "(ce mois-ci)" };
  }

  const target = expense.frequency === "one-time" ? monthOfDateStr(expense.startDate) : current;
  if (!getOccurrenceForMonth(expense, target, byId)) return null;
  const key = monthKey(target);
  const payment = payments.find(
    (p) => p.expenseId === expense.id && p.monthKey === key && p.amountPaid >= p.amountDue - 0.005,
  );
  const hint = compareMonths(target, current) === 0 ? "(ce mois-ci)" : `(${monthLabelFr(target)})`;
  return { monthKey: key, paid: payment != null, method: payment?.method ?? null, hint };
}
