import { getAllDarets, getAllPayments, getSettings } from "@/lib/repository";
import { getDaretState } from "@/lib/daret";
import { compareMonths, monthKey, monthLabelFr, todayMonth } from "@/lib/date";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { HeaderAdd } from "@/components/header-add";
import { AddLink } from "@/components/add-link";
import { DaretCard } from "@/components/daret-card";

export const dynamic = "force-dynamic";

function daysUntil(year: number, month: number): number {
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((Date.UTC(year, month - 1, 1) - today) / 86_400_000));
}

/** Daret: what goes in each month, the next pot to collect, then each daret. */
export default async function DaretPage() {
  const [settings, darets, payments] = await Promise.all([getSettings(), getAllDarets(), getAllPayments()]);
  const current = todayMonth();
  const money = (n: number) => formatMoney(n, settings.currency);
  const items = darets.map((daret) => ({ daret, state: getDaretState(daret, payments, current) }));

  const monthly = items.filter((i) => i.state.phase === "running").reduce((s, i) => s + i.daret.expense.amount, 0);
  const nextPot = items
    .filter((i) => i.daret.payoutMethod == null && i.state.phase !== "finished")
    .sort((a, b) => compareMonths(a.state.turn, b.state.turn))[0];

  return (
    <>
      <PageHeader title="Daret" back action={<HeaderAdd href="/daret/new" label="Ajouter une daret" />} />
      <main className="flex flex-col gap-5 px-4 py-5">
        {items.length > 0 && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-400 via-emerald-500 to-[#007261] px-5 py-4 text-white shadow-lg shadow-emerald-600/20 dark:shadow-none">
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
            <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
              {nextPot ? "Prochaine daret à recevoir" : "Tes darets"}
            </p>
            {nextPot ? (
              <>
                <p className="relative mt-1 text-3xl font-bold tabular-nums">+{money(nextPot.state.payout)}</p>
                <p className="relative text-sm text-white/85">
                  {nextPot.daret.expense.name} · <span className="capitalize">{monthLabelFr(nextPot.state.turn)}</span>
                </p>
              </>
            ) : (
              <p className="relative mt-1 text-lg font-semibold">Toutes tes darets sont reçues ✓</p>
            )}
            <div className="relative mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white/15 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-white/75">Cotisations / mois</p>
                <p className="text-sm font-bold tabular-nums">{money(monthly)}</p>
              </div>
              <div className="rounded-2xl bg-white/15 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-white/75">Darets</p>
                <p className="text-sm font-bold tabular-nums">{items.length}</p>
              </div>
            </div>
          </div>
        )}

        <AddLink href="/daret/new" label="Ajouter une daret" className="border-teal-200 text-[#007261] active:bg-teal-50 dark:border-teal-900 dark:text-teal-300 dark:active:bg-teal-950/30" />


        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-700">
            <span className="text-4xl">🤝🏻</span>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Aucune daret pour le moment</p>
            <p className="text-xs text-slate-400">Ajoute ta première daret : cotisation, membres et ton tour.</p>
          </div>
        ) : (
          items.map(({ daret, state }) => (
            <DaretCard
              key={daret.id}
              daret={daret}
              state={state}
              currency={settings.currency}
              currentMonthKey={monthKey(current)}
              daysToTurn={state.turnStatus === "upcoming" ? daysUntil(state.turn.year, state.turn.month) : null}
            />
          ))
        )}
      </main>
    </>
  );
}
