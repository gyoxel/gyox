import Link from "next/link";
import { Plus } from "lucide-react";
import { getAllDarets, getAllExpenses, getAllPayments, getSettings } from "@/lib/repository";
import { PageHeader } from "@/components/page-header";
import { CreditCard } from "@/components/credit-card";
import { RecurringDebtCard } from "@/components/recurring-debt-card";
import { TimelineSection } from "@/components/timeline-section";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CreditsPage() {
  const [settings, payments, expenses, darets] = await Promise.all([
    getSettings(),
    getAllPayments(),
    getAllExpenses(),
    getAllDarets(),
  ]);
  const byId = new Map(expenses.map((e) => [e.id, e]));
  const daretExpenseIds = new Set(darets.map((d) => d.expenseId));

  const credits = expenses.filter((e) => e.type === "credit");
  // Everything else that repeats monthly toward an end — money being paid
  // back over time — except permanent expenses and darets (own page).
  const recurring = expenses.filter(
    (e) => e.type === "temporary" && e.frequency === "monthly" && !daretExpenseIds.has(e.id),
  );

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
        {credits.length === 0 && recurring.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">Aucun crédit en cours.</CardContent>
          </Card>
        ) : (
          <>
            {credits.map((c) => (
              <CreditCard key={c.id} expense={c} payments={payments} currency={settings.currency} />
            ))}
            {recurring.map((e) => (
              <RecurringDebtCard key={e.id} expense={e} payments={payments} byId={byId} currency={settings.currency} />
            ))}
          </>
        )}

        <div className="mt-4">
          <TimelineSection expenses={expenses} />
        </div>
      </main>
    </>
  );
}
