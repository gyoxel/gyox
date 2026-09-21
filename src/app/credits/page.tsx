import Link from "next/link";
import { Plus } from "lucide-react";
import { getAllExpenses, getSettings } from "@/lib/repository";

export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/page-header";
import { CreditCard } from "@/components/credit-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function CreditsPage() {
  const settings = await getSettings();
  const credits = (await getAllExpenses()).filter((e) => e.type === "credit");

  return (
    <>
      <PageHeader
        title="Crédits"
        action={
          <Button asChild size="sm">
            <Link href="/expenses/new">
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
          credits.map((c) => <CreditCard key={c.id} expense={c} currency={settings.currency} />)
        )}
      </main>
    </>
  );
}
