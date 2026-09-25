"use client";

import { useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRefreshData } from "@/lib/use-refresh-data";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Plus, PartyPopper } from "lucide-react";
import { addMonths, monthKey as toMonthKey, monthLabelFr, type MonthId } from "@/lib/date";
import { getCreditRealState, getExpenseDisplayColor, getMonthLedgerItems, type DisplayColor } from "@/lib/engine";
import type { Expense, Payment } from "@/lib/types";
import { formatMoney, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ColorDot } from "@/components/color-dot";

const SWIPE_THRESHOLD_PX = 40;

const COLOR_RANK: Record<DisplayColor, number> = { red: 0, yellow: 1, blue: 2 };

const BORDER_CLASS: Record<DisplayColor, string> = {
  red: "border-l-rose-400",
  yellow: "border-l-amber-400",
  blue: "border-l-sky-400",
};

let optimisticIdCounter = 0;
function nextOptimisticId(): string {
  optimisticIdCounter += 1;
  return `optimistic-${optimisticIdCounter}`;
}

/** Runs a state update inside a View Transition when the browser supports
 *  it, so a row sliding to the bottom (once paid) animates smoothly instead
 *  of jumping there instantly. Falls back to a plain update otherwise. */
function animateReorder(update: () => void) {
  const doc = typeof document !== "undefined" ? (document as Document & { startViewTransition?: (cb: () => void) => void }) : null;
  if (doc?.startViewTransition) {
    doc.startViewTransition(() => flushSync(update));
  } else {
    update();
  }
}

export function DueNowList({
  expenses,
  payments,
  currentMonth,
  currency,
}: {
  expenses: Expense[];
  payments: Payment[];
  currentMonth: MonthId;
  currency: string;
}) {
  const refreshData = useRefreshData();
  const [viewMonth, setViewMonth] = useState<MonthId>(currentMonth);
  // Seeded once from the initial server payload; every change after that
  // flows only through toggle()'s own optimistic add/remove/replace, never
  // from a later `payments` prop. Re-syncing from a fresh router.refresh()
  // snapshot here used to race: a slow refresh triggered by an earlier
  // toggle could land after a second, faster toggle and silently overwrite
  // it, making an item that was just checked off flip back to unpaid a
  // moment later. Local state is now the single source of truth for this
  // list; refreshData() is still called to keep the Salaire/Disponible
  // figures elsewhere on the page in sync.
  const [localPayments, setLocalPayments] = useState<Payment[]>(payments);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const touchStartX = useRef<number | null>(null);

  const items = useMemo(() => {
    const byId = new Map(expenses.map((e) => [e.id, e]));
    return getMonthLedgerItems(expenses, localPayments, viewMonth, currentMonth)
      .map((item) => ({ ...item, color: getExpenseDisplayColor(item.expense, byId) }))
      .sort((a, b) => b.amount - a.amount)
      .sort((a, b) => COLOR_RANK[a.color] - COLOR_RANK[b.color])
      .sort((a, b) => Number(a.paid) - Number(b.paid));
  }, [expenses, localPayments, viewMonth, currentMonth]);

  function goMonth(next: MonthId) {
    setViewMonth(next);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    goMonth(addMonths(viewMonth, delta > 0 ? -1 : 1));
  }

  function toggle(expense: Expense, wasPaid: boolean) {
    setPendingIds((prev) => new Set(prev).add(expense.id));
    const monthKeyValue = toMonthKey(viewMonth);

    if (wasPaid) {
      const removedSnapshot = localPayments;
      animateReorder(() => setLocalPayments((prev) => removeOptimisticPayment(prev, expense, viewMonth)));
      const url =
        expense.type === "credit"
          ? `/api/expenses/${expense.id}/payments`
          : `/api/expenses/${expense.id}/payments?monthKey=${monthKeyValue}`;
      fetch(url, { method: "DELETE" })
        .then((res) => {
          if (!res.ok) setLocalPayments(removedSnapshot);
        })
        .catch(() => setLocalPayments(removedSnapshot))
        .finally(() => {
          settlePending(expense.id, setPendingIds);
          void refreshData();
        });
      return;
    }

    const optimistic = buildOptimisticPayment(expense, viewMonth, localPayments);
    animateReorder(() => setLocalPayments((prev) => [...prev, optimistic]));
    fetch(`/api/expenses/${expense.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthKey: monthKeyValue }),
    })
      .then(async (res) => {
        if (!res.ok) {
          setLocalPayments((prev) => prev.filter((p) => p.id !== optimistic.id));
          return;
        }
        const real: Payment = await res.json();
        setLocalPayments((prev) => prev.map((p) => (p.id === optimistic.id ? real : p)));
      })
      .catch(() => setLocalPayments((prev) => prev.filter((p) => p.id !== optimistic.id)))
      .finally(() => {
        settlePending(expense.id, setPendingIds);
        void refreshData();
      });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div
        className="flex items-center justify-between gap-2 touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Button variant="outline" size="icon" onClick={() => goMonth(addMonths(viewMonth, -1))} aria-label="Mois précédent">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-lg font-semibold text-slate-900 dark:text-white">{monthLabelFr(viewMonth)}</div>
        <Button variant="outline" size="icon" onClick={() => goMonth(addMonths(viewMonth, 1))} aria-label="Mois suivant">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Link
          href="/expenses/new"
          prefetch
          className="flex items-center justify-center gap-2 rounded-xl border border-l-4 border-rose-200 border-l-rose-500 bg-rose-50/60 px-3.5 py-3 text-sm font-semibold text-rose-600 shadow-sm transition-colors hover:bg-rose-50 dark:border-rose-900 dark:border-l-rose-500 dark:bg-rose-950/20 dark:text-rose-400"
        >
          <Plus className="h-4 w-4" />
          Ajouter une dépense
        </Link>

        {items.length === 0 ? (
          <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20">
            <CardContent className="flex items-center justify-center gap-2 py-5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <PartyPopper className="h-4 w-4" />
              Rien à payer pour le moment
            </CardContent>
          </Card>
        ) : (
          items.map(({ expense, amount, paid, color }) => {
            const isPending = pendingIds.has(expense.id);
            return (
              <div
                key={expense.id}
                style={{ viewTransitionName: `expense-row-${expense.id}` }}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-l-4 border-slate-200 bg-white px-3.5 py-3 shadow-sm transition-opacity dark:border-slate-800 dark:bg-slate-900",
                  BORDER_CLASS[color],
                  paid && "border-l-slate-300 opacity-50 dark:border-l-slate-700",
                )}
              >
                <ColorDot color={color} className={cn(paid && "opacity-60")} />
                <p
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm font-medium text-slate-900 dark:text-slate-100",
                    paid && "text-slate-400 line-through dark:text-slate-500",
                  )}
                >
                  {expense.name}
                </p>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold text-rose-600",
                    paid && "text-slate-400 line-through dark:text-slate-500",
                  )}
                >
                  {formatMoney(amount, currency)}
                </span>
                <button
                  type="button"
                  onClick={() => toggle(expense, paid)}
                  disabled={isPending}
                  aria-label={paid ? `Annuler le paiement de ${expense.name}` : `Marquer ${expense.name} comme payé`}
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-50",
                    paid
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800",
                  )}
                >
                  {paid && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function settlePending(id: string, setPendingIds: React.Dispatch<React.SetStateAction<Set<string>>>) {
  setPendingIds((prev) => {
    const next = new Set(prev);
    next.delete(id);
    return next;
  });
}

function removeOptimisticPayment(payments: Payment[], expense: Expense, viewMonth: MonthId): Payment[] {
  if (expense.type === "credit") {
    let highestIndex = -1;
    for (const p of payments) {
      if (p.expenseId === expense.id && p.slotIndex != null && p.slotIndex > highestIndex) highestIndex = p.slotIndex;
    }
    if (highestIndex < 0) return payments;
    let removed = false;
    return payments.filter((p) => {
      if (!removed && p.expenseId === expense.id && p.slotIndex === highestIndex) {
        removed = true;
        return false;
      }
      return true;
    });
  }
  const key = toMonthKey(viewMonth);
  return payments.filter((p) => !(p.expenseId === expense.id && p.monthKey === key));
}

function buildOptimisticPayment(expense: Expense, viewMonth: MonthId, payments: Payment[]): Payment {
  const now = new Date().toISOString();
  const key = toMonthKey(viewMonth);

  if (expense.type === "credit") {
    const paidSlots = payments.filter((p) => p.expenseId === expense.id && p.slotIndex != null).length;
    const state = getCreditRealState(expense, payments, viewMonth);
    const amount = state.pendingAmount > 0 ? state.pendingAmount : expense.amount;
    return {
      id: nextOptimisticId(),
      expenseId: expense.id,
      monthKey: key,
      slotIndex: paidSlots + 1,
      amountDue: amount,
      amountPaid: amount,
      paidAt: now,
      createdAt: now,
    };
  }

  return {
    id: nextOptimisticId(),
    expenseId: expense.id,
    monthKey: key,
    slotIndex: null,
    amountDue: expense.amount,
    amountPaid: expense.amount,
    paidAt: now,
    createdAt: now,
  };
}
