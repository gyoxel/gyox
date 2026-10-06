import { getAllDarets, getAllPayments, getGoalById, getSettings } from "@/lib/page-data";
import { notFound } from "next/navigation";

import { getGoalProgress, isDepositPaid, type GoalSimBase } from "@/lib/goals";
import { monthKey, monthLabelFr, monthsBetween, todayMonth } from "@/lib/date";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { GoalCard } from "@/components/goal-card";
import { GoalSimulator } from "@/components/goal-simulator";
import { DeleteButton } from "@/components/delete-button";
import { goalDelete } from "@/lib/delete-specs";

export const dynamic = "force-dynamic";

/** One goal in detail: progress, deposits, its darets, and simulations. */
export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [settings, goal, darets, payments] = await Promise.all([
    getSettings(),
    getGoalById(id),
    getAllDarets(),
    getAllPayments(),
  ]);
  if (!goal) notFound();
  const current = todayMonth();
  const progress = getGoalProgress(goal, darets, payments, current);
  const daretSteps = progress.steps.filter((s) => s.kind === "daret");
  const base: GoalSimBase = {
    target: progress.target,
    reachedNow: progress.reachedNow,
    upcoming: daretSteps.filter((s) => !s.received && s.month).map((s) => ({ month: monthKey(s.month!), amount: s.amount })),
    currentMonth: monthKey(current),
  };

  return (
    <>
      <PageHeader title={goal.name} back action={<DeleteButton variant="icon" {...goalDelete(goal)} />} />
      <main className="flex flex-col gap-5 px-4 py-5">
        <GoalCard
          goal={goal}
          progress={progress}
          currency={settings.currency}
          depositsPaid={Object.fromEntries(goal.deposits.map((d) => [d.id, isDepositPaid(d, payments)]))}
        />

        <section className="flex flex-col gap-2.5">
          <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Darets</h2>
          {daretSteps.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400 dark:border-slate-700">
              Aucune daret liée — ajoute-en avec « Modifier ».
            </p>
          ) : (
            <ul className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {daretSteps.map((s, i) => {
                const inMonths = s.month ? monthsBetween(current, s.month) : 0;
                return (
                  <li key={i} className="flex items-center gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0 dark:border-slate-800">
                    <span className="text-lg leading-none">🤝🏻</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{s.label}</span>
                      <span className="block text-[11px] text-slate-400">
                        {s.month && monthLabelFr(s.month)} ·{" "}
                        {s.received ? "reçue" : inMonths === 0 ? "ce mois-ci" : `dans ${inMonths} mois`}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                        +{formatMoney(s.amount, settings.currency)}
                      </span>
                      <span className="block text-[11px] font-semibold text-orange-600 dark:text-amber-400">→ {s.percent}%</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2.5">
          <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Simulations</h2>
          <GoalSimulator key={`${base.reachedNow}-${base.upcoming.length}`} base={base} currency={settings.currency} defaultMonthly={goal.monthlySaving} deadline={goal.deadline} />
        </section>

        <div className="mt-2">
          <DeleteButton variant="full" {...goalDelete(goal)} />
        </div>
      </main>
    </>
  );
}
