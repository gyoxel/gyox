"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { flushPendingRefresh, trackMutation } from "@/lib/use-refresh-data";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Plus, PartyPopper } from "lucide-react";
import { addMonths, monthKey as toMonthKey, monthLabelFr, monthLabelShortFr, type MonthId } from "@/lib/date";
import { getAmountForMonth, getCreditRealState, getEffectiveEndMonth, getExpenseDisplayColor, getMonthLedgerItems, type DisplayColor } from "@/lib/engine";
import type { Expense, Payment, PaymentMethod } from "@/lib/types";
import { toast } from "sonner";
import { METHOD_META } from "@/lib/payment-method";
import { errorMessage } from "@/components/expense-editor";
import { insufficientMessage } from "@/lib/balance-message";
import { formatMoney, cn } from "@/lib/utils";
import { ColorDot } from "@/components/color-dot";
import { displayIcon } from "@/lib/category";

const SWIPE_THRESHOLD_PX = 40;

const COLOR_RANK: Record<DisplayColor, number> = { orange: 0, red: 1, blue: 2 };

/** Icon tile tinted like the expense's colour (permanent, temporary, credit). */
const TILE_CLASS: Record<DisplayColor, string> = {
  orange: "bg-orange-50 dark:bg-orange-950/40",
  red: "bg-rose-50 dark:bg-rose-950/40",
  blue: "bg-blue-50 dark:bg-blue-950/40",
};

let optimisticIdCounter = 0;
function nextOptimisticId(): string {
  optimisticIdCounter += 1;
  return `optimistic-${optimisticIdCounter}`;
}

const REORDER_MS = 320;

/** Applies a state update and slides the rows that moved from their old
 *  position to their new one (FLIP). Only the rows are animated — unlike a
 *  page-wide View Transition, the rest of the page (bottom bar, + button)
 *  is never snapshotted or hidden, and taps keep working mid-animation. */
function animateReorder(rows: Map<string, HTMLElement>, update: () => void) {
  const before = new Map<string, number>();
  for (const [id, el] of rows) before.set(id, el.getBoundingClientRect().top);
  flushSync(update);
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  for (const [id, el] of rows) {
    const top = before.get(id);
    if (top == null) continue;
    const dy = top - el.getBoundingClientRect().top;
    if (Math.abs(dy) < 1) continue;
    el.getAnimations().forEach((a) => a.cancel());
    el.animate([{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], {
      duration: REORDER_MS,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
    });
  }
}

/**
 * `payments` / `setPayments` are the Dashboard's local copy (see
 * HomeDashboard): every toggle updates them optimistically, so the list AND
 * the Disponible figures react instantly without asking the server. The
 * server refresh is coalesced into one after a burst of taps.
 */
export function DueNowList({
  expenses,
  payments: localPayments,
  setPayments: setLocalPayments,
  currentMonth,
  currency,
  categoryEmoji,
  balance,
}: {
  categoryEmoji: Record<string, string>;
  /** Cash and card right now (ticks not saved yet included): a tick that
   *  would take one below 0 is refused at once, not after the server says so. */
  balance?: Record<PaymentMethod, number>;
  expenses: Expense[];
  payments: Payment[];
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  currentMonth: MonthId;
  currency: string;
}) {
  const [viewMonth, setViewMonth] = useState<MonthId>(currentMonth);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const touchStartX = useRef<number | null>(null);
  const rowRefs = useRef(new Map<string, HTMLElement>());
  // Ticking asks how it was paid: 💵 or 💳 show in place of the checkbox.
  const [choosingId, setChoosingId] = useState<string | null>(null);
  const chooserRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!choosingId) return;
    const close = (e: PointerEvent) => {
      if (!chooserRef.current?.contains(e.target as Node)) setChoosingId(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [choosingId]);

  /** How this month's payment of an expense was made, if known. */
  function paidMethod(expense: Expense): PaymentMethod | null {
    const key = toMonthKey(viewMonth);
    const found = localPayments.filter((p) => p.expenseId === expense.id && p.monthKey === key).at(-1);
    return found?.method ?? null;
  }

  // Leaving the Dashboard right after ticking: refresh now rather than
  // after the quiet delay, so the next page isn't shown with stale data.
  useEffect(() => () => flushPendingRefresh(), []);

  const emojiById = useMemo(() => new Map(Object.entries(categoryEmoji)), [categoryEmoji]);
  const items = useMemo(() => {
    return getMonthLedgerItems(expenses, localPayments, viewMonth, currentMonth)
      .map((item) => ({ ...item, color: getExpenseDisplayColor(item.expense) }))
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

  function toggle(expense: Expense, wasPaid: boolean, method: PaymentMethod | null = null) {
    setChoosingId(null);
    setPendingIds((prev) => new Set(prev).add(expense.id));
    const monthKeyValue = toMonthKey(viewMonth);

    if (wasPaid) {
      const kept = new Set(removeOptimisticPayment(localPayments, expense, viewMonth));
      const removed = localPayments.filter((p) => !kept.has(p));
      animateReorder(rowRefs.current, () =>
        setLocalPayments((prev) => removeOptimisticPayment(prev, expense, viewMonth)),
      );
      const url =
        expense.type === "credit"
          ? `/api/expenses/${expense.id}/payments`
          : `/api/expenses/${expense.id}/payments?monthKey=${monthKeyValue}`;
      // On failure put back only what this toggle removed — restoring a
      // whole snapshot would also undo other taps made in the meantime.
      const restore = () => setLocalPayments((prev) => [...prev, ...removed]);
      void trackMutation(fetch(url, { method: "DELETE" }))
        .then((res) => {
          if (!res.ok) restore();
        })
        .catch(restore)
        .finally(() => settlePending(expense.id, setPendingIds));
      return;
    }

    const optimistic = { ...buildOptimisticPayment(expense, viewMonth, localPayments), method };
    if (method && balance && optimistic.amountPaid > balance[method] + 0.005) {
      settlePending(expense.id, setPendingIds);
      toast.error(insufficientMessage(method, balance[method]));
      return;
    }
    animateReorder(rowRefs.current, () => setLocalPayments((prev) => [...prev, optimistic]));
    void trackMutation(
      fetch(`/api/expenses/${expense.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthKey: monthKeyValue, method }),
      }),
    )
      .then(async (res) => {
        if (!res.ok) {
          setLocalPayments((prev) => prev.filter((p) => p.id !== optimistic.id));
          toast.error(await errorMessage(res));
          return;
        }
        const real: Payment = await res.json();
        setLocalPayments((prev) => prev.map((p) => (p.id === optimistic.id ? real : p)));
      })
      .catch(() => setLocalPayments((prev) => prev.filter((p) => p.id !== optimistic.id)))
      .finally(() => settlePending(expense.id, setPendingIds));
  }

  const byId = useMemo(() => new Map(expenses.map((e) => [e.id, e])), [expenses]);
  /** "Chaque mois", "Une fois", "Jusqu'à juin 27", "Crédit · reste 2 500 DH". */
  function kindOf(expense: Expense): string {
    if (expense.type === "credit") {
      const left = getCreditRealState(expense, localPayments, viewMonth).remaining;
      return `Crédit · reste ${formatMoney(left, currency)}`;
    }
    if (expense.type === "permanent") return "Chaque mois";
    if (expense.frequency === "one-time") return "Une fois";
    const end = getEffectiveEndMonth(expense, byId);
    return end ? `Jusqu'à ${monthLabelShortFr(end).toLowerCase()}` : "Temporaire";
  }

  const paidCount = items.filter((i) => i.paid).length;
  const left = items.filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0);
  const paidTotal = items.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0);
  const progress = left + paidTotal > 0 ? paidTotal / (left + paidTotal) : 0;
  // Unpaid first, then paid: each group opens with its header.
  const firstPaid = items.findIndex((i) => i.paid);

  return (
    <div className="flex flex-col gap-3">
      {/* What this list is, and what the round boxes are for. */}
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">🧾 Dépenses du mois</h2>
        {items.length > paidCount && <span className="text-[11px] text-slate-400">Coche ◯ quand c&apos;est payé</span>}
      </div>
      {/* Month: ‹ › or swipe */}
      <div
        data-no-tab-swipe
        className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm touch-pan-y dark:border-slate-800 dark:bg-slate-900"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          onClick={() => goMonth(addMonths(viewMonth, -1))}
          aria-label="Mois précédent"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100 dark:text-slate-400 dark:active:bg-slate-800"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 text-center">
          <p className="text-[15px] font-semibold capitalize text-slate-900 dark:text-white">{monthLabelFr(viewMonth)}</p>
          {items.length > 0 && (
            <p className="text-[11px] text-slate-400">
              {paidCount}/{items.length} payées
              {left > 0 && (
                <>
                  {" "}
                  · <b className="font-semibold text-rose-600 dark:text-rose-400">{formatMoney(left, currency)}</b> à payer
                </>
              )}
            </p>
          )}
          {items.length > 0 && (
            <span className="mx-auto mt-1 block h-1 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <span className="block h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => goMonth(addMonths(viewMonth, 1))}
          aria-label="Mois suivant"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100 dark:text-slate-400 dark:active:bg-slate-800"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-3xl border border-emerald-200 bg-emerald-50/60 py-5 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300">
          <PartyPopper className="h-4 w-4" />
          Rien à payer pour le moment
        </div>
      ) : (
        <ul className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {items.map(({ expense, amount, paid, color }, index) => {
            const isPending = pendingIds.has(expense.id);
            const method = paid ? paidMethod(expense) : null;
            const header =
              index === 0 && !paid ? (
                <GroupHeader key="h-unpaid" tone="unpaid" label="À payer" count={items.length - paidCount} total={formatMoney(left, currency)} />
              ) : index === firstPaid ? (
                <GroupHeader
                  key="h-paid"
                  tone="paid"
                  label={paidCount === items.length ? "Tout est payé 🎉" : "Payées"}
                  count={paidCount}
                  total={formatMoney(paidTotal, currency)}
                />
              ) : null;
            return (
              <Fragment key={expense.id}>
              {header}
              <li
                key={expense.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(expense.id, el);
                  else rowRefs.current.delete(expense.id);
                }}
                className={cn(
                  "flex items-center border-t border-slate-100 pr-1.5 dark:border-slate-800",
                  paid ? "bg-emerald-50/40 dark:bg-emerald-950/10" : "bg-white dark:bg-slate-900",
                )}
              >
                {/* Tapping the row opens the edit page; only the round
                    checkbox on the right toggles "payé". */}
                <Link
                  href={`/expenses/${expense.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3.5 pr-1 active:opacity-70"
                >
                  <span
                    className={cn(
                      "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl",
                      paid ? "bg-emerald-50 dark:bg-emerald-950/40" : TILE_CLASS[color],
                    )}
                  >
                    <span className={cn(paid && "opacity-60")}>{displayIcon(expense, emojiById)}</span>
                    <ColorDot color={color} className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 ring-2 ring-white dark:ring-slate-900" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-sm font-semibold text-slate-900 dark:text-white",
                        paid && "text-slate-400 dark:text-slate-500",
                      )}
                    >
                      {expense.name}
                    </span>
                    <span className={cn("block truncate text-[11px]", paid ? "font-medium text-emerald-600 dark:text-emerald-400" : "text-slate-400")}>
                      {paid ? `✓ Payé${method ? ` ${METHOD_META[method].emoji} ${METHOD_META[method].label}` : ""}` : kindOf(expense)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-bold tabular-nums text-rose-600",
                      paid && "font-semibold text-slate-400 line-through dark:text-slate-500",
                    )}
                  >
                    {formatMoney(amount, currency)}
                  </span>
                </Link>
                {choosingId === expense.id ? (
                  <div ref={chooserRef} className="flex shrink-0 items-center gap-1 py-1 pl-1" aria-label="Payé comment ?">
                    {(["cash", "card"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggle(expense, false, m)}
                        aria-label={`Payé en ${METHOD_META[m].label}`}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg shadow-sm transition-transform active:scale-90 dark:border-slate-700 dark:bg-slate-800"
                      >
                        {METHOD_META[m].emoji}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => (paid ? toggle(expense, true) : setChoosingId(expense.id))}
                    disabled={isPending}
                    aria-label={paid ? `Annuler le paiement de ${expense.name}` : `Marquer ${expense.name} comme payé`}
                    className="group flex h-11 w-11 shrink-0 items-center justify-center"
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors group-disabled:opacity-50",
                        paid
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-rose-300 bg-white dark:border-rose-800 dark:bg-slate-800",
                      )}
                    >
                      {paid && <Check className="h-3.5 w-3.5 text-white" />}
                    </span>
                  </button>
                )}
              </li>
              </Fragment>
            );
          })}
        </ul>
      )}

      <Link
        href="/expenses/new"
        prefetch
        className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-rose-200 py-3 text-sm font-semibold text-rose-600 active:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:active:bg-rose-950/30"
      >
        <Plus className="h-4 w-4" />
        Ajouter une dépense
      </Link>
    </div>
  );
}

/** "À payer" / "Payées" above each group, with how many and how much. */
function GroupHeader({ tone, label, count, total }: { tone: "unpaid" | "paid"; label: string; count: number; total: string }) {
  const unpaid = tone === "unpaid";
  return (
    <li
      className={cn(
        "flex items-center justify-between gap-2 border-t border-slate-100 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide first:border-t-0 dark:border-slate-800",
        unpaid
          ? "bg-rose-50/70 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300"
          : "bg-emerald-50/80 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300",
      )}
    >
      <span className="flex items-center gap-1.5">
        <span className={cn("h-2 w-2 rounded-full", unpaid ? "bg-rose-500" : "bg-emerald-500")} />
        {label} · {count}
      </span>
      <span className="tabular-nums normal-case tracking-normal">{total}</span>
    </li>
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
    amountDue: getAmountForMonth(expense, key),
    amountPaid: getAmountForMonth(expense, key),
    paidAt: now,
    createdAt: now,
  };
}
