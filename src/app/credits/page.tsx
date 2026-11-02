import { getAllCategories, getAllDarets, getAllExpenses, getAllPayments, getSettings } from "@/lib/page-data";
import { TimelineSection } from "@/components/timeline-section";
import { displayIcon } from "@/lib/category";
import { PageHeader } from "@/components/page-header";
import { HeaderAdd } from "@/components/header-add";
import { AddLink } from "@/components/add-link";
import { CreditCard } from "@/components/credit-card";
import { getCreditRealState, getExpenseDisplayColor, lastPaidAt } from "@/lib/engine";
import { whenLabel } from "@/lib/i18n/dates";
import { DateDivider, dividersOf, lastDoneFirst } from "@/components/date-divider";
import { todayMonth } from "@/lib/date";
import { getI18n } from "@/lib/i18n/server";
import { byPerson, personOf } from "@/lib/person-groups";
import { localName } from "@/lib/i18n";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CreditsPage() {
  const [settings, payments, expenses, categories, darets, { lang, t }] = await Promise.all([
    getSettings(),
    getAllPayments(),
    getAllExpenses(),
    getAllCategories(),
    getAllDarets(),
    getI18n(),
  ]);
  const categoryEmoji = new Map(categories.map((c) => [c.id, c.emoji]));
  // Finished credits last; in each, the last done (an installment paid,
  // its amount changed) on top, its day above it (once for the same day); nothing done
  // yet: after, the last added first.
  const current = todayMonth();
  const lastAt = (e: (typeof expenses)[number]) => {
    const paid = lastPaidAt(e.id, payments, "");
    return e.amountChangedAt && e.amountChangedAt > paid ? e.amountChangedAt : paid;
  };
  const credits = expenses
    .filter((e) => e.type === "credit")
    .map((e) => ({ e, done: getCreditRealState(e, payments, current).status === "completed", at: lastAt(e) }))
    .sort((a, b) => b.e.createdAt.localeCompare(a.e.createdAt))
    .sort(lastDoneFirst((c) => c.at))
    .sort((a, b) => Number(a.done) - Number(b.done));
  // Several debts to the same person: together (their total, each under
  // it), where the first of them comes; finished once all are.
  const groups = byPerson(credits, (c) => personOf(c.e))
    .map((members) => ({ members, done: members.every((m) => m.done), at: members.map((m) => m.at).reduce((a, b) => (b > a ? b : a), "") }))
    .sort((a, b) => Number(a.done) - Number(b.done));
  const dividers = dividersOf(
    groups.map((g) => (g.at ? whenLabel(g.at, lang, t) : "")),
    t("Sans date"),
  );
  const money = (n: number) => formatMoney(n, settings.currency);
  const card = (c: (typeof credits)[number]["e"], title?: string) => (
    <CreditCard
      key={c.id}
      expense={c}
      payments={payments}
      currency={settings.currency}
      color={getExpenseDisplayColor(c)}
      icon={displayIcon(c, categoryEmoji)}
      title={title}
    />
  );

  return (
    <>
      <PageHeader title={t("Dettes")} info="credits" action={<HeaderAdd href="/expenses/new?type=credit" label={t("Ajouter une dette")} />} />
      <main className="flex flex-col gap-5 px-4 py-5">
        <TimelineSection expenses={expenses} darets={darets} payments={payments} currency={settings.currency} categoryEmoji={categoryEmoji} />

        <AddLink href="/expenses/new?type=credit" label={t("Ajouter une dette")} className="mt-1" />

        <h2 className="-mb-2 flex items-baseline justify-between px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <span>{t("Dettes")}</span>
          <span className="text-xs font-normal">{t("{n} en tout", { n: credits.length })}</span>
        </h2>
        {credits.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
            {t("Aucune dette en cours.")}
          </p>
        ) : (
          groups.map(({ members }, i) => (
            <div key={members[0].e.id} className="flex flex-col gap-1.5">
              {dividers[i] && <DateDivider as="div" label={dividers[i]} className="px-2 pt-0" />}
              {members.length === 1 ? (
                card(members[0].e, members[0].e.person ? `${members[0].e.person} · ${localName(members[0].e.name, t)}` : undefined)
              ) : (
                <section className="flex flex-col gap-2 rounded-3xl border border-blue-200 bg-blue-50/50 p-2 dark:border-blue-900/60 dark:bg-blue-950/20">
                  <div className="flex items-center justify-between gap-2 px-2 pt-1">
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-bold text-slate-900 dark:text-white">{localName(personOf(members[0].e), t)}</span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        {t("{n} dettes", { n: members.length })} · {money(members.filter((m) => !m.done).reduce((s, m) => s + m.e.amount, 0))}
                        {t("/mois")}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-base font-bold tabular-nums text-slate-900 dark:text-white">
                        {money(members.reduce((s, m) => s + getCreditRealState(m.e, payments, current).remaining, 0))}
                      </span>
                      <span className="block text-[10px] uppercase tracking-wide text-slate-400">{t("restant en tout")}</span>
                    </span>
                  </div>
                  {members.map((m) =>
                    card(m.e, m.e.person ? localName(m.e.name, t) : m.e.notes?.trim() || t("Dette du {date}", { date: whenLabel(m.e.startDate, lang, t) })),
                  )}
                </section>
              )}
            </div>
          ))
        )}
      </main>
    </>
  );
}
