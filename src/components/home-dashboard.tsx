"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChartNoAxesCombined, ChevronRight } from "lucide-react";
import type { MonthId } from "@/lib/date";
import { getPaidThisMonth } from "@/lib/engine";
import type { Expense, Payment } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { mutationsSettled } from "@/lib/use-refresh-data";
import { DueNowList } from "@/components/due-now-list";
import { MaskedAmount } from "@/components/masked-amount";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Dashboard body. Owns a local copy of the payments, seeded once from the
 * server: ticking an expense updates it optimistically, so the list and the
 * Disponible / Dépensé figures change instantly, computed right here in the
 * browser, instead of waiting for the server to re-render the page after
 * every tap. Fresh server data is adopted only once every tap has been
 * saved and refreshed: a refresh that started before a newer tap would
 * otherwise silently undo it (the item flipping back to unpaid).
 */
export function HomeDashboard({
  salary,
  currency,
  expenses,
  payments,
  currentMonth,
  categoryEmoji,
  countdown,
}: {
  salary: number;
  currency: string;
  expenses: Expense[];
  payments: Payment[];
  currentMonth: MonthId;
  categoryEmoji: Record<string, string>;
  countdown: ReactNode;
}) {
  const [localPayments, setLocalPayments] = useState<Payment[]>(payments);
  const [seenPayments, setSeenPayments] = useState(payments);
  if (payments !== seenPayments) {
    setSeenPayments(payments);
    if (mutationsSettled()) setLocalPayments(payments);
  }

  const paidThisMonth = useMemo(
    () => getPaidThisMonth(expenses, localPayments, currentMonth),
    [expenses, localPayments, currentMonth],
  );
  const available = Math.max(0, salary - paidThisMonth);

  return (
    <>
      <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20">
        <CardContent className="pt-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            🟢 Disponible maintenant
          </p>
          <p className="mt-1 flex items-center justify-center text-3xl font-bold text-emerald-700 dark:text-emerald-400">
            <MaskedAmount value={formatMoney(available, currency)} />
          </p>
        </CardContent>
      </Card>

      {countdown}

      <Link
        href="/stats"
        prefetch
        className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#00c3ab] to-[#007261] px-4 py-4 text-white shadow-sm transition-transform active:scale-[0.98]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <ChartNoAxesCombined className="h-5 w-5" />
        </span>
        <span className="flex-1 text-base font-semibold">Statistiques et prévisions</span>
        <ChevronRight className="h-5 w-5 opacity-80" />
      </Link>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">🔴 Dépenses</h2>
        </div>
        <DueNowList
          categoryEmoji={categoryEmoji}
          expenses={expenses}
          payments={localPayments}
          setPayments={setLocalPayments}
          currentMonth={currentMonth}
          currency={currency}
        />
      </section>
    </>
  );
}
