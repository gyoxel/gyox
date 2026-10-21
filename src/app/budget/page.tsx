import { getAllCategories, getAllExpenses, getAllPayments, getSettings } from "@/lib/page-data";
import Link from "next/link";
import { Fragment } from "react";
import { CalendarBlank, CaretRight, Check, Clock, Tag } from "@phosphor-icons/react/ssr";

import { monthFromSearchParams, monthKey, todayMonth } from "@/lib/date";
import { monthLabel, monthLabelShort, whenLabel } from "@/lib/i18n/dates";
import { categoryName, localName } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { expenseActionAt, findPayment, getEffectiveEndMonth, getMonthPaymentStatus, getMonthSummary } from "@/lib/engine";
import { MonthSwitcher } from "@/components/month-switcher";
import { DateDivider, withDividers } from "@/components/date-divider";
import { PageHeader } from "@/components/page-header";
import { HeaderAdd } from "@/components/header-add";
import { AddLink } from "@/components/add-link";
import { displayIcon } from "@/lib/category";
import { cn, formatMoney } from "@/lib/utils";
import type { Expense, PaymentMethod, PaymentStatus } from "@/lib/types";
import { MethodIcon } from "@/components/method-icon";
import { BudgetBar, LEVEL_TEXT } from "@/components/budget-bar";
import { budgetLevel } from "@/lib/category-budgets";

export const dynamic = "force-dynamic";

interface Row {
  expense: Expense;
  icon: string;
  amount: number;
  /** Paid of it that month (its parts added up). */
  paid: number;
  status: PaymentStatus;
  method: PaymentMethod | null;
  /** "Chaque mois", "Jusqu'à juin 2027", "Une fois". */
  kind: string;
}

/**
 * Dépenses (credits live on the Crédits page): the month's total, what's
 * paid and what's left, then every expense — by date (the default: the last
 * done on top, its day on the line above) or by category (against its
 * budget, if it has one) — each with its status (paid — cash or card — or
 * to pay). Tapping one opens it.
 */
export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ month?: string; view?: string }> }) {
  const [sp, settings, expenses, payments, categories, { lang, t }] = await Promise.all([
    searchParams,
    getSettings(),
    getAllExpenses(),
    getAllPayments(),
    getAllCategories(),
    getI18n(),
  ]);
  const money = (n: number) => formatMoney(n, settings.currency);
  const categoryEmoji = new Map(categories.map((c) => [c.id, c.emoji]));
  const byId = new Map(expenses.map((e) => [e.id, e]));
  // Opens on the current month (like the home page); ‹ › for the others.
  const current = todayMonth();
  const viewMonth = monthFromSearchParams(sp.month, current);
  const key = monthKey(viewMonth);
  const summary = getMonthSummary(expenses, viewMonth, settings.salary);

  const rows: Row[] = summary.occurrences
    .filter((occ) => occ.expense.type !== "credit")
    .map((occ) => {
      const e = occ.expense;
      const end = e.type === "temporary" && e.frequency === "monthly" ? getEffectiveEndMonth(e, byId) : null;
      const status = getMonthPaymentStatus(e, viewMonth, payments, current);
      const paid = findPayment(payments, e.id, key)?.amountPaid ?? 0;
      return {
        expense: e,
        icon: displayIcon(e, categoryEmoji),
        // Paid: what it really cost (paid in part and the month over: what's
        // left went with it). Else the month's amount, part of it maybe paid.
        amount: status === "paid" && paid > 0 ? paid : occ.amount,
        paid,
        status,
        method: payments.filter((p) => p.expenseId === e.id && p.monthKey === key && p.amountPaid > 0).at(-1)?.method ?? null,
        kind:
          e.type === "permanent"
            ? t("Chaque mois")
            : e.frequency === "one-time"
              ? t("Une fois")
              : end
                ? t("Jusqu'à {month}", { month: monthLabelShort(end, lang).toLowerCase() })
                : t("Temporaire"),
      };
    });

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const paid = rows.reduce((s, r) => s + (r.status === "paid" ? r.amount : r.paid), 0);
  const paidCount = rows.filter((r) => r.status === "paid").length;
  const percent = total > 0 ? Math.round((paid / total) * 100) : 0;

  // By date unless asked by category.
  const byDate = sp.view !== "category";
  const viewHref = (date: boolean) => `/budget?month=${key}${date ? "" : "&view=category"}`;

  // The last done (paid, edited) this month on top, the day over the line
  // above it (once for the same day); nothing done yet: after, the last
  // added first, without a day.
  const now = new Date();
  const newestFirst = [...rows].sort((a, b) => b.expense.createdAt.localeCompare(a.expense.createdAt));
  const dated = (list: Row[]) =>
    withDividers(list, (r) => expenseActionAt(r.expense, payments, key), (iso) => whenLabel(iso, lang, t, now), t("Sans date"));

  // Grouped by category, in the categories' own order; uncategorized last.
  const groups = [
    ...categories.map((c) => ({ id: c.id, label: categoryName(c.name, t), emoji: c.emoji, budget: c.budget ?? null })),
    { id: null as string | null, label: t("Sans catégorie"), emoji: "🏷️", budget: null },
  ]
    .map((g) => {
      const list = newestFirst.filter((r) => (g.id ? r.expense.categoryId === g.id : !r.expense.categoryId || !categoryEmoji.has(r.expense.categoryId)));
      return { ...g, list, subtotal: list.reduce((s, r) => s + r.amount, 0) };
    })
    .filter((g) => g.list.length > 0);

  // One expense (under the day it was done, when it starts one): its name,
  // what it is, its amount and status.
  const row = ({ item: r, divider }: { item: Row; divider: string | null }) => {
    const isPaid = r.status === "paid";
    const partly = !isPaid && r.paid > 0.005;
    return (
      <Fragment key={r.expense.id}>
      {divider && <DateDivider label={divider} />}
      <li className={cn(!divider && "border-t border-slate-100 first:border-t-0 dark:border-slate-800")}>
        <Link
          href={`/expenses/${r.expense.id}`}
          className="flex items-center gap-3 px-3.5 py-3 active:bg-slate-50 dark:active:bg-slate-800/60"
        >
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xl",
              "gx-tile",
            )}
          >
            {r.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate text-sm font-semibold text-slate-900 dark:text-white",
                isPaid && "text-slate-500 dark:text-slate-400",
              )}
            >
              {localName(r.expense.name, t)}
            </span>
            <span className="block truncate text-[11px] text-slate-400">
              {partly ? t("{paid} payés sur {due}", { paid: money(r.paid), due: money(r.amount) }) : r.kind}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1">
            <span
              className={cn(
                "text-sm font-bold tabular-nums",
                isPaid ? "text-slate-400 line-through" : "text-rose-600",
              )}
            >
              {money(r.amount)}
            </span>
            {isPaid ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <Check weight="bold" className="h-3 w-3" />
                {t("Payé")}
                {r.method && <MethodIcon method={r.method} className="ml-0.5" />}
              </span>
            ) : partly ? (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                <Clock weight="bold" className="h-3 w-3" />
                {t("Reste {amount}", { amount: money(Math.max(0, r.amount - r.paid)) })}
              </span>
            ) : (
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  r.status === "unpaid"
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                )}
              >
                <Clock weight="bold" className="h-3 w-3" />
                {r.status === "unpaid" ? t("À payer") : t("À venir")}
              </span>
            )}
          </span>
          <CaretRight weight="bold" className="h-4 w-4 shrink-0 text-slate-300" />
        </Link>
      </li>
      </Fragment>
    );
  };
  const viewTab = (date: boolean) =>
    cn(
      "flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium text-slate-500 transition-colors dark:text-slate-400",
      byDate === date && "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white",
    );

  return (
    <>
      <PageHeader title={t("Dépenses")} info="budget" action={<HeaderAdd href="/expenses/new" label={t("Ajouter une dépense")} />} />
      <main className="flex flex-col gap-5 px-4 py-5">
        <MonthSwitcher month={viewMonth} basePath="/budget" />

        {/* Summary */}
        <div className="rounded-3xl bg-gradient-to-br from-rose-500 to-pink-700 px-5 pb-4 pt-5 text-white shadow-lg shadow-rose-500/20 dark:shadow-none">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
            {t("Dépenses")} · {monthLabel(viewMonth, lang)}
          </p>
          <p className="mt-0.5 text-3xl font-bold tabular-nums">{money(total)}</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/15 px-3 py-2">
              <p className="text-[11px] text-white/75">{t("Payé")}</p>
              <p className="text-sm font-bold tabular-nums">{money(paid)}</p>
            </div>
            <div className="rounded-xl bg-white/15 px-3 py-2">
              <p className="text-[11px] text-white/75">{t("Reste à payer")}</p>
              <p className="text-sm font-bold tabular-nums">{money(total - paid)}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-white/80">
            {t(paidCount > 1 ? "{paid}/{total} payées" : "{paid}/{total} payée", { paid: paidCount, total: rows.length })} · {percent}%
          </p>
        </div>

        <AddLink href="/expenses/new" label={t("Ajouter une dépense")} />

        {rows.length > 0 && (
          <nav aria-label={t("Affichage des dépenses")} className="-mt-1 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
            <Link href={viewHref(true)} replace scroll={false} aria-current={byDate ? "page" : undefined} className={viewTab(true)}>
              <CalendarBlank weight={byDate ? "fill" : "bold"} className="h-3.5 w-3.5 text-violet-600 dark:text-violet-300" />
              {t("Par date")}
            </Link>
            <Link href={viewHref(false)} replace scroll={false} aria-current={!byDate ? "page" : undefined} className={viewTab(false)}>
              <Tag weight={!byDate ? "fill" : "bold"} className="h-3.5 w-3.5 text-violet-600 dark:text-violet-300" />
              {t("Par catégorie")}
            </Link>
          </nav>
        )}

        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
            {t("Aucune dépense prévue pour ce mois.")}
          </p>
        ) : byDate ? (
          <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {dated(newestFirst).map(row)}
          </ul>
        ) : (
          groups.map((g) => (
            <section key={g.id ?? "none"} className="flex flex-col gap-2">
              <h2 className="flex items-center justify-between px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{g.emoji}</span>
                  {g.label}
                </span>
                {g.budget ? (
                  <Link href={`/budgets/${g.id}?month=${key}`} className="tabular-nums active:opacity-70">
                    <span className={LEVEL_TEXT[budgetLevel(g.subtotal, g.budget)]}>{money(g.subtotal)}</span>
                    <span className="font-medium text-slate-400"> / {money(g.budget)}</span>
                  </Link>
                ) : (
                  <span className="tabular-nums text-slate-400">{money(g.subtotal)}</span>
                )}
              </h2>
              {g.budget && <BudgetBar spent={g.subtotal} budget={g.budget} className="-mt-0.5 mx-1 h-1.5" />}
              <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {dated(g.list).map(row)}
              </ul>
            </section>
          ))
        )}
      </main>
    </>
  );
}
