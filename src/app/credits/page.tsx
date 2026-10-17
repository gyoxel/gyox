import { getAllCategories, getAllDarets, getAllExpenses, getAllPayments, getSettings } from "@/lib/page-data";
import { TimelineSection } from "@/components/timeline-section";
import { displayIcon } from "@/lib/category";
import { PageHeader } from "@/components/page-header";
import { HeaderAdd } from "@/components/header-add";
import { AddLink } from "@/components/add-link";
import { CreditCard } from "@/components/credit-card";
import { getCreditRealState, getExpenseDisplayColor } from "@/lib/engine";
import { todayMonth } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function CreditsPage() {
  const [settings, payments, expenses, categories, darets] = await Promise.all([
    getSettings(),
    getAllPayments(),
    getAllExpenses(),
    getAllCategories(),
    getAllDarets(),
  ]);
  const categoryEmoji = new Map(categories.map((c) => [c.id, c.emoji]));
  // The last added on top; finished credits last.
  const current = todayMonth();
  const credits = expenses
    .filter((e) => e.type === "credit")
    .map((e) => ({ e, state: getCreditRealState(e, payments, current) }))
    .sort(
      (a, b) =>
        Number(a.state.status === "completed") - Number(b.state.status === "completed") || b.e.createdAt.localeCompare(a.e.createdAt),
    )
    .map(({ e }) => e);

  return (
    <>
      <PageHeader title="Crédits" action={<HeaderAdd href="/expenses/new?type=credit" label="Ajouter un crédit" />} />
      <main className="flex flex-col gap-5 px-4 py-5">
        <TimelineSection expenses={expenses} darets={darets} payments={payments} currency={settings.currency} categoryEmoji={categoryEmoji} />

        <AddLink href="/expenses/new?type=credit" label="Ajouter un crédit" className="mt-1" />

        <h2 className="-mb-2 flex items-baseline justify-between px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <span>Crédits</span>
          <span className="text-xs font-normal">{credits.length} en tout</span>
        </h2>
        {credits.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
            Aucun crédit en cours.
          </p>
        ) : (
          credits.map((c) => (
            <CreditCard
              key={c.id}
              expense={c}
              payments={payments}
              currency={settings.currency}
              color={getExpenseDisplayColor(c)}
              icon={displayIcon(c, categoryEmoji)}
            />
          ))
        )}
      </main>
    </>
  );
}
