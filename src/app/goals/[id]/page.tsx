import { getAllDarets, getAllExpenses, getAllPayments, getGoalById, getSettings } from "@/lib/page-data";
import { monthlyPlan } from "@/lib/monthly-plan";
import { notFound } from "next/navigation";
import { getWallet } from "@/lib/wallet-data";

import { getGoalProgress, isDepositPaid, type GoalSimBase } from "@/lib/goals";
import { monthKey, monthsBetween, todayMonth } from "@/lib/date";
import { monthLabel } from "@/lib/i18n/dates";
import { getI18n } from "@/lib/i18n/server";
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
  const [settings, goal, darets, payments, wallet, expenses, { lang, t }] = await Promise.all([
    getSettings(),
    getGoalById(id),
    getAllDarets(),
    getAllPayments(),
    getWallet(),
    getAllExpenses(),
    getI18n(),
  ]);
  if (!goal) notFound();
  const current = todayMonth();
  const expenseById = new Map(expenses.map((e) => [e.id, e]));
  const plans = Object.fromEntries(
    goal.deposits.flatMap((d) => {
      const e = d.monthly && d.expenseId ? expenseById.get(d.expenseId) : undefined;
      return e ? [[d.id, monthlyPlan(e, payments, current)] as const] : [];
    }),
  );
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
      <PageHeader title={goal.name} back info="goal" action={<DeleteButton variant="icon" {...goalDelete(goal, t)} />} />
      <main className="flex flex-col gap-5 px-4 py-5">
        <GoalCard
          goal={goal}
          progress={progress}
          currency={settings.currency}
          depositsPaid={Object.fromEntries(goal.deposits.map((d) => [d.id, isDepositPaid(d, payments)]))}
          depositPlans={plans}
          savings={wallet.savings}
        />

        <section className="flex flex-col gap-2.5">
          <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("Darets")}</h2>
          {daretSteps.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400 dark:border-slate-700">
              {t("Aucune daret liée — ajoute-en avec « Modifier ».")}
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
                        {s.month && monthLabel(s.month, lang)} ·{" "}
                        {s.received ? t("reçue") : inMonths === 0 ? t("ce mois-ci") : t("dans {n} mois", { n: inMonths })}
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
          <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("Simulations")}</h2>
          <GoalSimulator key={`${base.reachedNow}-${base.upcoming.length}`} base={base} currency={settings.currency} defaultMonthly={goal.monthlySaving} deadline={goal.deadline} />
        </section>

        <div className="mt-2">
          <DeleteButton variant="full" {...goalDelete(goal, t)} />
        </div>
      </main>
    </>
  );
}
