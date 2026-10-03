import Link from "next/link";
import { Plus, Target } from "lucide-react";
import { getAllDarets, getAllGoals, getAllPayments, getSettings } from "@/lib/repository";
import { getGoalProgress } from "@/lib/goals";
import { todayMonth } from "@/lib/date";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { GoalCard } from "@/components/goal-card";

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
      <PageHeader title="Objectifs" back />
      <main className="flex flex-col gap-4 px-4 py-5">
        {rows.length > 0 && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 px-5 py-4 text-white shadow-lg shadow-orange-500/20 dark:shadow-none">
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
            <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
              {rows.length > 1 ? "Tous mes objectifs" : "Mon objectif"}
            </p>
            <div className="relative mt-1 flex items-baseline justify-between gap-2">
              <span className="text-3xl font-bold tabular-nums">{formatMoney(totalNow, settings.currency)}</span>
              <span className="text-2xl font-bold tabular-nums">{overall}%</span>
            </div>
            <p className="relative text-sm text-white/85">sur {formatMoney(totalTarget, settings.currency)}</p>
            <div className="relative mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${overall}%` }} />
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-700">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
              <Target className="h-7 w-7" />
            </span>
            <p className="text-base font-semibold text-slate-900 dark:text-white">Aucun objectif</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Voiture, maison, voyage… Ajoute un objectif, relie-lui tes darets et suis ta progression.
            </p>
          </div>
        ) : (
          rows.map(({ goal, progress }) => (
            <GoalCard key={goal.id} goal={goal} progress={progress} currency={settings.currency} linkToDetail />
          ))
        )}

        <Link
          href="/goals/new"
          prefetch
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-200 py-3.5 text-sm font-semibold text-orange-600 active:bg-amber-50 dark:border-amber-900 dark:text-amber-400 dark:active:bg-amber-950/30"
        >
          <Plus className="h-4 w-4" />
          Ajouter un objectif
        </Link>
      </main>
    </>
  );
}
