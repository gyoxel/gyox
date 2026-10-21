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
import { DueDaretPayouts, type DueDaretPayout } from "@/components/due-daret-payouts";
import { ShortcutWheel } from "@/components/shortcut-wheel";
import { TransferDialog } from "@/components/transfer-dialog";
import { MethodIcon } from "@/components/method-icon";
import { InstallAppCard } from "@/components/install-app";
import { MonthBilan } from "@/components/month-bilan";
import { BudgetAlerts, type BudgetAlert } from "@/components/budget-alerts";
import type { MonthBilanData } from "@/lib/month-bilan";
import { msg } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";

// Transfert has no page of its own: it opens the transfer right here.
const QUICK_ACTIONS: { href?: string; label: string; icon: PhosphorIcon }[] = [
  { href: "/expenses/new", label: msg("Dépense"), icon: HandArrowUp },
  { href: "/incomes/new", label: msg("Revenu"), icon: HandArrowDown },
  { href: "/epargne", label: msg("Épargne"), icon: PiggyBank },
  { label: msg("Transfert"), icon: Swap },
];

/** Disponible's card: the living violet one (a link once the amounts
 *  show, a plain card hidden). */
const BALANCE_CARD = "gx-vivid relative flex flex-col items-center overflow-hidden rounded-[28px] px-3.5 pb-3.5 pt-4 text-center";

/** "20 449,50 DH": the whole number, the decimals and currency softer. */
function BigAmount({ text }: { text: string }) {
  const match = /^(.*?\d)((?:,\d+)?\s*\S+)$/.exec(text);
  if (!match) return <>{text}</>;
  return (
    <>
      {/* The narrow space between thousands nearly vanishes this big and
          bold: a full one ("20 449"). */}
      {match[1].replace(/\u202f/g, "\u00a0")}
      <span className="text-white/60">{match[2].replace(/^(,\d+)?\s*/, (m) => m.trim() + " ")}</span>
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
  dueDaretPayouts,
  bilan,
  budgetAlerts,
}: {
  /** Solde of each account (cash, card) as of the server's payments. */
  solde: Record<PaymentMethod, number>;
  /** Épargne (for the transfer's savings side). */
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
  /** Darets whose turn has come, the pot not confirmed yet. */
  dueDaretPayouts: DueDaretPayout[];
  /** The first days of a month: the month just over. */
  bilan: MonthBilanData | null;
  /** This month's budgets at 80% or past. */
  budgetAlerts: BudgetAlert[];
}) {
  const t = useT();
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
  const [transferOpen, setTransferOpen] = useState(false);
  const show = (n: number) => (revealed ? formatMoney(n, currency) : "•••• DH");

  const balanceCard = (
    <>
      {/* A few sparkles twinkling in its corners. */}
      <span aria-hidden className="gx-twinkle absolute left-5 top-5 text-[9px] text-white/75">✦</span>
      <span aria-hidden className="gx-twinkle absolute right-6 top-4 text-[11px] text-white/80 [animation-delay:1.4s]">✦</span>
      <span aria-hidden className="gx-twinkle absolute right-12 top-10 text-[6px] text-white/60 [animation-delay:2.3s]">✦</span>
      <p className="relative text-[15px] font-semibold text-white/85">{t("Disponible maintenant")}</p>
      <div className="relative mt-2.5 flex items-center gap-2">
        <p
          data-private
          className={cn(
            "text-[2.6rem] font-extrabold leading-none tabular-nums text-white",
            revealed ? "tracking-tight" : "tracking-widest",
          )}
        >
          <BigAmount text={show(balance.cash + balance.card)} />
        </p>
        <button
          type="button"
          onClick={(e) => {
            // On the card (a link once shown): the eye only shows / hides.
            e.preventDefault();
            e.stopPropagation();
            setRevealed(!revealed);
          }}
          aria-label={revealed ? t("Masquer le montant") : t("Afficher le montant")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition-colors active:bg-white/15"
        >
          {revealed ? <EyeSlash weight="bold" className="h-5 w-5" /> : <Eye weight="bold" className="h-5 w-5" />}
        </button>
      </div>
      {/* Cash | card: each on its chip, its picture beside its name and
          amount. */}
      <div className="relative mt-4 grid w-full grid-cols-2 gap-2">
        {(["cash", "card"] as const).map((m) => (
          <span key={m} className="gx-vivid-chip flex min-w-0 items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left">
            <MethodIcon method={m} className="h-[14px]" />
            <span className="min-w-0">
              <span className="block text-[11px] font-medium leading-tight text-white/70">
                {m === "cash" ? t("Espèces") : t("Carte")}
              </span>
              <span data-private className="block truncate text-[14px] font-bold leading-tight tabular-nums text-white">
                {show(balance[m])}
              </span>
            </span>
          </span>
        ))}
      </div>
    </>
  );

  return (
    <>
      {/* Chrome offers to install the app (on the site, not installed). */}
      <InstallAppCard />

      {/* What's available now, big and centred on the living violet card —
          the first thing on Accueil. Once shown, the whole card opens the
          Solde; hidden (the dots), it doesn't. */}
      {revealed ? (
        <Link href="/solde" className={cn(BALANCE_CARD, "transition-transform active:scale-[0.99]")}>
          {balanceCard}
        </Link>
      ) : (
        <section className={BALANCE_CARD}>{balanceCard}</section>
      )}

      {/* Quick actions: round clear-glass buttons, their name under them. */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => {
          const look = (
            <>
              <span className="gx-pill flex h-[58px] w-[58px] items-center justify-center rounded-full text-violet-700 dark:text-violet-200">
                <Icon weight="duotone" className="h-6 w-6" />
              </span>
              <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">{t(label)}</span>
            </>
          );
          const className = "flex flex-col items-center gap-1.5 transition-transform active:scale-95";
          return href ? (
            <Link key={label} href={href} className={className}>
              {look}
            </Link>
          ) : (
            <button key={label} type="button" onClick={() => setTransferOpen(true)} className={className}>
              {look}
            </button>
          );
        })}
      </div>

      {bilan && <MonthBilan data={bilan} currency={currency} revealed={revealed} />}

      <BudgetAlerts items={budgetAlerts} />

      <DueDaretPayouts items={dueDaretPayouts} currency={currency} />

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

      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        balance={balance}
        savings={savings}
        money={(n) => formatMoney(n, currency)}
      />
    </>
  );
}
