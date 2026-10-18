"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeSlash, HandArrowDown, HandArrowUp, PiggyBank, Swap } from "@phosphor-icons/react/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import type { MonthId } from "@/lib/date";
import type { Expense, Payment, PaymentMethod, SalaryAdvance, Settings } from "@/lib/types";
import { walletPaidOut } from "@/lib/wallet";
import { formatMoney } from "@/lib/utils";
import { mutationsSettled } from "@/lib/use-refresh-data";
import { useRevealedBalance } from "@/lib/reveal-balance";
import { CountdownNextSalary } from "@/components/countdown-next-salary";
import { DueNowList } from "@/components/due-now-list";
import { DueRepayments, type DueRepayment } from "@/components/due-repayments";
import { ShortcutWheel } from "@/components/shortcut-wheel";
import { MethodIcon } from "@/components/method-icon";

const QUICK_ACTIONS: { href: string; label: string; icon: PhosphorIcon }[] = [
  { href: "/expenses/new", label: "Dépense", icon: HandArrowUp },
  { href: "/incomes/new", label: "Revenu", icon: HandArrowDown },
  { href: "/epargne", label: "Épargne", icon: PiggyBank },
  { href: "/solde", label: "Transfert", icon: Swap },
];

/** "20 449,50 DH": the whole number, the decimals and currency softer. */
function BigAmount({ text }: { text: string }) {
  const match = /^(.*?\d)((?:,\d+)?\s*\S+)$/.exec(text);
  if (!match) return <>{text}</>;
  return (
    <>
      {/* The narrow space between thousands nearly vanishes this big and
          bold: a full one ("20 449"). */}
      {match[1].replace(/\u202f/g, "\u00a0")}
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
      {/* What's available now, big and centred on a card of frosted glass —
          the first thing on Accueil. Once shown, the amount opens the
          Solde; hidden (the dots), it doesn't. */}
      <section className="gx-balance relative flex flex-col items-center overflow-hidden rounded-[28px] px-3.5 pb-3.5 pt-4 text-center">
        <p className="text-[15px] font-semibold text-slate-700 dark:text-slate-200">Disponible maintenant</p>
        <div className="mt-2.5 flex items-center gap-2">
          {revealed ? (
            <Link
              href="/solde"
              prefetch
              aria-label="Voir le solde"
              data-private
              className="text-[2.6rem] font-extrabold leading-none tracking-tight tabular-nums text-slate-900 transition-transform active:scale-[0.97] dark:text-white"
            >
              <BigAmount text={show(balance.cash + balance.card)} />
            </Link>
          ) : (
            <p
              data-private
              className="text-[2.6rem] font-extrabold leading-none tracking-widest tabular-nums text-slate-900 dark:text-white"
            >
              <BigAmount text={show(balance.cash + balance.card)} />
            </p>
          )}
          <button
            type="button"
            onClick={() => setRevealed(!revealed)}
            aria-label={revealed ? "Masquer le montant" : "Afficher le montant"}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition-colors active:bg-slate-900/5 dark:text-slate-200 dark:active:bg-white/10"
          >
            {revealed ? <EyeSlash weight="bold" className="h-5 w-5" /> : <Eye weight="bold" className="h-5 w-5" />}
          </button>
        </div>
        {/* Cash | card: each on its chip, its picture beside its name and
            amount. */}
        <div className="mt-4 grid w-full grid-cols-2 gap-2">
          {(["cash", "card"] as const).map((m) => (
            <Link
              key={m}
              href="/solde"
              prefetch
              className="gx-balance-chip flex min-w-0 items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left active:scale-[0.98]"
            >
              <MethodIcon method={m} className="h-[14px]" />
              <span className="min-w-0">
                <span className="block text-[11px] font-medium leading-tight text-slate-500 dark:text-slate-400">
                  {m === "cash" ? "Espèces" : "Carte"}
                </span>
                <span data-private className="block truncate text-[14px] font-bold leading-tight tabular-nums text-slate-900 dark:text-white">
                  {show(balance[m])}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

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

      {/* Side by side: the countdown to the salary and the shortcuts. (When
          the salary asks a question it takes the whole row, and so do the
          shortcuts under it.) */}
      <div className="grid grid-cols-2 gap-3 [&:has(>.col-span-2)>*]:col-span-2">
        <CountdownNextSalary settings={settings} advances={advances} />
        <ShortcutWheel />
      </div>

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
