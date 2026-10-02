import Link from "next/link";
import { Plus } from "lucide-react";
import { getAllCategories, getAllDarets, getAllExpenses, getAllPayments, getSettings } from "@/lib/repository";
import { TimelineSection } from "@/components/timeline-section";
import { displayIcon } from "@/lib/category";
import { PageHeader } from "@/components/page-header";
import { CreditCard } from "@/components/credit-card";
import { getExpenseDisplayColor } from "@/lib/engine";
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
  const credits = expenses.filter((e) => e.type === "credit");

  return (
    <>
      <PageHeader
        title="Crédits"
        action={
          <Button asChild size="sm">
            <Link href="/expenses/new?type=credit">
              <Plus className="h-4 w-4" />
              Crédit
            </Link>
          </Button>
        }
      />
      <main className="flex flex-col gap-3 px-4 py-5">
        <TimelineSection expenses={expenses} darets={darets} payments={payments} currency={settings.currency} categoryEmoji={categoryEmoji} />

        <h2 className="mt-3 px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Crédits</h2>
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
