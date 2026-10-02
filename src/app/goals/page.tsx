import Link from "next/link";
import { Plus, Target } from "lucide-react";
import { getAllDarets, getAllGoals, getAllPayments, getSettings } from "@/lib/repository";
import { getGoalProgress } from "@/lib/goals";
import { todayMonth } from "@/lib/date";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { GoalCard } from "@/components/goal-card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const [settings, goals, darets, payments] = await Promise.all([
    getSettings(),
    getAllGoals(),
    getAllDarets(),
    getAllPayments(),
  ]);
  const current = todayMonth();
  const rows = goals.map((goal) => ({ goal, progress: getGoalProgress(goal, darets, payments, current) }));
  const totalTarget = rows.reduce((s, r) => s + r.progress.target, 0);
  const totalNow = rows.reduce((s, r) => s + Math.min(r.progress.reachedNow, r.progress.target), 0);
  const overall = totalTarget > 0 ? Math.round((totalNow / totalTarget) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Objectifs"
        back
        action={
          <Button asChild size="sm">
            <Link href="/goals/new">
              <Plus className="h-4 w-4" />
              Objectif
            </Link>
          </Button>
        }
      />
      <main className="flex flex-col gap-4 px-4 py-5">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-700">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00c3ab] to-[#007261] text-white">
              <Target className="h-7 w-7" />
            </span>
            <p className="text-base font-semibold text-slate-900 dark:text-white">Aucun objectif</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Voiture, maison, voyage… Ajoute un objectif, relie-lui tes darets et suis ta progression.
            </p>
            <Button asChild className="mt-1">
              <Link href="/goals/new">
                <Plus className="h-4 w-4" />
                Ajouter un objectif
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {rows.length > 1 && (
              <div className="rounded-2xl bg-gradient-to-r from-[#00c3ab] to-[#007261] px-4 py-3.5 text-white shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-white/80">Tous mes objectifs</p>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xl font-bold tabular-nums">
                    {formatMoney(totalNow, settings.currency)}
                    <span className="text-sm font-medium text-white/80"> / {formatMoney(totalTarget, settings.currency)}</span>
                  </span>
                  <span className="text-lg font-bold tabular-nums">{overall}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/25">
                  <div className="h-full rounded-full bg-white" style={{ width: `${overall}%` }} />
                </div>
              </div>
            )}
            {rows.map(({ goal, progress }) => (
              <GoalCard key={goal.id} goal={goal} progress={progress} currency={settings.currency} linkToDetail />
            ))}
          </>
        )}
      </main>
    </>
  );
}
