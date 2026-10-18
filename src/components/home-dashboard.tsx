"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeSlash, HandArrowDown, HandArrowUp, PiggyBank, Swap } from "@phosphor-icons/react/ssr";
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
      <span className="text-[0.55em] font-semibold tracking-normal text-white/55">{match[2].replace(/^(,\d+)?\s*/, (m) => m.trim() + " ")}</span>
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
  savings,
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
  /** Épargne: put aside, outside the Solde. */
  savings: number;
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
          between cash and the card — on lime, the one bright card of the
          page. Tapping it opens the Solde. */}
      <Link
        href="/solde"
        prefetch
        aria-label="Disponible maintenant · voir le solde"
        className="gx-wallet block rounded-[28px] px-5 pb-4 pt-4 transition-transform active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-white/70">Disponible maintenant</p>
          <button
            type="button"
            onClick={(e) => {
              // The card is a link: the eye only shows / hides the amounts.
              e.preventDefault();
              e.stopPropagation();
              setRevealed(!revealed);
            }}
            aria-label={revealed ? "Masquer le montant" : "Afficher le montant"}
            className="gx-wallet-chip -mr-1.5 flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90"
          >
            {revealed ? <EyeSlash weight="bold" className="h-[18px] w-[18px]" /> : <Eye weight="bold" className="h-[18px] w-[18px]" />}
          </button>
        </div>
        <p
          data-private
          className={cn("mt-0.5 text-[2.5rem] font-bold leading-none tracking-[-0.035em] tabular-nums", !revealed && "tracking-widest")}
        >
          <BigAmount text={show(balance.cash + balance.card)} />
        </p>
        {/* Cash | card: a bar of their shares, then each one. */}
        <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-white/20">
          <span className="h-full rounded-full bg-white" style={{ width: `${cashShare(balance) * 100}%` }} />
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-3 text-[13px]">
          {(["cash", "card"] as const).map((m) => (
            <p key={m} className={cn("flex min-w-0 items-center gap-1.5", m === "card" && "justify-end")}>
              <span className={cn("h-2 w-2 shrink-0 rounded-full bg-current", m === "card" && "opacity-30")} />
              <span className="text-white/70">{m === "cash" ? "Espèces" : "Carte"}</span>
              <b data-private className="truncate font-bold tabular-nums">
                {show(balance[m])}
              </b>
            </p>
          ))}
        </div>
      </Link>

      {/* Two tiles side by side: the next salary and the savings. (When the
          salary asks a question it takes the whole row, and so does the
          savings tile under it.) */}
      <div className="grid grid-cols-2 gap-3 [&:has(>.col-span-2)>*]:col-span-2">
        <CountdownNextSalary settings={settings} advances={advances} />
        <Link
          href="/epargne"
          prefetch
          className="gx-glass flex flex-col rounded-[24px] border p-4 transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[13px] font-semibold text-slate-500 dark:text-white/60">Épargne</p>
            <span className="gx-tile gx-tone-violet -my-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
              <PiggyBank weight="duotone" className="h-4 w-4" />
            </span>
          </div>
          <p data-private className="mt-2 truncate text-[22px] font-bold leading-tight tracking-[-0.02em] tabular-nums text-slate-900 dark:text-white">
            {show(savings)}
          </p>
          <p className="mt-0.5 text-[12px] text-slate-500 dark:text-white/55">Mis de côté</p>
        </Link>
      </div>

      {/* Quick actions: white tiles, each icon in its own soft colour. */}
      <div className="grid grid-cols-4 gap-2.5">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon, tone }) => (
          <Link
            key={href}
            href={href}
            prefetch
            className="gx-glass flex flex-col items-center gap-2 rounded-[20px] border px-1 pb-2.5 pt-3 transition-transform active:scale-95"
          >
            <span className={`gx-tile gx-tone-${tone} flex h-10 w-10 items-center justify-center rounded-full`}>
              <Icon weight="duotone" className="h-5 w-5" />
            </span>
            <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">{label}</span>
          </Link>
        ))}
      </div>

      <DueRepayments items={dueRepayments} currency={currency} />

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
