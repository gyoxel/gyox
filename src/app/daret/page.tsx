import Link from "next/link";
import { Plus } from "lucide-react";
import { getAllDarets, getAllPayments, getSettings } from "@/lib/repository";
import { getDaretState } from "@/lib/daret";
import { getExpenseDisplayColor } from "@/lib/engine";
import { monthKey, todayMonth } from "@/lib/date";
import { PageHeader } from "@/components/page-header";
import { DaretCard } from "@/components/daret-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function daysUntil(year: number, month: number): number {
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((Date.UTC(year, month - 1, 1) - today) / 86_400_000));
}

export default async function DaretPage() {
  const [settings, darets, payments] = await Promise.all([getSettings(), getAllDarets(), getAllPayments()]);
  const current = todayMonth();

  return (
    <>
      <PageHeader
        title="Daret"
        action={
          <Button asChild size="sm">
            <Link href="/daret/new">
              <Plus className="h-4 w-4" />
              Daret
            </Link>
          </Button>
        }
      />
      <main className="flex flex-col gap-3 px-4 py-5">
        {darets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center text-sm text-slate-500">
              <span className="text-3xl">🤝</span>
              Aucune daret pour le moment.
              <Button asChild size="sm" variant="outline">
                <Link href="/daret/new">
                  <Plus className="h-4 w-4" />
                  Ajouter une daret
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          darets.map((daret) => {
            const state = getDaretState(daret, payments, current);
            return (
              <DaretCard
                key={daret.id}
                daret={daret}
                state={state}
                currency={settings.currency}
                currentMonthKey={monthKey(current)}
                daysToTurn={state.turnStatus === "upcoming" ? daysUntil(state.turn.year, state.turn.month) : null}
                color={getExpenseDisplayColor(daret.expense, new Map([[daret.expense.id, daret.expense]]))}
              />
            );
          })
        )}
      </main>
    </>
  );
}
