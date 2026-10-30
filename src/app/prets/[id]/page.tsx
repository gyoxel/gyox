import { getLoan, getSettings } from "@/lib/page-data";
import NotFound from "@/app/not-found";
import { Fragment } from "react";
import Link from "next/link";
import { Check, Clock, PencilSimple } from "@phosphor-icons/react/ssr";

import { loanState, type LoanSlot } from "@/lib/loans";
import { loanDelete } from "@/lib/delete-specs";
import { compareMonths, todayMonth } from "@/lib/date";
import type { T } from "@/lib/i18n";
import { monthLabel, whenLabel } from "@/lib/i18n/dates";
import { getI18n } from "@/lib/i18n/server";
import { cn, formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { DeleteButton } from "@/components/delete-button";
import { ReceiveRepayment, RepaymentRow } from "@/components/loan-repayments";
import { LoanGiveUp } from "@/components/loan-give-up";
import { Button } from "@/components/ui/button";
import { MethodLabel } from "@/components/method-icon";
import { DateDivider, dividersOf } from "@/components/date-divider";

export const dynamic = "force-dynamic";


/** One loan: what came back, every installment (received, due, to come). */
export default async function LoanPage({ params }: { params: Promise<{ id: string }> }) {
  const [settings, loan, { lang, t }] = await Promise.all([getSettings(), getLoan((await params).id), getI18n()]);
  const monthLabelFr = (m: Parameters<typeof monthLabel>[0]) => monthLabel(m, lang);
  if (!loan) return <NotFound />;
  const money = (n: number) => formatMoney(n, settings.currency);
  const current = todayMonth();
  const state = loanState(loan, current);
  const percent = state.toRepay > 0 ? Math.round((state.received / state.toRepay) * 100) : 0;

  return (
    <>
      <PageHeader title={loan.name} back info="pret" action={<DeleteButton variant="icon" {...loanDelete(loan, t)} />} />
      <main className="flex flex-col gap-5 px-4 py-5">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-700 px-5 pb-4 pt-5 text-white shadow-lg shadow-orange-600/20 dark:shadow-none">
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
          <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
            {state.done ? t("Tout est rendu ✓") : state.givenUp ? t("Abandonné · ne reviendra pas") : t("Reste à te rendre")}
          </p>
          <p className={cn("relative mt-1 text-4xl font-bold tabular-nums", state.givenUp && "line-through decoration-white/60")}>{money(state.remaining)}</p>
          <p className="relative text-sm text-white/85">
            {t("sur {amount}", { amount: money(state.toRepay) })}
            {loan.priorRepaid ? ` ${t("({amount} déjà rendus avant)", { amount: money(loan.priorRepaid) })}` : ""}
          </p>
          {state.givenUp && loan.writtenOffAt && (
            <p className="relative text-xs text-white/80">{t("Abandonné : {day}", { day: whenLabel(loan.writtenOffAt, lang, t) })}</p>
          )}
          <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${percent}%` }} />
          </div>
          <div className="relative mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/15 px-2 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/75">{t("Prêté")}</p>
              <p className="text-sm font-bold tabular-nums">{money(loan.amount)}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-2 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/75">{t("Reçu")}</p>
              <p className="text-sm font-bold tabular-nums">{money(state.received)}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-2 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/75">{t("Sorti de")}</p>
              <p className="text-sm font-bold">{loan.method ? <MethodLabel method={loan.method} /> : "—"}</p>
            </div>
          </div>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("Remboursements")}</h2>
          <ul className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {state.slots.map((s) => {
              const isDue = s.open && compareMonths(s.month, current) <= 0;
              const full = !s.open && s.received > 0 && s.received >= s.amount - 0.005;
              // Each repayment under the day it came, over the line above it (once for the same day).
              const days = dividersOf(
                s.repayments.map((r) => whenLabel(r.date, lang, t)),
                "",
              );
              return (
                <li key={s.slot} className="flex items-start gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0 dark:border-slate-800">
                  <span
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      full
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
                        : isDue
                          ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50"
                          : !s.open
                            ? "bg-slate-100 text-slate-500 dark:bg-slate-800"
                            : "bg-slate-100 text-slate-400 dark:bg-slate-800",
                    )}
                  >
                    {full ? <Check weight="bold" className="h-4 w-4" /> : isDue ? <Clock weight="bold" className="h-4 w-4" /> : s.slot}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium capitalize text-slate-800 dark:text-slate-100">{monthLabelFr(s.month)}</span>
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          s.open ? "text-slate-900 dark:text-white" : s.received > 0 ? "text-emerald-600" : "text-slate-400",
                        )}
                      >
                        {s.open ? (s.received > 0 ? t("reste {amount}", { amount: money(s.left) }) : money(s.amount)) : `+${money(s.received)}`}
                      </span>
                    </span>
                    {s.received > 0 && (
                      <span className="mt-1.5 block">
                        <span className="flex h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <span
                            className={cn("h-full rounded-full", s.received >= s.amount - 0.005 ? "bg-emerald-500" : "bg-amber-500")}
                            style={{ width: `${Math.min(100, (s.received / Math.max(s.amount, 0.01)) * 100)}%` }}
                          />
                        </span>
                        <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                          {t("{received} reçus sur {amount}", { received: money(s.received), amount: money(s.amount) })}
                        </span>
                      </span>
                    )}
                    {s.repayments.length > 0 && (
                      <span className="-mx-2 mt-1 block">
                        {s.repayments.map((r, i) => (
                          <Fragment key={r.id}>
                            {days[i] && <DateDivider as="span" label={days[i]} className="px-2 pt-1.5" />}
                            <RepaymentRow
                              repayment={r}
                              loanId={loan.id}
                              slot={s.slot}
                              name={loan.name}
                              monthLabel={monthLabelFr(s.month)}
                              expected={s.amount}
                              received={s.received}
                            />
                          </Fragment>
                        ))}
                      </span>
                    )}
                    {!state.givenUp && slotNote(s, money, t) && (
                      <span className="mt-0.5 block text-[11px] font-medium text-amber-700 dark:text-amber-400">{slotNote(s, money, t)}</span>
                    )}
                    {isDue ? (
                      <span className="mt-2 block">
                        <ReceiveRepayment
                          loanId={loan.id}
                          slot={s.slot}
                          name={loan.name}
                          monthLabel={monthLabelFr(s.month)}
                          expected={s.amount}
                          received={s.received}
                        />
                      </span>
                    ) : (
                      s.open && s.received === 0 && <span className="block text-[11px] text-slate-400">{t("À venir")}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          {state.givenUp && state.slots.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400 dark:border-slate-700">
              {t("Rien n'est revenu.")}
            </p>
          )}
          {loan.note && <p className="px-1 text-xs text-slate-500 dark:text-slate-400">📝 {loan.note}</p>}
          {!state.done && <LoanGiveUp loanId={loan.id} name={loan.name} remaining={state.remaining} givenUp={state.givenUp} />}
        </section>

        <Button asChild className="gx-cta">
          <Link href={`/prets/${loan.id}/edit`}>
            <PencilSimple weight="bold" className="h-4 w-4" />
            {t("Modifier")}
          </Link>
        </Button>

        <DeleteButton variant="full" {...loanDelete(loan, t)} />
      </main>
    </>
  );
}

/** Where a month stands, and what moved between months. */
function slotNote(s: LoanSlot, money: (n: number) => string, t: T): string | null {
  if (s.open && s.received > 0) return t("Reste {amount} à recevoir ce mois-ci", { amount: money(s.left) });
  if (!s.open) {
    const diff = Math.round((s.amount - s.received) * 100) / 100;
    if (diff > 0.005) {
      return s.received > 0
        ? t("Reçu {received} sur {amount} · {diff} passés au mois suivant", { received: money(s.received), amount: money(s.amount), diff: money(diff) })
        : t("Pas reçu · {diff} passés au mois suivant", { diff: money(diff) });
    }
    if (diff < -0.005) return t("{amount} en avance sur les mois suivants", { amount: money(-diff) });
    return null;
  }
  if (s.planned === 0) return t("Ce qui reste des mois précédents");
  const diff = Math.round((s.amount - s.planned) * 100) / 100;
  if (diff > 0) return t("Dont {amount} du mois précédent", { amount: money(diff) });
  if (diff < 0) return t("{amount} déjà rendus en avance", { amount: money(-diff) });
  return null;
}
