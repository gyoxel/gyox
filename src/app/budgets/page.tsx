import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { getAllBudgetEntries, getAllBudgets, getAllPayments, getSettings } from "@/lib/page-data";
import { budgetMonthState } from "@/lib/budgets";
import { monthKey, monthLabelFr, todayMonth } from "@/lib/date";
import { cn, formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { HeaderAdd } from "@/components/header-add";

export const dynamic = "force-dynamic";

/** Budgets: this month's of each (taken, spent, left / gone past), then those not running now. */
export default async function BudgetsPage() {
  const [settings, budgets, entries, payments] = await Promise.all([getSettings(), getAllBudgets(), getAllBudgetEntries(), getAllPayments()]);
  const current = monthKey(todayMonth());
  const money = (n: number) => formatMoney(n, settings.currency);
  const rows = budgets.map((b) => ({
    budget: b,
    state: budgetMonthState(b.expense, entries.filter((e) => e.budgetId === b.id), payments, current, current),
  }));
  const running = rows.filter((r) => r.state.amount > 0 || r.state.spent > 0);
  const others = rows.filter((r) => !running.includes(r));
  const total = running.reduce((s, r) => s + r.state.amount, 0);
  const spent = running.reduce((s, r) => s + r.state.spent, 0);

  return (
    <>
      <PageHeader title="Budgets" back action={<HeaderAdd href="/budgets/new" label="Ajouter un budget" />} />
      <main className="flex flex-col gap-5 px-4 py-5">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-400 via-purple-500 to-violet-700 px-5 pb-4 pt-5 text-white shadow-lg shadow-purple-500/20 dark:shadow-none">
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
          <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
            Budgets · <span className="capitalize">{monthLabelFr(todayMonth())}</span>
          </p>
          <p className="relative mt-1 text-4xl font-bold tabular-nums">{money(Math.max(0, total - spent))}</p>
          <p className="relative text-xs text-white/85">
            restants sur {money(total)} · {money(spent)} dépensés
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-200 px-4 py-7 text-center text-sm text-slate-500 dark:border-slate-700">
            <p>
              Un budget, c&apos;est un montant pour quelque chose (transport, courses…). Tu le prends en une fois, puis tu
              notes chaque jour ce que tu en dépenses.
            </p>
            <p className="text-xs text-slate-400">
              Ce qui dépasse s&apos;ajoute à tes dépenses ; ce qui reste à la fin du mois revient dans tes revenus.
            </p>
            <Link
              href="/budgets/new"
              className="mx-auto inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white active:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Créer un budget
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-2.5">
              {running.map(({ budget, state }) => {
                const pct = state.amount > 0 ? Math.min(100, Math.round((state.spent / state.amount) * 100)) : 100;
                return (
                  <li key={budget.id}>
                    <Link
                      href={`/budgets/${budget.id}`}
                      className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm active:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:active:bg-slate-800/60"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-xl dark:bg-purple-950/50">
                          {budget.expense.icon ?? "👛"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[15px] font-semibold text-slate-900 dark:text-white">{budget.expense.name}</span>
                            {!state.taken && state.amount > 0 && (
                              <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                Pas encore pris
                              </span>
                            )}
                          </span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">
                            {money(state.spent)} dépensés sur {money(state.amount)}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span
                            className={cn(
                              "block text-base font-bold tabular-nums",
                              state.over > 0 ? "text-rose-600" : "text-purple-700 dark:text-purple-300",
                            )}
                          >
                            {state.over > 0 ? `+${money(state.over)}` : money(state.left)}
                          </span>
                          <span className="text-[10px] uppercase tracking-wide text-slate-400">{state.over > 0 ? "dépassé" : "reste"}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                      </span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <span
                          className={cn("block h-full rounded-full", state.over > 0 ? "bg-rose-500" : "bg-gradient-to-r from-fuchsia-500 to-purple-600")}
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {others.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Pas ce mois-ci</h2>
                <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  {others.map(({ budget }) => (
                    <li key={budget.id} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                      <Link href={`/budgets/${budget.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 dark:active:bg-slate-800/60">
                        <span className="text-lg">{budget.expense.icon ?? "👛"}</span>
                        <span className="flex-1 truncate text-sm text-slate-600 dark:text-slate-300">{budget.expense.name}</span>
                        <span className="text-xs text-slate-400">{money(budget.expense.amount)}</span>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
