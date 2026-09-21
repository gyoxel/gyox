import { getAllExpenses } from "@/lib/repository";
import { defaultViewMonth, monthLabelFr, monthsBetween } from "@/lib/date";
import { getEffectiveEndMonth } from "@/lib/engine";

export const dynamic = "force-dynamic";
import { CATEGORY_META } from "@/lib/category";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function TimelinePage() {
  const expenses = (await getAllExpenses()).filter((e) => e.active);
  const byId = new Map(expenses.map((e) => [e.id, e]));
  const baseMonth = defaultViewMonth();

  const rows = expenses.map((expense) => {
    const end = getEffectiveEndMonth(expense, byId);
    const duration = end ? Math.max(1, monthsBetween(baseMonth, end) + 1) : null;
    return { expense, end, duration };
  });

  const maxDuration = Math.max(12, ...rows.filter((r) => r.duration != null).map((r) => r.duration as number));

  return (
    <>
      <PageHeader title="Timeline" />
      <main className="flex flex-col gap-3 px-4 py-5">
        <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
          Aperçu visuel de la durée restante de chaque dépense, à partir de {monthLabelFr(baseMonth)}.
        </p>
        <Card>
          <CardContent className="flex flex-col gap-4 pt-4">
            {rows.map(({ expense, end, duration }) => {
              const meta = CATEGORY_META[expense.color];
              const isPermanent = duration == null;
              const widthPercent = isPermanent ? 100 : Math.max(10, Math.round((duration! / maxDuration) * 100));
              return (
                <div key={expense.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                      <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
                      {expense.name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {isPermanent ? "Permanent" : `→ ${monthLabelFr(end!)}`}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={cn("h-full rounded-full", meta.barColor)}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
