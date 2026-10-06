"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import type { MonthId } from "@/lib/date";
import type { Expense, Payment, PaymentMethod, SalaryAdvance, Settings } from "@/lib/types";
import { walletPaidOut } from "@/lib/wallet";
import { cn, formatMoney } from "@/lib/utils";
import { mutationsSettled } from "@/lib/use-refresh-data";
import { CountdownNextSalary } from "@/components/countdown-next-salary";
import { DueNowList } from "@/components/due-now-list";
import { DueRepayments, type DueRepayment } from "@/components/due-repayments";
import { ShortcutWheel } from "@/components/shortcut-wheel";

/**
 * Dashboard body. Owns a local copy of the payments, seeded once from the
 * server: ticking an expense updates it optimistically, so the list and the
 * Disponible figure (the Solde: cash + card) changes instantly, computed here in the
 * browser, instead of waiting for the server to re-render the page after
 * every tap. Fresh server data is adopted only once every tap has been
 * saved and refreshed: a refresh that started before a newer tap would
 * otherwise silently undo it (the item flipping back to unpaid).
 */
export function HomeDashboard({
  solde,
  currency,
  expenses,
  payments,
  currentMonth,
  categoryEmoji,
  settings,
  advances,
  dueRepayments,
}: {
  /** Solde of each account (cash, card) as of the server's payments. */
  solde: Record<PaymentMethod, number>;
  currency: string;
  expenses: Expense[];
  payments: Payment[];
  currentMonth: MonthId;
  categoryEmoji: Record<string, string>;
  /** For the countdown to the next salary. */
  settings: Settings;
  advances: SalaryAdvance[];
  /** Loans' installments whose month has come, not received yet. */
  dueRepayments: DueRepayment[];
}) {
  const [localPayments, setLocalPayments] = useState<Payment[]>(payments);
  const [seenPayments, setSeenPayments] = useState(payments);
  if (payments !== seenPayments) {
    setSeenPayments(payments);
    if (mutationsSettled()) setLocalPayments(payments);
  }

  // Disponible = the Solde, moved by the ticks not saved yet.
  const balance = useMemo(() => {
    const saved = walletPaidOut(payments, expenses);
    const local = walletPaidOut(localPayments, expenses);
    return { cash: solde.cash + saved.cash - local.cash, card: solde.card + saved.card - local.card };
  }, [solde, payments, localPayments, expenses]);
  const [revealed, setRevealed] = useState(false);
  const show = (n: number) => (revealed ? formatMoney(n, currency) : "•••• DH");

  return (
    <>
      {/* Tapping it opens the Solde page (the eye only shows / hides). */}
      <Link
        href="/solde"
        prefetch
        aria-label="Disponible maintenant · voir le solde"
        className="block transition-transform active:scale-[0.98]"
      >
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 px-5 pb-4 pt-4 text-white shadow-lg shadow-emerald-600/20 dark:from-emerald-600 dark:via-teal-700 dark:to-cyan-800 dark:shadow-none">
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/10" />
          <span aria-hidden className="pointer-events-none absolute -bottom-16 -left-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="relative flex items-center justify-between">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-300" />
              </span>
              Disponible maintenant
            </p>
            <button
              type="button"
              onClick={(e) => {
                // The card is a link: the eye only shows / hides the amounts.
                e.preventDefault();
                e.stopPropagation();
                setRevealed((v) => !v);
              }}
              aria-label={revealed ? "Masquer le montant" : "Afficher le montant"}
              className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-colors active:bg-white/25"
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p
            className={cn(
              "relative mt-1 text-[2.5rem] font-bold leading-tight tabular-nums",
              !revealed && "tracking-widest",
            )}
          >
            {show(balance.cash + balance.card)}
          </p>
          <div className="relative mt-3 grid grid-cols-2 gap-2">
            {(["cash", "card"] as const).map((m) => (
              <div key={m} className="flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 backdrop-blur-sm">
                <span className="text-lg leading-none">{m === "cash" ? "💵" : "💳"}</span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-medium uppercase tracking-wide text-white/75">
                    {m === "cash" ? "Espèces" : "Carte"}
                  </span>
                  <span className="block truncate text-sm font-bold tabular-nums">{show(balance[m])}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </Link>

      <DueRepayments items={dueRepayments} currency={currency} />

      <CountdownNextSalary settings={settings} advances={advances} />

      <ShortcutWheel />

      <section className="flex flex-col gap-2.5">
        <DueNowList
          categoryEmoji={categoryEmoji}
          expenses={expenses}
          payments={localPayments}
          setPayments={setLocalPayments}
          currentMonth={currentMonth}
          currency={currency}
          balance={balance}
        />
      </section>
    </>
  );
}
