import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { getAllIncomes, getSettings } from "@/lib/repository";
import { incomeCategory, incomesIn } from "@/lib/income";
import { monthKey, monthLabelFr, parseMonthKey, todayMonth } from "@/lib/date";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { METHOD_META } from "@/lib/payment-method";

export const dynamic = "force-dynamic";

/** Revenus: extra money received on top of the salary, month by month. */
export default async function IncomesPage() {
  const [incomes, settings] = await Promise.all([getAllIncomes(), getSettings()]);
  const money = (n: number) => formatMoney(n, settings.currency);
  const current = monthKey(todayMonth());
  const thisMonth = incomesIn(incomes, current);
  const months = [...new Set(incomes.map((i) => i.date.slice(0, 7)))];

  return (
    <>
      <PageHeader title="Revenus" back />
      <main className="flex flex-col gap-5 px-4 py-5">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 px-4 py-4 text-white shadow-sm">
          <p className="text-xs font-medium text-white/80">Revenus en plus ce mois-ci</p>
          <p className="mt-0.5 text-3xl font-bold tabular-nums">+{money(thisMonth)}</p>
          <p className="mt-1 text-[11px] text-white/80">
            En plus du salaire ({money(settings.salary)}), ajoutés à ton solde du mois.
          </p>
        </div>

        <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
          <Link href="/incomes/new">
            <Plus className="h-4 w-4" />
            Ajouter un revenu
          </Link>
        </Button>

        {months.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400 dark:border-slate-700">
            Aucun revenu en plus pour l&apos;instant : prime, freelance, cadeau, vente…
          </p>
        ) : (
          months.map((m) => {
            const list = incomes.filter((i) => i.date.startsWith(m));
            return (
              <section key={m} className="flex flex-col gap-2">
                <h2 className="flex items-center justify-between px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  <span className="capitalize">{monthLabelFr(parseMonthKey(m))}</span>
                  <span className="tabular-nums text-emerald-600">+{money(incomesIn(incomes, m))}</span>
                </h2>
                <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  {list.map((i) => {
                    const c = incomeCategory(i.category);
                    return (
                      <li key={i.id} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                        <Link
                          href={`/incomes/${i.id}`}
                          className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 dark:active:bg-slate-800/60"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg dark:bg-emerald-950/50">
                            {c.emoji}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{i.name}</span>
                            <span className="block text-[11px] text-slate-400">
                              {c.label} · {i.date.slice(8, 10)}/{i.date.slice(5, 7)} · {METHOD_META[i.method].emoji}{" "}
                              {METHOD_META[i.method].label}
                            </span>
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-emerald-600">+{money(i.amount)}</span>
                          <ChevronRight className="h-4 w-4 text-slate-300" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
        )}
      </main>
    </>
  );
}
