import Link from "next/link";
import { ChevronRight, Handshake } from "lucide-react";
import { getSettings } from "@/lib/repository";
import { getAllLoans } from "@/lib/loans-repo";
import { loanState } from "@/lib/loans";
import { monthLabelFr, todayMonth } from "@/lib/date";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { HeaderAdd } from "@/components/header-add";
import { AddLink } from "@/components/add-link";
import { ReceiveRepayment } from "@/components/loan-repayments";

export const dynamic = "force-dynamic";

/** Prêts: the money lent, what's still to come back, each loan. */
export default async function LoansPage() {
  const [settings, loans] = await Promise.all([getSettings(), getAllLoans()]);
  const money = (n: number) => formatMoney(n, settings.currency);
  const current = todayMonth();
  const rows = loans
    .map((loan) => ({ loan, state: loanState(loan, current) }))
    .sort((a, b) => Number(a.state.done) - Number(b.state.done));
  const remaining = rows.reduce((s, r) => s + r.state.remaining, 0);
  const due = rows.reduce((s, r) => s + r.state.due.length, 0);

  return (
    <>
      <PageHeader title="Prêts" back action={<HeaderAdd href="/prets/new" label="Ajouter un prêt" />} />
      <main className="flex flex-col gap-5 px-4 py-5">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-700 px-5 py-4 text-white shadow-lg shadow-orange-600/20 dark:shadow-none">
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
          <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">À récupérer</p>
          <p className="relative mt-1 text-3xl font-bold tabular-nums">{money(remaining)}</p>
          <div className="relative mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/15 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/75">Prêts en cours</p>
              <p className="text-sm font-bold tabular-nums">{rows.filter((r) => !r.state.done).length}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/75">À recevoir maintenant</p>
              <p className="text-sm font-bold tabular-nums">{due}</p>
            </div>
          </div>
        </div>

        <AddLink
          href="/prets/new"
          label="Ajouter un prêt"
          className="border-amber-200 text-amber-700 active:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:active:bg-amber-950/30"
        />

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-700">
            <Handshake className="h-9 w-9 text-amber-500" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Aucun prêt pour le moment</p>
            <p className="text-xs text-slate-400">
              L&apos;argent que tu prêtes sort de ton solde ; chaque remboursement reçu y revient.
            </p>
          </div>
        ) : (
          rows.map(({ loan, state }) => {
            const percent = state.toRepay > 0 ? Math.round((state.received / state.toRepay) * 100) : 0;
            const nextDue = state.due[0];
            return (
              <div
                key={loan.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <Link href={`/prets/${loan.id}`} className="flex flex-col gap-2.5 px-4 pb-3 pt-4 active:bg-slate-50 dark:active:bg-slate-800/60">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-xl shadow-sm">
                      🤝
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold text-slate-900 dark:text-white">{loan.name}</span>
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                        {money(loan.amount)} prêtés · {loan.months} × {money(loan.monthly)}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">
                        {state.done ? "Rendu ✓" : money(state.remaining)}
                      </span>
                      {!state.done && <span className="block text-[10px] text-slate-400">reste</span>}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="flex justify-between text-[11px] text-slate-400">
                    <span>
                      {money(state.received)} reçus · {percent}%
                    </span>
                    {state.next && !nextDue && <span className="capitalize">Prochain : {monthLabelFr(state.next.month)}</span>}
                  </p>
                </Link>
                {nextDue && (
                  <div className="mx-4 mb-4 flex items-center justify-between gap-2 rounded-2xl bg-amber-50 py-1.5 pl-3 pr-1.5 dark:bg-amber-950/40">
                    <span className="min-w-0 text-xs font-medium text-amber-800 dark:text-amber-200">
                      <span className="capitalize">{monthLabelFr(nextDue.month)}</span> · {money(nextDue.amount)} reçu ?
                    </span>
                    <ReceiveRepayment loanId={loan.id} slot={nextDue.slot} amount={nextDue.amount} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </>
  );
}
