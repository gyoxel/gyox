import { getAllLoans, getSettings } from "@/lib/page-data";
import Link from "next/link";
import { CaretRight, HandCoins } from "@phosphor-icons/react/ssr";

import { loanState } from "@/lib/loans";
import { todayMonth } from "@/lib/date";
import { byPerson } from "@/lib/person-groups";
import { monthLabel, whenLabel } from "@/lib/i18n/dates";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { HeaderAdd } from "@/components/header-add";
import { AddLink } from "@/components/add-link";
import { ReceiveRepayment } from "@/components/loan-repayments";
import { DateDivider, dividersOf, lastDoneFirst } from "@/components/date-divider";

export const dynamic = "force-dynamic";

/** Prêts: the money lent, what's still to come back, each loan. */
export default async function LoansPage() {
  const [settings, loans, { lang, t }] = await Promise.all([getSettings(), getAllLoans(), getI18n()]);
  const monthLabelFr = (m: Parameters<typeof monthLabel>[0]) => monthLabel(m, lang);
  const money = (n: number) => formatMoney(n, settings.currency);
  const current = todayMonth();
  // Given back last; in each, the last moved (lent, a repayment) on top,
  // its day above it (once for the same day).
  const lastAt = (loan: (typeof loans)[number]) => loan.repayments.map((r) => r.date).reduce((a, b) => (b > a ? b : a), loan.date);
  const rows = loans
    .map((loan) => ({ loan, state: loanState(loan, current), at: lastAt(loan) }))
    .sort(lastDoneFirst((r) => r.at))
    .sort((a, b) => Number(a.state.done || a.state.givenUp) - Number(b.state.done || b.state.givenUp));
  // Several loans to the same person: together (what's left of all, each
  // under it), where the first of them comes.
  const groups = byPerson(rows, (r) => r.loan.name);
  const dividers = dividersOf(
    groups.map((g) => whenLabel(g.map((r) => r.at).reduce((a, b) => (b > a ? b : a)), lang, t)),
    "",
  );
  // Given up: not to get back anymore.
  const remaining = rows.reduce((s, r) => s + (r.state.givenUp ? 0 : r.state.remaining), 0);
  const due = rows.reduce((s, r) => s + r.state.due.length, 0);

  // One loan's card (in a person's group: what it was for, or its day, as its title).
  const card = ({ loan, state }: (typeof rows)[number], title?: string) => {
    const percent = state.toRepay > 0 ? Math.round((state.received / state.toRepay) * 100) : 0;
    const nextDue = state.due[0];
    return (
      <div key={loan.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Link href={`/prets/${loan.id}`} className="flex flex-col gap-2.5 px-4 pb-3 pt-4 active:bg-slate-50 dark:active:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl gx-tile text-xl">
              💸
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-semibold text-slate-900 dark:text-white">{title ?? loan.name}</span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                {t("{amount} prêtés", { amount: money(loan.amount) })} · {loan.months} × {money(loan.monthly)}
              </span>
            </span>
            <span className="text-right">
              <span className="block text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">
                {state.done ? t("Rendu ✓") : state.givenUp ? <s className="text-slate-400">{money(state.remaining)}</s> : money(state.remaining)}
              </span>
              {!state.done && <span className="block text-[10px] text-slate-400">{state.givenUp ? t("abandonné") : t("reste")}</span>}
            </span>
            <CaretRight weight="bold" className="h-4 w-4 shrink-0 text-slate-300" />
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${percent}%` }} />
          </div>
          <p className="flex justify-between text-[11px] text-slate-400">
            <span>
              {t("{amount} reçus", { amount: money(state.received) })} · {percent}%
            </span>
            {state.next && !nextDue && <span>{t("Prochain : {month}", { month: monthLabelFr(state.next.month) })}</span>}
          </p>
        </Link>
        {nextDue && (
          <div className="mx-4 mb-4 flex items-center justify-between gap-2 rounded-2xl bg-amber-50 py-1.5 pl-3 pr-1.5 dark:bg-amber-950/40">
            <span className="min-w-0 text-xs font-medium text-amber-800 dark:text-amber-200">
              <span className="capitalize">{monthLabelFr(nextDue.month)}</span> ·{" "}
              {nextDue.received > 0 ? t("reste {amount}", { amount: money(nextDue.left) }) : t("{amount} reçu ?", { amount: money(nextDue.left) })}
            </span>
            <ReceiveRepayment
              variant="compact"
              loanId={loan.id}
              slot={nextDue.slot}
              name={loan.name}
              monthLabel={monthLabelFr(nextDue.month)}
              expected={nextDue.amount}
              received={nextDue.received}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <PageHeader title={t("Argent prêté")} back info="prets" action={<HeaderAdd href="/prets/new" label={t("Prêter de l'argent")} />} />
      <main className="flex flex-col gap-5 px-4 py-5">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-700 px-5 py-4 text-white shadow-lg shadow-orange-600/20 dark:shadow-none">
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
          <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">{t("À récupérer")}</p>
          <p className="relative mt-1 text-3xl font-bold tabular-nums">{money(remaining)}</p>
          <div className="relative mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/15 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/75">{t("En cours")}</p>
              <p className="text-sm font-bold tabular-nums">{rows.filter((r) => !r.state.done && !r.state.givenUp).length}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/75">{t("À recevoir maintenant")}</p>
              <p className="text-sm font-bold tabular-nums">{due}</p>
            </div>
          </div>
        </div>

        <AddLink href="/prets/new" label={t("Prêter de l'argent")} />

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-700">
            <HandCoins weight="duotone" className="h-9 w-9 text-amber-500" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("Rien de prêté pour le moment")}</p>
            <p className="text-xs text-slate-400">
              {t("L'argent que tu prêtes sort de ton solde ; chaque remboursement reçu y revient.")}
            </p>
          </div>
        ) : (
          groups.map((members, i) => (
            <div key={members[0].loan.id} className="flex flex-col gap-1.5">
              {dividers[i] && <DateDivider as="div" label={dividers[i]} className="px-2 pt-0" />}
              {members.length === 1 ? (
                card(members[0])
              ) : (
                <section className="flex flex-col gap-2 rounded-3xl border border-amber-200 bg-amber-50/50 p-2 dark:border-amber-900/60 dark:bg-amber-950/20">
                  <div className="flex items-center justify-between gap-2 px-2 pt-1">
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-bold text-slate-900 dark:text-white">{members[0].loan.name}</span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        {t("{n} prêts", { n: members.length })} · {t("{amount} prêtés", { amount: money(members.reduce((s, m) => s + m.loan.amount, 0)) })}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-base font-bold tabular-nums text-amber-700 dark:text-amber-400">
                        {money(members.reduce((s, m) => s + (m.state.givenUp ? 0 : m.state.remaining), 0))}
                      </span>
                      <span className="block text-[10px] uppercase tracking-wide text-slate-400">{t("reste en tout")}</span>
                    </span>
                  </div>
                  {members.map((m) => card(m, m.loan.note?.trim() || t("Prêt du {date}", { date: whenLabel(m.loan.date, lang, t) })))}
                </section>
              )}
            </div>
          ))
        )}
      </main>
    </>
  );
}
