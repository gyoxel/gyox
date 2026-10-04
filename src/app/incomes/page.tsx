import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getAllDarets, getAllIncomes, getSettings } from "@/lib/repository";
import { daretPayout } from "@/lib/daret";
import { incomeCategory, incomesIn } from "@/lib/income";
import { getIncomeCategories } from "@/lib/income-categories-repo";
import { monthKey, monthLabelFr, parseMonthKey, todayMonth } from "@/lib/date";
import { formatMoney } from "@/lib/utils";
import type { Income } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { AddLink } from "@/components/add-link";
import { METHOD_META } from "@/lib/payment-method";

export const dynamic = "force-dynamic";

/** Revenus: extra money received on top of the salary, month by month. */
export default async function IncomesPage() {
  const [incomes, settings, darets, incomeCategories] = await Promise.all([
    getAllIncomes(),
    getSettings(),
    getAllDarets(),
    getIncomeCategories(),
  ]);
  const money = (n: number) => formatMoney(n, settings.currency);
  const current = monthKey(todayMonth());
  const thisMonth = incomesIn(incomes, current);
  // Every row: the incomes, plus the darets collected (those are handled
  // from Daret: tapping one opens it).
  const dayOf = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca" }).format(new Date(iso));
  type Row = {
    id: string;
    href: string;
    emoji: string;
    name: string;
    sub: string;
    date: string;
    method: Income["method"];
    amount: number;
    badge?: string;
  };
  const rows: Row[] = [
    ...incomes.map((i) => ({
      id: i.id,
      href: `/incomes/${i.id}`,
      emoji: incomeCategory(i.category, incomeCategories).emoji,
      name: i.name,
      sub: incomeCategory(i.category, incomeCategories).label,
      date: i.date,
      method: i.method,
      amount: i.amount,
      badge: i.expenseId ? "Crédit" : i.category === "epargne" ? "Épargne" : i.category === "pret" ? "Prêt" : undefined,
    })),
    ...darets
      .filter((d) => d.payoutMethod && d.payoutReceivedAt)
      .map((d) => ({
        id: `daret-${d.id}`,
        href: "/daret",
        emoji: "🤝🏻",
        name: `Daret · ${d.expense.name}`,
        sub: "Daret reçue",
        date: dayOf(d.payoutReceivedAt!),
        method: d.payoutMethod!,
        amount: daretPayout(d),
        badge: "Daret",
      })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const months = [...new Set(rows.map((r) => r.date.slice(0, 7)))];

  return (
    <>
      <PageHeader title="Revenus" back />
      <main className="flex flex-col gap-5 px-4 py-5">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 px-5 pb-4 pt-5 text-white shadow-lg shadow-emerald-600/20 dark:shadow-none">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">Revenus en plus ce mois-ci</p>
          <p className="mt-0.5 text-3xl font-bold tabular-nums">+{money(thisMonth)}</p>
          <p className="mt-1 text-[11px] text-white/80">
            En plus du salaire ({money(settings.salary)}), ajoutés à ton solde du mois.
          </p>
        </div>

        <AddLink href="/incomes/new" label="Ajouter un revenu" className="border-emerald-200 text-emerald-600 active:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:active:bg-emerald-950/30" />

        {months.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400 dark:border-slate-700">
            Aucun revenu en plus pour l&apos;instant : prime, freelance, cadeau, vente…
          </p>
        ) : (
          months.map((m) => {
            const list = rows.filter((r) => r.date.startsWith(m));
            return (
              <section key={m} className="flex flex-col gap-2">
                <h2 className="flex items-center justify-between px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <span className="capitalize">{monthLabelFr(parseMonthKey(m))}</span>
                  <span className="tabular-nums text-emerald-600">+{money(list.reduce((sum, r) => sum + r.amount, 0))}</span>
                </h2>
                <ul className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  {list.map((r) => (
                    <li key={r.id} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                      <Link href={r.href} className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 dark:active:bg-slate-800/60">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg dark:bg-emerald-950/50">
                          {r.emoji}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{r.name}</span>
                            {r.badge && (
                              <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                {r.badge}
                              </span>
                            )}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {r.sub} · {r.date.slice(8, 10)}/{r.date.slice(5, 7)} · {METHOD_META[r.method].emoji} {METHOD_META[r.method].label}
                          </span>
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-emerald-600">+{money(r.amount)}</span>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </main>
    </>
  );
}
