"use client";

import { useState } from "react";
import Link from "next/link";
import { CaretDown } from "@phosphor-icons/react/ssr";
import { formatMoney, cn } from "@/lib/utils";
import { ReceiveRepayment } from "@/components/loan-repayments";
import { useI18n } from "@/lib/i18n/client";
import { whenLabel } from "@/lib/i18n/dates";
import { byPerson } from "@/lib/person-groups";

export interface DueRepayment {
  loanId: string;
  name: string;
  slot: number;
  /** Expected that month in all. */
  expected: number;
  /** Already received that month. */
  received: number;
  /** "Octobre 2026", in the device's language. */
  monthLabel: string;
  /** What the loan was for, and the day it was lent (among the same
   *  person's loans, they tell them apart). */
  note: string | null;
  date: string;
}

/** Accueil: a loan's installment whose month has come — received? It stays
 *  here until it's confirmed (cash or card). Several of the same person:
 *  one card, what's left of all; tap it to see (and receive) each. */
export function DueRepayments({ items, currency }: { items: DueRepayment[]; currency: string }) {
  const { lang, t } = useI18n();
  const [open, setOpen] = useState<Set<string>>(new Set());
  if (items.length === 0) return null;
  const left = (d: DueRepayment) => d.expected - d.received;
  const row = (d: DueRepayment, label?: string) => (
    <div key={`${d.loanId}-${d.slot}`} className={cn("flex items-center gap-2.5", label ? "py-1.5 pl-2 pr-0" : "gx-glass rounded-[22px] border py-2 pl-2.5 pr-2")}>
      <Link href={`/prets/${d.loanId}`} className="flex min-w-0 flex-1 items-center gap-2.5">
        {!label && <span className="gx-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg">💸</span>}
        <span className="min-w-0">
          <span className={cn("block truncate font-semibold text-slate-900 dark:text-white", label ? "text-[13px]" : "text-sm")}>
            {label ?? d.name} · {formatMoney(left(d), currency)}
          </span>
          {/* The title already says what's left: here, what came in. */}
          <span className="block truncate text-[11.5px] leading-snug text-amber-700 dark:text-amber-200">
            {d.received > 0
              ? t("{month} · {amount} déjà reçus", { month: d.monthLabel, amount: formatMoney(d.received, currency) })
              : t("Remboursement · {month}", { month: d.monthLabel })}
          </span>
        </span>
      </Link>
      <ReceiveRepayment
        variant="compact"
        loanId={d.loanId}
        slot={d.slot}
        name={d.name}
        monthLabel={d.monthLabel}
        expected={d.expected}
        received={d.received}
      />
    </div>
  );
  return (
    <section className="flex flex-col gap-2">
      {byPerson(items, (d) => d.name).map((group) => {
        if (group.length === 1) return row(group[0]);
        const key = group[0].loanId;
        const opened = open.has(key);
        return (
          <div key={key} className="gx-glass flex flex-col rounded-[22px] border py-2 pl-2.5 pr-2">
            <button
              type="button"
              aria-expanded={opened}
              onClick={() =>
                setOpen((prev) => {
                  const next = new Set(prev);
                  if (next.has(key)) next.delete(key);
                  else next.add(key);
                  return next;
                })
              }
              className="flex items-center gap-2.5 text-left"
            >
              <span className="gx-tile relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg">
                💸
                <span className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[9px] font-bold text-white">{group.length}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {group[0].name} · {formatMoney(group.reduce((s, d) => s + left(d), 0), currency)}
                </span>
                <span className="block truncate text-[11.5px] leading-snug text-amber-700 dark:text-amber-200">{t("{n} prêts à recevoir", { n: group.length })}</span>
              </span>
              <CaretDown weight="bold" className={cn("mr-2 h-4 w-4 shrink-0 text-slate-400 transition-transform", opened && "rotate-180")} />
            </button>
            {opened && (
              <div className="ml-11 mt-1 flex flex-col border-l border-amber-200 dark:border-amber-900/60">
                {group.map((d) => row(d, d.note ?? t("Prêt du {date}", { date: whenLabel(d.date, lang, t) })))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
