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
  const dividers = dividersOf(
    credits.map((c) => (c.at ? whenLabel(c.at, lang, t) : "")),
    t("Sans date"),
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
          credits.map(({ e: c }, i) => (
            <div key={c.id} className="flex flex-col gap-1.5">
              {dividers[i] && <DateDivider as="div" label={dividers[i]} className="px-2 pt-0" />}
              <CreditCard
                expense={c}
                payments={payments}
                currency={settings.currency}
                color={getExpenseDisplayColor(c)}
                icon={displayIcon(c, categoryEmoji)}
              />
            </div>
          ))
        )}
      </main>
    </>
  );
}
