"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Bank, CaretRight } from "@phosphor-icons/react/ssr";
import type { PaymentMethod, SavingsMove } from "@/lib/types";
import type { MonthlyPlan } from "@/lib/monthly-plan";
import { monthKey, parseMonthKey, todayMonth } from "@/lib/date";
import { monthLabel, whenLabel } from "@/lib/i18n/dates";
import { useI18n } from "@/lib/i18n/client";
import { cn, formatMoney } from "@/lib/utils";
import { TransferDialog, type Account } from "@/components/transfer-dialog";
import { ExistingSavingsDialog } from "@/components/existing-savings-dialog";
import { HEADER_ADD_EVENT } from "@/components/header-add";
import { Button } from "@/components/ui/button";
import { MethodIcon } from "@/components/method-icon";
import { DateDivider, withDividers } from "@/components/date-divider";

type Move = SavingsMove & { counted: boolean; href: string; plan: MonthlyPlan | null };

/** A line of the history: a move, or a month of one put aside every month. */
interface Row {
  key: string;
  move: Move;
  date: string;
  amount: number;
  method: PaymentMethod;
  counted: boolean;
}

/** Every month put aside shows on its own, in its month. */
function historyRows(moves: Move[]): Row[] {
  return moves
    .flatMap((m): Row[] =>
      m.plan
        ? m.plan.paid.map((p) => ({
            key: `${m.id}-${p.monthKey}`,
            move: m,
            // Ticked in its month: that day; later on: its month.
            date: p.paidAt.startsWith(p.monthKey) ? p.paidAt.slice(0, 10) : `${p.monthKey}-01`,
            amount: p.amount,
            method: p.method ?? m.method,
            counted: true,
          }))
        : [{ key: m.id, move: m, date: m.date, amount: m.amount, method: m.method, counted: m.counted }],
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Épargne: the money put aside (outside the Solde), buttons to put more
 * aside or take some back (cash / card, with a note), what's put aside
 * every month, then every move by month — each opens its editor.
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
  const { lang, t } = useI18n();
  const money = (n: number) => formatMoney(n, currency);
  const [dialog, setDialog] = useState<{ from: Account; to: Account } | null>(null);
  const [existingOpen, setExistingOpen] = useState(false);
  // The header's "+": put money aside. So does arriving from the bar's +
  // menu (/epargne?ajouter=1), once — the address loses it right away.
  useEffect(() => {
    const open = () => setDialog({ from: "card", to: "savings" });
    window.addEventListener(HEADER_ADD_EVENT, open);
    if (new URLSearchParams(window.location.search).has("ajouter")) {
      window.history.replaceState(null, "", window.location.pathname);
      queueMicrotask(open);
    }
    return () => window.removeEventListener(HEADER_ADD_EVENT, open);
  }, []);
  const month = monthKey(todayMonth());
  const rows = historyRows(moves);
  const thisMonth = rows.filter((r) => r.counted && r.date.startsWith(month));
  const inMonth = thisMonth.filter((r) => r.move.kind === "in").reduce((s, r) => s + r.amount, 0);
  const outMonth = thisMonth.filter((r) => r.move.kind === "out" || r.move.kind === "goal").reduce((s, r) => s + r.amount, 0);
  const months = [...new Set(rows.map((r) => r.date.slice(0, 7)))];
  const plans = moves.filter((m) => m.plan?.running);

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-lime-400 via-green-500 to-emerald-700 px-5 pb-4 pt-5 text-white shadow-lg shadow-green-600/20 dark:shadow-none">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">{t("Mon épargne")} 🐷</p>
        <p className={cn("relative mt-1 text-4xl font-bold tabular-nums", savings < 0 && "text-rose-200")}>{money(savings)}</p>
        <p className="relative text-xs text-white/85">{t("Hors de ton solde actuel")}</p>
        <div className="relative mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/15 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-white/75">{t("Mis de côté ce mois")}</p>
            <p className="text-sm font-bold tabular-nums">{inMonth > 0 && "+"}{money(inMonth)}</p>
          </div>
          <div className="rounded-2xl bg-white/15 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-white/75">{t("Retiré ce mois")}</p>
            <p className="text-sm font-bold tabular-nums">{outMonth > 0 && "−"}{money(outMonth)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Button type="button" className="h-12 gx-cta" onClick={() => setDialog({ from: "card", to: "savings" })}>
          <ArrowDownLeft weight="bold" className="h-4 w-4" />
          {t("Mettre de côté")}
        </Button>
        <Button type="button" variant="outline" className="h-12" onClick={() => setDialog({ from: "savings", to: "cash" })}>
          <ArrowUpRight weight="bold" className="h-4 w-4" />
          {t("Retirer")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="col-span-2 h-11 border-dashed border-lime-300 text-lime-800 dark:border-lime-800 dark:text-lime-300"
          onClick={() => setExistingOpen(true)}
        >
          <Bank weight="bold" className="h-4 w-4" />
          {t("J'ai déjà une épargne")}
        </Button>
      </div>

      {plans.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("Chaque mois")}</h2>
          <ul className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {plans.map((m) => (
              <li key={m.id} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                <Link href={m.href} className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 dark:active:bg-slate-800/60">
                  <span className="gx-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-lg">🔁</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{m.note || t("Épargne")}</span>
                    <span className="block text-[11px] text-slate-400">
                      {t("{amount}/mois · depuis {month}", { amount: money(m.plan!.amount), month: monthLabel(parseMonthKey(m.plan!.since), lang).toLowerCase() })}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
                      m.plan!.paidNow < m.plan!.amount - 0.005
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
                    )}
                  >
                    {m.plan!.dueNow
                      ? t("À cocher ce mois")
                      : m.plan!.paidNow < m.plan!.amount - 0.005
                        ? t("{paid} sur {amount} ce mois", { paid: money(m.plan!.paidNow), amount: money(m.plan!.amount) })
                        : t("Fait ce mois ✓")}
                  </span>
                  <CaretRight weight="bold" className="h-4 w-4 shrink-0 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {months.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-7 text-center text-sm text-slate-400 dark:border-slate-700">
          {t("Rien encore. « Mettre de côté » : l'argent sort de ton solde, s'ajoute à tes dépenses comme épargne, et tu peux noter où tu l'as mis. « J'ai déjà une épargne » : l'argent que tu avais déjà, sans toucher à ton solde.")}
        </p>
      ) : (
        months.map((m) => {
          // The day money moved, over the line above it (once for the same
          // day); what didn't move (not paid, already saved) after, undated.
          const list = withDividers(
            rows.filter((r) => r.date.startsWith(m)),
            (r) => (r.counted && r.move.kind !== "existing" ? r.date : ""),
            (day) => whenLabel(day, lang, t),
            t("Sans date"),
          );
          return (
            <section key={m} className="flex flex-col gap-2">
              <h2 className="px-1 text-sm font-semibold capitalize text-slate-600 dark:text-slate-300">{monthLabel(parseMonthKey(m), lang)}</h2>
              <ul className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {list.map(({ item: { key, move: x, amount, method, counted }, divider }) => (
                  <Fragment key={key}>
                  {divider && <DateDivider label={divider} />}
                  <li className={cn(!divider && "border-t border-slate-100 first:border-t-0 dark:border-slate-800")}>
                    <Link href={x.href} className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 dark:active:bg-slate-800/60">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-lg",
                          "gx-tile",
                        )}
                      >
                        {x.kind === "existing" ? "🏦" : x.kind === "in" ? "🐷" : x.kind === "goal" ? "🎯" : "↩️"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                            {x.note ||
                              (x.kind === "existing" ? t("Déjà épargné") : x.kind === "in" ? t("Mis de côté") : x.kind === "goal" ? t("Objectif") : t("Retiré"))}
                          </span>
                          {x.monthly && (
                            <span className="shrink-0 rounded-full bg-lime-50 px-1.5 py-0.5 text-[10px] font-semibold text-lime-700 dark:bg-lime-950/60 dark:text-lime-300">
                              🔁 {t("Chaque mois")}
                            </span>
                          )}
                          {!counted && (
                            <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
                              {t("Non payé")}
                            </span>
                          )}
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          {x.kind === "existing"
                            ? t("Déjà épargné · hors solde")
                            : x.kind === "in"
                              ? <><MethodIcon method={method} /> → 🐷</>
                              : x.kind === "goal"
                                ? `🐷 → 🎯 ${t("Versement à l'objectif")}`
                                : <>🐷 → <MethodIcon method={method} /></>}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          !counted
                            ? "text-slate-400 line-through"
                            : x.kind === "out" || x.kind === "goal"
                              ? "text-amber-600"
                              : "text-lime-700 dark:text-lime-400",
                        )}
                      >
                        {x.kind === "out" || x.kind === "goal" ? "−" : "+"}
                        {money(amount)}
                      </span>
                      <CaretRight weight="bold" className="h-4 w-4 text-slate-300" />
                    </Link>
                  </li>
                  </Fragment>
                ))}
              </ul>
            </section>
          );
        })
      )}

      <ExistingSavingsDialog open={existingOpen} onOpenChange={setExistingOpen} />

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
