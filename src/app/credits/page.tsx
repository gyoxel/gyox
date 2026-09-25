import Link from "next/link";
import { Plus } from "lucide-react";
import { getAllExpenses, getAllPayments, getSettings } from "@/lib/repository";
import { PageHeader } from "@/components/page-header";
import { CreditCard } from "@/components/credit-card";
import { TimelineSection } from "@/components/timeline-section";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CreditsPage() {
  const [settings, payments, expenses] = await Promise.all([getSettings(), getAllPayments(), getAllExpenses()]);
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
        {credits.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">Aucun crédit en cours.</CardContent>
          </Card>
        ) : (
          credits.map((c) => <CreditCard key={c.id} expense={c} payments={payments} currency={settings.currency} />)
        )}

        <div className="mt-4">
          <TimelineSection expenses={expenses} payments={payments} />
        </div>
      </main>
    </>
  );
}
