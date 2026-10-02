import Link from "next/link";
import { Check, ChevronRight, Clock, Plus } from "lucide-react";
import { getAllCategories, getAllExpenses, getAllPayments, getSettings } from "@/lib/repository";
import { monthFromSearchParams, monthKey, monthLabelFr, monthLabelShortFr, todayMonth } from "@/lib/date";
import { getEffectiveEndMonth, getMonthPaymentStatus, getMonthSummary } from "@/lib/engine";
import { METHOD_META } from "@/lib/payment-method";
import { MonthSwitcher } from "@/components/month-switcher";
import { PageHeader } from "@/components/page-header";
import { displayIcon } from "@/lib/category";
import { cn, formatMoney } from "@/lib/utils";
import type { Expense, PaymentMethod, PaymentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Row {
  expense: Expense;
  icon: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod | null;
  /** "Chaque mois", "Jusqu'à juin 2027", "Une fois". */
  kind: string;
}

/**
 * Dépenses (credits live on the Crédits page): the month's total, what's
 * paid and what's left, then every expense grouped by category, each with
 * its status (paid — cash or card — or to pay). Tapping one opens it.
 */
export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const [sp, settings, expenses, payments, categories] = await Promise.all([
    searchParams,
    getSettings(),
    getAllExpenses(),
    getAllPayments(),
    getAllCategories(),
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
      return {
        expense: e,
        icon: displayIcon(e, categoryEmoji),
        amount: occ.amount,
        status: getMonthPaymentStatus(e, viewMonth, payments, current),
        method: payments.find((p) => p.expenseId === e.id && p.monthKey === key)?.method ?? null,
        kind:
          e.type === "permanent"
            ? "Chaque mois"
            : e.frequency === "one-time"
              ? "Une fois"
              : end
                ? `Jusqu'à ${monthLabelShortFr(end).toLowerCase()}`
                : "Temporaire",
      };
    });

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const paid = rows.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0);
  const paidCount = rows.filter((r) => r.status === "paid").length;
  const percent = total > 0 ? Math.round((paid / total) * 100) : 0;

  // Grouped by category, in the categories' own order; uncategorized last.
  const groups = [
    ...categories.map((c) => ({ id: c.id, label: c.name, emoji: c.emoji })),
    { id: null as string | null, label: "Sans catégorie", emoji: "🏷️" },
  ]
    .map((g) => {
      const list = rows
        .filter((r) => (g.id ? r.expense.categoryId === g.id : !r.expense.categoryId || !categoryEmoji.has(r.expense.categoryId)))
        .sort((a, b) => Number(a.status === "paid") - Number(b.status === "paid") || b.amount - a.amount);
      return { ...g, list, subtotal: list.reduce((s, r) => s + r.amount, 0) };
    })
    .filter((g) => g.list.length > 0);

  return (
    <>
      <PageHeader title="Dépenses" />
      <main className="flex flex-col gap-5 px-4 py-5">
        <MonthSwitcher month={viewMonth} basePath="/budget" />

        {/* Summary */}
        <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-pink-700 px-4 pb-4 pt-3.5 text-white shadow-sm">
          <p className="text-xs font-medium capitalize text-white/80">Dépenses · {monthLabelFr(viewMonth)}</p>
          <p className="mt-0.5 text-3xl font-bold tabular-nums">{money(total)}</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/15 px-3 py-2">
              <p className="text-[11px] text-white/75">Payé</p>
              <p className="text-sm font-bold tabular-nums">{money(paid)}</p>
            </div>
            <div className="rounded-xl bg-white/15 px-3 py-2">
              <p className="text-[11px] text-white/75">Reste à payer</p>
              <p className="text-sm font-bold tabular-nums">{money(total - paid)}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-white/80">
            {paidCount}/{rows.length} payée{paidCount > 1 ? "s" : ""} · {percent}%
          </p>
        </div>

        {groups.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
            Aucune dépense prévue pour ce mois.
          </p>
        ) : (
          groups.map((g) => (
            <section key={g.id ?? "none"} className="flex flex-col gap-2">
              <h2 className="flex items-center justify-between px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{g.emoji}</span>
                  {g.label}
                </span>
                <span className="tabular-nums text-slate-400">{money(g.subtotal)}</span>
              </h2>
              <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {g.list.map((r) => {
                  const isPaid = r.status === "paid";
                  return (
                    <li key={r.expense.id} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                      <Link
                        href={`/expenses/${r.expense.id}`}
                        prefetch
                        className="flex items-center gap-3 px-3.5 py-3 active:bg-slate-50 dark:active:bg-slate-800/60"
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl",
                            isPaid ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-rose-50 dark:bg-rose-950/40",
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
                            {r.expense.name}
                          </span>
                          <span className="block truncate text-[11px] text-slate-400">{r.kind}</span>
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
                              <Check className="h-3 w-3" />
                              Payé{r.method && ` ${METHOD_META[r.method].emoji}`}
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
                              <Clock className="h-3 w-3" />
                              {r.status === "unpaid" ? "À payer" : "À venir"}
                            </span>
                          )}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}

        <Link
          href="/expenses/new"
          prefetch
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-rose-200 py-3.5 text-sm font-semibold text-rose-600 active:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:active:bg-rose-950/30"
        >
          <Plus className="h-4 w-4" />
          Ajouter une dépense
        </Link>
      </main>
    </>
  );
}
