import type { DaretWithExpense, Expense, Payment } from "@/lib/types";
import { addMonths, compareMonths, monthKey, monthLabelFr, monthsBetween, parseMonthKey, todayMonth, type MonthId } from "@/lib/date";
import { getDaretState } from "@/lib/daret";
import { findPayment, getCreditDisplayProgress, getCreditRealState, projectCreditSchedule } from "@/lib/engine";
import { cn, formatMoney } from "@/lib/utils";
import { displayIcon } from "@/lib/category";
import { CreditStairs, type StairMonth } from "@/components/credit-stairs";

const SHORT = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
/** Months drawn one by one at most (a longer credit's end is still among
 *  the milestones). */
const MAX_MONTHS = 48;

/** A credit from this month on. */
interface Plan {
  expense: Expense;
  icon: string;
  /** What it costs each month ("YYYY-MM"): this month, what was paid plus
   *  what's still due; after, its projected installments. */
  months: Map<string, number>;
  /** This month's installment is paid. */
  paidNow: boolean;
  /** Starts in a month to come. */
  startsLater: boolean;
  first: string | null;
  last: string | null;
  remaining: number;
  total: number;
  paid: number;
}

interface Milestone {
  key: string;
  order: number;
  icon: string;
  title: string;
  detail?: string;
  amount?: string;
  /** Money coming in (a daret's pot). */
  income?: boolean;
  /** A credit's last installment: what's left to pay after it follows. */
  creditEnd?: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Timeline of the credits (and darets): when everything is paid off, what
 * the credits cost each month until then — a staircase going down, one step
 * per credit ending, each month tappable — and the milestones on the way (a
 * credit's last installment and what's left to pay after it, a credit
 * starting, a daret's turn and end), down to the 🏁.
 */
export function TimelineSection({
  expenses,
  darets,
  payments,
  currency,
  categoryEmoji,
}: {
  expenses: Expense[];
  darets: DaretWithExpense[];
  payments: Payment[];
  currency: string;
  categoryEmoji: ReadonlyMap<string, string>;
}) {
  const current = todayMonth();
  const currentKey = monthKey(current);
  const money = (n: number) => formatMoney(n, currency);

  const plans: Plan[] = expenses
    .filter((e) => e.active && e.type === "credit")
    .map((expense) => {
      const state = getCreditRealState(expense, payments, current);
      const months = new Map<string, number>();
      const payment = findPayment(payments, expense.id, currentKey);
      if (payment && payment.amountPaid > 0) months.set(currentKey, payment.amountPaid);
      for (const { month, payment: amount } of projectCreditSchedule(expense, payments, current)) {
        const key = monthKey(month);
        months.set(key, round2((months.get(key) ?? 0) + amount));
      }
      const keys = [...months.keys()].sort();
      return {
        expense,
        icon: displayIcon(expense, categoryEmoji),
        months,
        paidNow: payment != null,
        startsLater: state.status === "not-started",
        first: keys[0] ?? null,
        last: keys[keys.length - 1] ?? null,
        remaining: state.remaining,
        ...getCreditDisplayProgress(expense, state),
      };
    })
    .filter((p) => p.months.size > 0);

  const daretStates = darets.filter((d) => d.expense.active).map((daret) => ({ daret, state: getDaretState(daret, payments, current) }));
  if (plans.length === 0 && !daretStates.some(({ state }) => compareMonths(state.end, current) >= 0)) return null;

  // Month by month, from this one to the last installment.
  const totals = new Map<string, number>();
  for (const p of plans) for (const [key, amount] of p.months) totals.set(key, round2((totals.get(key) ?? 0) + amount));
  const lastKey = [...totals.keys()].sort().pop() ?? null;
  const freeAt = lastKey ? parseMonthKey(lastKey) : null;
  const totalAt = (m: MonthId) => totals.get(monthKey(m)) ?? 0;

  const span = freeAt ? Math.min(MAX_MONTHS, monthsBetween(current, freeAt) + 1) : 0;
  const stairs: StairMonth[] = Array.from({ length: span }, (_, i) => {
    const m = addMonths(current, i);
    const key = monthKey(m);
    return {
      key,
      short: SHORT[m.month - 1],
      label: monthLabelFr(m),
      year: i === 0 || m.month === 1 ? String(m.year) : undefined,
      total: totalAt(m),
      items: plans
        .filter((p) => p.months.has(key))
        .map((p) => ({
          id: p.expense.id,
          name: p.expense.name,
          icon: p.icon,
          amount: p.months.get(key)!,
          note:
            key === currentKey && p.paidNow
              ? "payé ✓"
              : key === p.last
                ? "dernière"
                : key === p.first && p.startsLater
                  ? "1ère"
                  : undefined,
        }))
        .sort((a, b) => b.amount - a.amount),
    };
  });

  // Milestones: credits starting and ending, darets' turn and end.
  const milestones: Milestone[] = [];
  for (const p of plans) {
    if (p.startsLater && p.first) {
      milestones.push({ key: p.first, order: 0, icon: p.icon, title: p.expense.name, detail: "Première mensualité", amount: money(p.months.get(p.first)!) });
    }
    if (p.last) {
      const done = p.last === currentKey && p.paidNow && p.remaining <= 0;
      milestones.push({
        key: p.last,
        order: 2,
        icon: p.icon,
        title: p.expense.name,
        detail: done ? "Remboursé ✓" : "Dernière mensualité",
        amount: money(p.months.get(p.last)!),
        creditEnd: true,
      });
    }
  }
  for (const { daret, state } of daretStates) {
    if (compareMonths(state.turn, current) >= 0) {
      milestones.push({
        key: monthKey(state.turn),
        order: 1,
        icon: "💰",
        title: daret.expense.name,
        detail: daret.payoutMethod ? "Ton tour · reçue ✓" : "Ton tour · tu reçois la daret",
        amount: `+${money(state.payout)}`,
        income: true,
      });
    }
    if (compareMonths(state.end, current) >= 0) {
      milestones.push({
        key: monthKey(state.end),
        order: 2,
        icon: displayIcon(daret.expense, categoryEmoji),
        title: daret.expense.name,
        detail: "Dernière cotisation",
        amount: money(daret.expense.amount),
      });
    }
  }
  milestones.sort((a, b) => a.key.localeCompare(b.key) || a.order - b.order);
  const groups: { key: string; items: Milestone[] }[] = [];
  for (const m of milestones) {
    const group = groups.at(-1);
    if (group?.key === m.key) group.items.push(m);
    else groups.push({ key: m.key, items: [m] });
  }

  // Summary of the credits still running.
  const remaining = plans.reduce((s, p) => s + p.remaining, 0);
  const total = plans.reduce((s, p) => s + p.total, 0);
  const paid = plans.reduce((s, p) => s + p.paid, 0);
  const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const monthsLeft = freeAt ? monthsBetween(current, freeAt) : 0;

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Timeline</h2>

      {freeAt && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 to-violet-700 px-5 pb-4 pt-5 text-white">
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
          <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">Libre de toutes tes dettes</p>
          <p className="relative mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[27px] font-extrabold leading-tight">
            🏁 {monthLabelFr(freeAt)}
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold">
              {monthsLeft === 0 ? "ce mois-ci" : `dans ${monthsLeft} mois`}
            </span>
          </p>
          <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${percent}%` }} />
          </div>
          <p className="relative mt-1.5 text-[11.5px] text-white/80">
            <b className="text-white">{percent}% remboursé</b> · {money(paid)} sur {money(total)}
          </p>
          <div className="relative mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/15 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/75">Reste à payer</p>
              <p className="text-sm font-bold tabular-nums">{money(remaining)}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/75">Ce mois-ci</p>
              <p className="text-sm font-bold tabular-nums">{money(totalAt(current))}</p>
            </div>
          </div>
        </div>
      )}

      {stairs.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Chaque mois</h3>
            <p className="text-[11px] text-slate-400">Touche un mois pour le détail</p>
          </div>
          <CreditStairs months={stairs} currency={currency} />
        </div>
      )}

      {groups.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Les étapes</h3>
          <ol className="mt-3 flex flex-col">
            {groups.map((group) => {
              const month = parseMonthKey(group.key);
              // After a credit's last installment: what the credits cost then.
              const after =
                freeAt && compareMonths(month, freeAt) < 0 && group.items.some((m) => m.creditEnd) ? totalAt(addMonths(month, 1)) : null;
              return (
                <li key={group.key} className="relative flex gap-3 pb-5">
                  {/* The rail, from this step down to the next. */}
                  <span aria-hidden className="absolute bottom-0 left-[11px] top-3 w-0.5 rounded-full bg-violet-200 dark:bg-violet-400/25" />
                  <span aria-hidden className="relative mt-[3px] flex h-6 w-6 shrink-0 items-center justify-center">
                    <span className="h-3 w-3 rounded-full bg-violet-500 ring-4 ring-violet-100 dark:bg-violet-300 dark:ring-violet-400/20" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
                      {monthLabelFr(month)}
                      {group.key === currentKey && <span className="font-semibold normal-case tracking-normal text-slate-400"> · ce mois-ci</span>}
                    </p>
                    <ul className="mt-2 flex flex-col gap-2">
                      {group.items.map((m, i) => (
                        <li key={i} className="flex items-center gap-2.5">
                          <span className="gx-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base">{m.icon}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-semibold text-slate-900 dark:text-white">{m.title}</span>
                            {m.detail && <span className="block text-[11.5px] text-slate-500 dark:text-slate-400">{m.detail}</span>}
                          </span>
                          {m.amount && (
                            <span
                              className={cn(
                                "shrink-0 text-[13px] font-bold tabular-nums",
                                m.income ? "text-emerald-600 dark:text-emerald-300" : "text-slate-700 dark:text-slate-200",
                              )}
                            >
                              {m.amount}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {after != null && Math.abs(after - totalAt(month)) > 0.5 && (
                      <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
                        Ensuite <b className="text-slate-800 dark:text-slate-100">{money(after)}</b> de dettes par mois
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
            {freeAt && (
              <li className="flex gap-3">
                <span aria-hidden className="gx-cta flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px]">
                  🏁
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-extrabold text-violet-700 dark:text-violet-200">Libre de toutes tes dettes !</p>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">Après {monthLabelFr(freeAt)}, plus aucune mensualité à rembourser.</p>
                </div>
              </li>
            )}
          </ol>
        </div>
      )}
    </section>
  );
}
