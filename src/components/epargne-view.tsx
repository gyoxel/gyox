"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, ChevronRight } from "lucide-react";
import type { PaymentMethod, SavingsMove } from "@/lib/types";
import { monthKey, monthLabelFr, parseMonthKey, todayMonth } from "@/lib/date";
import { METHOD_META } from "@/lib/payment-method";
import { cn, formatMoney } from "@/lib/utils";
import { TransferDialog, type Account } from "@/components/transfer-dialog";
import { HEADER_ADD_EVENT } from "@/components/header-add";
import { Button } from "@/components/ui/button";

type Move = SavingsMove & { counted: boolean };

/**
 * Épargne: the money put aside (outside the Solde), buttons to put more
 * aside or take some back (cash / card, with a note), then every move by
 * month — each opens its editor.
 */
export function EpargneView({
  moves,
  balance,
  savings,
  currency,
}: {
  moves: Move[];
  balance: Record<PaymentMethod, number>;
  savings: number;
  currency: string;
}) {
  const money = (n: number) => formatMoney(n, currency);
  const [dialog, setDialog] = useState<{ from: Account; to: Account } | null>(null);
  // The header's "+": put money aside.
  useEffect(() => {
    const open = () => setDialog({ from: "card", to: "savings" });
    window.addEventListener(HEADER_ADD_EVENT, open);
    return () => window.removeEventListener(HEADER_ADD_EVENT, open);
  }, []);
  const month = monthKey(todayMonth());
  const thisMonth = moves.filter((m) => m.counted && m.date.startsWith(month));
  const inMonth = thisMonth.filter((m) => m.kind === "in").reduce((s, m) => s + m.amount, 0);
  const outMonth = thisMonth.filter((m) => m.kind === "out").reduce((s, m) => s + m.amount, 0);
  const months = [...new Set(moves.map((m) => m.date.slice(0, 7)))];

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-lime-400 via-green-500 to-emerald-700 px-5 pb-4 pt-5 text-white shadow-lg shadow-green-600/20 dark:shadow-none">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">Mon épargne 🐷</p>
        <p className={cn("relative mt-1 text-4xl font-bold tabular-nums", savings < 0 && "text-rose-200")}>{money(savings)}</p>
        <p className="relative text-xs text-white/85">Hors de ton solde actuel</p>
        <div className="relative mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/15 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-white/75">Mis de côté ce mois</p>
            <p className="text-sm font-bold tabular-nums">{inMonth > 0 && "+"}{money(inMonth)}</p>
          </div>
          <div className="rounded-2xl bg-white/15 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-white/75">Retiré ce mois</p>
            <p className="text-sm font-bold tabular-nums">{outMonth > 0 && "−"}{money(outMonth)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Button type="button" className="h-12 bg-lime-600 text-white hover:bg-lime-700" onClick={() => setDialog({ from: "card", to: "savings" })}>
          <ArrowDownToLine className="h-4 w-4" />
          Mettre de côté
        </Button>
        <Button type="button" variant="outline" className="h-12" onClick={() => setDialog({ from: "savings", to: "cash" })}>
          <ArrowUpFromLine className="h-4 w-4" />
          Retirer
        </Button>
      </div>

      {months.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-7 text-center text-sm text-slate-400 dark:border-slate-700">
          Rien encore. <b className="text-slate-600 dark:text-slate-300">Mettre de côté</b> : l&apos;argent sort de ton solde,
          s&apos;ajoute à tes dépenses comme épargne, et tu peux noter où tu l&apos;as mis.
        </p>
      ) : (
        months.map((m) => {
          const list = moves.filter((x) => x.date.startsWith(m));
          return (
            <section key={m} className="flex flex-col gap-2">
              <h2 className="px-1 text-sm font-semibold capitalize text-slate-600 dark:text-slate-300">{monthLabelFr(parseMonthKey(m))}</h2>
              <ul className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {list.map((x) => (
                  <li key={x.id} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                    <Link href={`/epargne/${x.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 dark:active:bg-slate-800/60">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg",
                          x.kind === "in" ? "bg-lime-50 dark:bg-lime-950/50" : "bg-amber-50 dark:bg-amber-950/50",
                        )}
                      >
                        {x.kind === "in" ? "🐷" : "↩️"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                            {x.note || (x.kind === "in" ? "Mis de côté" : "Retiré")}
                          </span>
                          {!x.counted && (
                            <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
                              Non payé
                            </span>
                          )}
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          {x.date.slice(8, 10)}/{x.date.slice(5, 7)} ·{" "}
                          {x.kind === "in" ? `${METHOD_META[x.method].emoji} → 🐷` : `🐷 → ${METHOD_META[x.method].emoji}`}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          !x.counted ? "text-slate-400 line-through" : x.kind === "in" ? "text-lime-700 dark:text-lime-400" : "text-amber-600",
                        )}
                      >
                        {x.kind === "in" ? "+" : "−"}
                        {money(x.amount)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      {dialog && (
        <TransferDialog
          key={`${dialog.from}-${dialog.to}`}
          open
          onOpenChange={(o) => !o && setDialog(null)}
          balance={balance}
          savings={savings}
          money={money}
          initialFrom={dialog.from}
          initialTo={dialog.to}
          mode={dialog.to === "savings" ? "in" : "out"}
        />
      )}
    </>
  );
}
