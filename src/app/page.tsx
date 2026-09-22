import { getAllExpenses, getAllPayments, getSettings } from "@/lib/repository";
import { todayMonth } from "@/lib/date";
import { getPaidThisMonth } from "@/lib/engine";
import { PageHeader } from "@/components/page-header";
import { CountdownNextSalary } from "@/components/countdown-next-salary";
import { DueNowList } from "@/components/due-now-list";
import { MaskedAmount } from "@/components/masked-amount";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

function todayShortDate(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${now.getFullYear()}`;
}

export default async function HomePage() {
  const settings = await getSettings();
  const expenses = await getAllExpenses();
  const payments = await getAllPayments();
  const currentMonth = todayMonth();

  const paidThisMonth = getPaidThisMonth(expenses, payments, currentMonth);
  const available = Math.max(0, settings.salary - paidThisMonth);
  const percentUsed = settings.salary > 0 ? Math.min(100, Math.round((paidThisMonth / settings.salary) * 100)) : 0;

  return (
    <>
      <PageHeader title="GX Salaire" action={<span className="text-xs text-slate-400">{todayShortDate()}</span>} />

      <main className="flex flex-col gap-4 px-4 py-5">
        <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20">
          <CardContent className="pt-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              🟢 Disponible maintenant
            </p>
            <p className="mt-1 flex items-center justify-center text-3xl font-bold text-emerald-700 dark:text-emerald-400">
              <MaskedAmount value={formatMoney(available, settings.currency)} />
            </p>
          </CardContent>
        </Card>

        <CountdownNextSalary />

        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Salaire</p>

            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-rose-400 transition-all"
                style={{ width: `${percentUsed}%` }}
              />
            </div>
            <p className="mt-1.5 text-center text-xs text-slate-400">{percentUsed}% consommé</p>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Dépensé</p>
                <p className="font-semibold text-rose-600">{formatMoney(paidThisMonth, settings.currency)}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 dark:text-slate-400">Disponible</p>
                <p className="font-semibold text-emerald-600">{formatMoney(available, settings.currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">🔴 Dépenses</h2>
          </div>
          <DueNowList expenses={expenses} payments={payments} currentMonth={currentMonth} currency={settings.currency} />
        </section>
      </main>
    </>
  );
}
