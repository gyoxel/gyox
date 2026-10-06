import { getLoan, getSettings } from "@/lib/page-data";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, Clock, Pencil } from "lucide-react";

import { loanState } from "@/lib/loans";
import { loanDelete } from "@/lib/delete-specs";
import { compareMonths, monthLabelFr, todayMonth } from "@/lib/date";
import { METHOD_META } from "@/lib/payment-method";
import { cn, formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { DeleteButton } from "@/components/delete-button";
import { CancelRepayment, ReceiveRepayment } from "@/components/loan-repayments";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const DAY = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" });

/** One loan: what came back, every installment (received, due, to come). */
export default async function LoanPage({ params }: { params: Promise<{ id: string }> }) {
  const [settings, loan] = await Promise.all([getSettings(), getLoan((await params).id)]);
  if (!loan) notFound();
  const money = (n: number) => formatMoney(n, settings.currency);
  const current = todayMonth();
  const state = loanState(loan, current);
  const percent = state.toRepay > 0 ? Math.round((state.received / state.toRepay) * 100) : 0;

  return (
    <>
      <PageHeader title={loan.name} back action={<DeleteButton variant="icon" {...loanDelete(loan)} />} />
      <main className="flex flex-col gap-5 px-4 py-5">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-700 px-5 pb-4 pt-5 text-white shadow-lg shadow-orange-600/20 dark:shadow-none">
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
          <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
            {state.done ? "Prêt rendu ✓" : "Reste à te rendre"}
          </p>
          <p className="relative mt-1 text-4xl font-bold tabular-nums">{money(state.remaining)}</p>
          <p className="relative text-sm text-white/85">
            sur {money(state.toRepay)}
            {loan.priorRepaid ? ` (${money(loan.priorRepaid)} déjà rendus avant)` : ""}
          </p>
          <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${percent}%` }} />
          </div>
          <div className="relative mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/15 px-2 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/75">Prêté</p>
              <p className="text-sm font-bold tabular-nums">{money(loan.amount)}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-2 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/75">Reçu</p>
              <p className="text-sm font-bold tabular-nums">{money(state.received)}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-2 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/75">Sorti de</p>
              <p className="text-sm font-bold">{loan.method ? `${METHOD_META[loan.method].emoji} ${METHOD_META[loan.method].label}` : "—"}</p>
            </div>
          </div>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Remboursements</h2>
          <ul className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {state.slots.map((s) => {
              const isDue = !s.repayment && compareMonths(s.month, current) <= 0;
              return (
                <li key={s.slot} className="flex items-center gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0 dark:border-slate-800">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                      s.repayment
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
                        : isDue
                          ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50"
                          : "bg-slate-100 text-slate-400 dark:bg-slate-800",
                    )}
                  >
                    {s.repayment ? <Check className="h-4 w-4" /> : isDue ? <Clock className="h-4 w-4" /> : s.slot}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium capitalize text-slate-800 dark:text-slate-100">{monthLabelFr(s.month)}</span>
                    <span className="block text-[11px] text-slate-400">
                      {s.repayment ? (
                        <>
                          Reçu le {DAY.format(new Date(`${s.repayment.date}T12:00:00`))} · {METHOD_META[s.repayment.method].emoji}{" "}
                          {METHOD_META[s.repayment.method].label} · <CancelRepayment loanId={loan.id} slot={s.slot} />
                        </>
                      ) : isDue ? (
                        "Tu l'as reçu ?"
                      ) : (
                        "À venir"
                      )}
                    </span>
                  </span>
                  {isDue ? (
                    <span className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{money(s.amount)}</span>
                      <ReceiveRepayment loanId={loan.id} slot={s.slot} amount={s.amount} />
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        s.repayment ? "text-emerald-600" : "text-slate-500 dark:text-slate-400",
                      )}
                    >
                      {s.repayment ? `+${money(s.repayment.amount)}` : money(s.amount)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {loan.note && <p className="px-1 text-xs text-slate-500 dark:text-slate-400">📝 {loan.note}</p>}
        </section>

        <Button asChild className="bg-amber-600 text-white hover:bg-amber-700">
          <Link href={`/prets/${loan.id}/edit`}>
            <Pencil className="h-4 w-4" />
            Modifier le prêt
          </Link>
        </Button>

        <DeleteButton variant="full" {...loanDelete(loan)} />
      </main>
    </>
  );
}
