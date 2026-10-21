import { getAllDarets, getAllIncomes, getIncomeCategories, getSettings } from "@/lib/page-data";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/ssr";

import { daretPayout } from "@/lib/daret";
import { incomeCategory, incomesIn } from "@/lib/income";

import { monthKey, parseMonthKey, todayMonth } from "@/lib/date";
import { monthLabel, whenLabel } from "@/lib/i18n/dates";
import { categoryName, localName } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/utils";
import type { Income } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { HeaderAdd } from "@/components/header-add";
import { AddLink } from "@/components/add-link";
import { MethodLabel } from "@/components/method-icon";

export const dynamic = "force-dynamic";

/** Revenus: extra money received on top of the salary, month by month. */
export default async function IncomesPage() {
  const [incomes, settings, darets, incomeCategories, { lang, t }] = await Promise.all([
    getAllIncomes(),
    getSettings(),
    getAllDarets(),
    getIncomeCategories(),
    getI18n(),
  ]);
  const categoryLabel = (key: string) => {
    const c = incomeCategory(key, incomeCategories);
    return c.system ? t(c.label) : categoryName(c.label, t);
  };
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
    /** When it was added: orders a day's rows, the last on top. */
    at: string;
    method: Income["method"];
    amount: number;
    badge?: string;
  };
  const rows: Row[] = [
    // Money lent and given back isn't income: it's in « Argent prêté ».
    ...incomes.filter((i) => i.category !== "pret").map((i) => ({
      id: i.id,
      href: `/incomes/${i.id}`,
      emoji: incomeCategory(i.category, incomeCategories).emoji,
      name: localName(i.name, t),
      sub: categoryLabel(i.category),
      date: i.date,
      at: i.createdAt,
      method: i.method,
      amount: i.amount,
      badge: i.expenseId
        ? t("Dette")
        : i.category === "epargne"
          ? t("Épargne")
          : i.category === "budget"
            ? t("Budget")
            : undefined,
    })),
    ...darets
      .filter((d) => d.payoutMethod && d.payoutReceivedAt)
      .map((d) => ({
        id: `daret-${d.id}`,
        href: "/daret",
        emoji: "🤝🏻",
        name: `${t("Daret")} · ${d.expense.name}`,
        sub: t("Daret reçue"),
        date: dayOf(d.payoutReceivedAt!),
        at: d.payoutReceivedAt!,
        method: d.payoutMethod!,
        amount: daretPayout(d),
        badge: t("Daret"),
      })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.at.localeCompare(a.at));
  const months = [...new Set(rows.map((r) => r.date.slice(0, 7)))];
  // Small, the day it came.
  const now = new Date();
  const when = (r: Row) => whenLabel(r.date, lang, t, now);

  return (
    <>
      <PageHeader title={t("Revenus")} back info="incomes" action={<HeaderAdd href="/incomes/new" label={t("Ajouter un revenu")} />} />
      <main className="flex flex-col gap-5 px-4 py-5">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 px-5 pb-4 pt-5 text-white shadow-lg shadow-emerald-600/20 dark:shadow-none">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">{t("Revenus en plus ce mois-ci")}</p>
          <p className="mt-0.5 text-3xl font-bold tabular-nums">+{money(thisMonth)}</p>
          <p className="mt-1 text-[11px] text-white/80">
            {t("En plus du salaire ({salary}), ajoutés à ton solde du mois.", { salary: money(settings.salary) })}
          </p>
        </div>

        <AddLink href="/incomes/new" label={t("Ajouter un revenu")} />

        {months.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400 dark:border-slate-700">
            {t("Aucun revenu en plus pour l'instant : prime, freelance, cadeau, vente…")}
          </p>
        ) : (
          months.map((m) => {
            const list = rows.filter((r) => r.date.startsWith(m));
            return (
              <section key={m} className="flex flex-col gap-2">
                <h2 className="flex items-center justify-between px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <span className="capitalize">{monthLabel(parseMonthKey(m), lang)}</span>
                  <span className="tabular-nums text-emerald-600">+{money(list.reduce((sum, r) => sum + r.amount, 0))}</span>
                </h2>
                <ul className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  {list.map((r) => (
                    <li key={r.id} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                      <Link href={r.href} className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 dark:active:bg-slate-800/60">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl gx-tile text-lg">
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
                            {r.sub} · {when(r)} · <MethodLabel method={r.method} />
                          </span>
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-emerald-600">+{money(r.amount)}</span>
                        <CaretRight weight="bold" className="h-4 w-4 text-slate-300" />
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
