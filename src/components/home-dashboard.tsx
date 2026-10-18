"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeSlash, HandArrowDown, HandArrowUp, PiggyBank, Swap, Wallet } from "@phosphor-icons/react/ssr";
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

const QUICK_ACTIONS: { href: string; label: string; icon: PhosphorIcon; tone: string }[] = [
  { href: "/expenses/new", label: "Dépense", icon: HandArrowUp, tone: "rose" },
  { href: "/incomes/new", label: "Revenu", icon: HandArrowDown, tone: "green" },
  { href: "/epargne", label: "Épargne", icon: PiggyBank, tone: "violet" },
  { href: "/solde", label: "Transfert", icon: Swap, tone: "amber" },
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
      {/* The narrow space between thousands nearly vanishes this big and
          bold: a full one ("20 449"). */}
      {match[1].replace(/\u202f/g, "\u00a0")}
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
          between cash and the card. Compact, like a bank card: rings of
          light in its corner. Tapping it opens the Solde. */}
      <Link
        href="/solde"
        prefetch
        aria-label="Disponible maintenant · voir le solde"
        className="gx-wallet block rounded-[26px] px-4 pb-3.5 pt-3 transition-transform active:scale-[0.99]"
      >
        <svg aria-hidden viewBox="0 0 160 160" fill="none" className="pointer-events-none absolute -bottom-14 -right-10 h-44 w-44 text-white/[0.13]">
          <circle cx="80" cy="80" r="38" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="80" cy="80" r="58" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="80" cy="80" r="78" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <div className="relative flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white/85">
            <Wallet weight="fill" className="h-4 w-4" />
            Disponible maintenant
          </p>
          <button
            type="button"
            onClick={(e) => {
              // The card is a link: the eye only shows / hides the amounts.
              e.preventDefault();
              e.stopPropagation();
              setRevealed(!revealed);
            }}
            aria-label={revealed ? "Masquer le montant" : "Afficher le montant"}
            className="gx-wallet-chip -mr-1 flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-90"
          >
            {revealed ? <EyeSlash weight="bold" className="h-4 w-4" /> : <Eye weight="bold" className="h-4 w-4" />}
          </button>
        </div>
        <p
          data-private
          className={cn("relative mt-0.5 text-[2rem] font-extrabold leading-tight tracking-tight tabular-nums", !revealed && "tracking-widest")}
        >
          <BigAmount text={show(balance.cash + balance.card)} />
        </p>
        {/* Cash | card: a bar of their shares, then each one. */}
        <div className="relative mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/20">
          <span className="h-full rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)]" style={{ width: `${cashShare(balance) * 100}%` }} />
        </div>
        <div className="relative mt-2 grid grid-cols-2 gap-3 text-[12.5px]">
          {(["cash", "card"] as const).map((m) => (
            <p key={m} className={cn("flex min-w-0 items-center gap-1.5", m === "card" && "justify-end")}>
              <span className={cn("h-2 w-2 shrink-0 rounded-full", m === "cash" ? "bg-white" : "bg-white/40")} />
              <span className="text-white/75">{m === "cash" ? "Espèces" : "Carte"}</span>
              <b data-private className="truncate font-bold tabular-nums">
                {show(balance[m])}
              </b>
            </p>
          ))}
        </div>
      </Link>

      {/* Quick actions: pastel circles, each its colour, their name under them. */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon, tone }) => (
          <Link key={href} href={href} prefetch className="flex flex-col items-center gap-1.5 transition-transform active:scale-95">
            <span className={`gx-tile gx-tone-${tone} flex h-[46px] w-[46px] items-center justify-center rounded-full`}>
              <Icon weight="duotone" className="h-[22px] w-[22px]" />
            </span>
            <span className="text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">{label}</span>
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
