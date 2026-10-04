import Link from "next/link";
import { Plus } from "lucide-react";
import { getAllCategories, getAllDarets, getAllExpenses, getAllPayments, getSettings } from "@/lib/repository";
import { TimelineSection } from "@/components/timeline-section";
import { displayIcon } from "@/lib/category";
import { PageHeader } from "@/components/page-header";
import { CreditCard } from "@/components/credit-card";
import { getCreditEndMonth, getCreditRealState, getExpenseDisplayColor } from "@/lib/engine";
import { compareMonths, todayMonth } from "@/lib/date";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  // Soonest end first; finished credits last.
  const current = todayMonth();
  const credits = expenses
    .filter((e) => e.type === "credit")
    .map((e) => ({ e, state: getCreditRealState(e, payments, current) }))
    .sort((a, b) => {
      const da = a.state.status === "completed" ? 1 : 0;
      const db = b.state.status === "completed" ? 1 : 0;
      if (da !== db) return da - db;
      const ea = a.state.projectedEndMonth ?? getCreditEndMonth(a.e);
      const eb = b.state.projectedEndMonth ?? getCreditEndMonth(b.e);
      if (!ea || !eb) return ea ? -1 : eb ? 1 : 0;
      return compareMonths(ea, eb);
    })
    .map(({ e }) => e);

  return (
    <>
      <PageHeader
        title="Crédits"
        action={
          <Button asChild size="sm" className="h-10 rounded-full bg-white px-3.5 text-blue-600 shadow-sm hover:bg-white/90">
            <Link href="/expenses/new?type=credit">
              <Plus className="h-4 w-4" />
              Crédit
            </Link>
          </Button>
        }
      />
      <main className="flex flex-col gap-3 px-4 py-5">
        <TimelineSection expenses={expenses} darets={darets} payments={payments} currency={settings.currency} categoryEmoji={categoryEmoji} />

        <h2 className="mt-3 flex items-baseline justify-between px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
          <span>Crédits</span>
          <span className="text-xs font-normal">{credits.length} en tout</span>
        </h2>
        {credits.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">Aucun crédit en cours.</CardContent>
          </Card>
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
