"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, Eye, EyeSlash, HandArrowDown, HandArrowUp, Money, PiggyBank, Swap } from "@phosphor-icons/react/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
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

const QUICK_ACTIONS: { href: string; label: string; icon: PhosphorIcon }[] = [
  { href: "/expenses/new", label: "Dépense", icon: HandArrowUp },
  { href: "/incomes/new", label: "Revenu", icon: HandArrowDown },
  { href: "/epargne", label: "Épargne", icon: PiggyBank },
  { href: "/solde", label: "Transfert", icon: Swap },
];

/** The cash share of what's available (0-1; half and half when nothing). */
function cashShare(balance: Record<PaymentMethod, number>): number {
  const cash = Math.max(0, balance.cash);
  const total = cash + Math.max(0, balance.card);
  return total > 0 ? cash / total : 0.5;
}

/** "20 449,50 DH": the whole number, the decimals and currency softer. */
function BigAmount({ text }: { text: string }) {
  const match = /^(.*?\d)((?:,\d+)?\s*\S+)$/.exec(text);
  if (!match) return <>{text}</>;
  return (
    <>
      {match[1]}
      <span className="text-[0.6em] font-bold text-white/70">{match[2].replace(/^(,\d+)?\s*/, (m) => m.trim() + " ")}</span>
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
      {/* The wallet card: what's available now (the Solde), and how it splits
          between cash and the card, each on a glass chip. Tapping it opens
          the Solde. */}
      <Link href="/solde" prefetch aria-label="Disponible maintenant · voir le solde" className="gx-wallet block rounded-[30px] px-5 pb-4 pt-4 transition-transform active:scale-[0.99]">
        <div className="relative flex items-center justify-between">
          <p className="text-[13px] font-semibold text-white/85">Disponible maintenant</p>
          <button
            type="button"
            onClick={(e) => {
              // The card is a link: the eye only shows / hides the amounts.
              e.preventDefault();
              e.stopPropagation();
              setRevealed(!revealed);
            }}
            aria-label={revealed ? "Masquer le montant" : "Afficher le montant"}
            className="gx-wallet-chip -mr-1 flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90"
          >
            {revealed ? <EyeSlash weight="bold" className="h-[18px] w-[18px]" /> : <Eye weight="bold" className="h-[18px] w-[18px]" />}
          </button>
        </div>
        <p
          data-private
          className={cn("relative mt-1 text-[2.6rem] font-extrabold leading-tight tracking-tight tabular-nums", !revealed && "tracking-widest")}
        >
          <BigAmount text={show(balance.cash + balance.card)} />
        </p>
        {/* Cash | card: a bar of their shares, then each one on its chip. */}
        <div className="relative mt-3 flex h-1.5 overflow-hidden rounded-full bg-white/20">
          <span className="h-full rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)]" style={{ width: `${cashShare(balance) * 100}%` }} />
        </div>
        <div className="relative mt-3.5 grid grid-cols-2 gap-2.5">
          {(["cash", "card"] as const).map((m) => {
            const Icon = m === "cash" ? Money : CreditCard;
            return (
              <div key={m} className="gx-wallet-chip min-w-0 rounded-2xl px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-white/80">
                  <Icon weight="duotone" className="h-4 w-4" />
                  {m === "cash" ? "Espèces" : "Carte"}
                  <span className={cn("ml-auto h-2 w-2 rounded-full", m === "cash" ? "bg-white" : "bg-white/35")} />
                </p>
                <p data-private className="mt-0.5 truncate text-[17px] font-bold tabular-nums">
                  {show(balance[m])}
                </p>
              </div>
            );
          })}
        </div>
      </Link>

      {/* Quick actions: round clear-glass buttons, their name under them. */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} prefetch className="flex flex-col items-center gap-1.5 transition-transform active:scale-95">
            <span className="gx-pill flex h-[58px] w-[58px] items-center justify-center rounded-full text-violet-700 dark:text-violet-200">
              <Icon weight="duotone" className="h-6 w-6" />
            </span>
            <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">{label}</span>
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
