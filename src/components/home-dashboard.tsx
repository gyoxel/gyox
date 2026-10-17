"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Eye, EyeOff, PiggyBank, type LucideIcon } from "lucide-react";
import type { MonthId } from "@/lib/date";
import type { Expense, Payment, PaymentMethod, SalaryAdvance, Settings } from "@/lib/types";
import { walletPaidOut } from "@/lib/wallet";
import { cn, formatMoney } from "@/lib/utils";
import { mutationsSettled } from "@/lib/use-refresh-data";
import { useRevealedBalance } from "@/lib/reveal-balance";
import { CountdownNextSalary } from "@/components/countdown-next-salary";
import { DueNowList } from "@/components/due-now-list";
import { DueRepayments, type DueRepayment } from "@/components/due-repayments";
import { ShortcutWheel } from "@/components/shortcut-wheel";

const QUICK_ACTIONS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/expenses/new", label: "Dépense", icon: ArrowUpFromLine },
  { href: "/incomes/new", label: "Revenu", icon: ArrowDownToLine },
  { href: "/epargne", label: "Épargne", icon: PiggyBank },
  { href: "/solde", label: "Transfert", icon: ArrowLeftRight },
];

/** "20 449,50 DH": the whole number dark, the decimals and currency lighter. */
function BigAmount({ text }: { text: string }) {
  const match = /^(.*?\d)((?:,\d+)?\s*\S+)$/.exec(text);
  if (!match) return <>{text}</>;
  return (
    <>
      {match[1]}
      <span className="text-slate-400 dark:text-slate-500">{match[2].replace(/^(,\d+)?\s*/, (m) => m.trim() + " ")}</span>
    </>
  );
}

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
  const [revealed, setRevealed] = useRevealedBalance();
  const show = (n: number) => (revealed ? formatMoney(n, currency) : "•••• DH");

  return (
    <>
      {/* What's available now, big and centred; "Détails" opens the Solde. */}
      <section className="flex flex-col items-center pt-1 text-center">
        <p className="text-[15px] font-semibold text-slate-700 dark:text-slate-200">Disponible maintenant</p>
        <Link
          href="/solde"
          prefetch
          className="mt-2 rounded-full bg-white/80 px-4 py-1 text-xs font-semibold text-slate-600 shadow-[0_4px_14px_-6px_rgba(20,18,31,0.25)] ring-1 ring-slate-900/[0.05] active:scale-95 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10"
        >
          Détails
        </Link>
        <div className="mt-4 flex items-center gap-2">
          <p
            data-private
            className={cn(
              "text-[2.6rem] font-extrabold leading-none tracking-tight tabular-nums text-slate-900 dark:text-white",
              !revealed && "tracking-widest",
            )}
          >
            <BigAmount text={show(balance.cash + balance.card)} />
          </p>
          <button
            type="button"
            onClick={() => setRevealed(!revealed)}
            aria-label={revealed ? "Masquer le montant" : "Afficher le montant"}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition-colors active:bg-slate-900/5 dark:text-slate-200 dark:active:bg-white/10"
          >
            {revealed ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {(["cash", "card"] as const).map((m) => (
            <Link
              key={m}
              href="/solde"
              prefetch
              className="flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[13px] shadow-[0_6px_18px_-10px_rgba(20,18,31,0.3)] ring-1 ring-slate-900/[0.04] active:scale-95 dark:bg-white/10 dark:ring-white/10"
            >
              <span className="text-base leading-none">{m === "cash" ? "💵" : "💳"}</span>
              <span className="text-slate-500 dark:text-slate-400">{m === "cash" ? "Espèces" : "Carte"}</span>
              <span data-private className="font-bold tabular-nums text-slate-900 dark:text-white">
                {show(balance[m])}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick actions, like a bank app's. */}
      <div data-no-tab-swipe className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            prefetch
            className="flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-[0_6px_18px_-10px_rgba(20,18,31,0.3)] ring-1 ring-slate-900/[0.04] active:scale-95 dark:bg-white/10 dark:text-slate-100 dark:ring-white/10"
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
            {label}
          </Link>
        ))}
      </div>

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
