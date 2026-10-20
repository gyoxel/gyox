import { getAllCategories, getAllDarets, getAllDayNotes, getAllExpenses, getAllGoals, getAllIncomes, getAllPayments, getAllSalaryAdvances, getIncomeCategories, getSettings } from "@/lib/page-data";
import { advancesOn } from "@/lib/salary";
import { incomeCategory } from "@/lib/income";

import { addMonths, compareMonths, monthFromSearchParams, monthKey, todayMonth, type MonthId } from "@/lib/date";
import { monthLabel } from "@/lib/i18n/dates";
import { localName } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { displayIcon } from "@/lib/category";
import { getCreditRealState, projectCreditInstallment } from "@/lib/engine";
import { getDaretState } from "@/lib/daret";
import { getGoalProgress } from "@/lib/goals";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { CalendarView, type CalendarEvent, type CalendarInfo } from "@/components/calendar-view";

export const dynamic = "force-dynamic";

/** "YYYY-MM-DD" of a day number in a month (last day when the month is shorter). */
function dayIn(m: MonthId, day: number): string {
  const d = Math.min(day, new Date(m.year, m.month, 0).getDate());
  return `${monthKey(m)}-${String(d).padStart(2, "0")}`;
}
/** Day of the month an expense is paid: the day of its start date. */
const dueDayOf = (startDate: string) => Number(startDate.slice(8, 10)) || 1;

/**
 * Calendrier: the history of money movements, day by day — expenses paid
 * (the day they were ticked), the salary on its pay day, and money put
 * aside for goals — plus "à savoir" reminders (last credit installment,
 * daret payout, goal reached, deadlines, next salary) and a free note per day.
 */
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const [sp, settings, expenses, payments, categories, goals, darets, dayNotes, advances, incomes, incomeCategories, { lang, t }] = await Promise.all([
    searchParams,
    getSettings(),
    getAllExpenses(),
    getAllPayments(),
    getAllCategories(),
    getAllGoals(),
    getAllDarets(),
    getAllDayNotes(),
    getAllSalaryAdvances(),
    getAllIncomes(),
    getIncomeCategories(),
    getI18n(),
  ]);
  const monthLabelFr = (m: MonthId) => monthLabel(m, lang);
  const current = todayMonth();

  const month = monthFromSearchParams(sp.month, current);
  const key = monthKey(month);
  // A payment's day is decided in Moroccan time, which can spill one day
  // over the month's edges in UTC: keep a margin, the view filters exactly.
  const near = (iso: string) => iso.slice(0, 7) === key || iso.slice(0, 7) === monthKey(addMonths(month, -1)) || iso.slice(0, 7) === monthKey(addMonths(month, 1));

  const emojiById = new Map(categories.map((c) => [c.id, c.emoji]));
  const byId = new Map(expenses.map((e) => [e.id, e]));
  const events: CalendarEvent[] = [];

  for (const p of payments) {
    if (!near(p.paidAt) || p.amountPaid <= 0) continue;
    const expense = byId.get(p.expenseId);
    events.push({
      id: p.id,
      kind: "out",
      label: expense ? localName(expense.name, t) : t("Dépense supprimée"),
      icon: expense ? displayIcon(expense, emojiById) : "💸",
      amount: p.amountPaid,
      at: p.paidAt,
      method: p.method ?? null,
    });
  }

  const payday = dayIn(month, settings.payDay);
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca" }).format(new Date());
  // The salary of this month, less what was taken from it in advance; each
  // advance is money in on the day it was received.
  const taken = advancesOn(advances, key);
  const salaryHere = Math.max(0, settings.salary - taken);
  if (salaryHere > 0 && payday <= todayStr) {
    events.push({
      id: `salary-${key}`,
      kind: "in",
      label: taken > 0 ? t("Salaire (moins l'avance)") : t("Salaire"),
      icon: "💰",
      amount: salaryHere,
      at: payday,
      method: settings.salaryMethod,
    });
  }
  for (const i of incomes) {
    if (!i.date.startsWith(key)) continue;
    events.push({
      id: i.id,
      kind: "in",
      label: localName(i.name, t),
      icon: incomeCategory(i.category, incomeCategories).emoji,
      amount: i.amount,
      at: i.date,
      method: i.method,
    });
  }
  for (const a of advances) {
    if (!a.date.startsWith(key)) continue;
    const [y, m] = a.period.split("-").map(Number);
    events.push({
      id: a.id,
      kind: "in",
      label: `${t("Avance sur salaire")} · ${monthLabelFr({ year: y, month: m })}`,
      icon: "💵",
      amount: a.amount,
      at: a.date,
    });
  }

  for (const g of goals) {
    for (const d of g.deposits) {
      const label = `${d.name === "Versement" ? t("Versement") : d.name} · ${g.emoji} ${g.name}`;
      if (d.monthly) {
        // Every month: each month ticked, the day it was.
        for (const p of payments) {
          if (p.expenseId !== d.expenseId || !(p.amountPaid > 0) || !p.paidAt.startsWith(key)) continue;
          events.push({ id: `${d.id}-${p.id}`, kind: "saving", label, icon: "🐷", amount: p.amountPaid, at: p.paidAt });
        }
        continue;
      }
      if (!d.date.startsWith(key)) continue;
      events.push({ id: d.id, kind: "saving", label, icon: "🐷", amount: d.amount, at: d.date });
    }
  }

  // "À savoir": what happens on a day of this month (past or to come).
  const money = (n: number) => formatMoney(n, settings.currency);
  const same = (m: MonthId | null) => m != null && compareMonths(m, month) === 0;
  const infos: CalendarInfo[] = [];

  if (salaryHere > 0 && payday > todayStr) {
    infos.push({
      id: `salary-${key}`,
      date: payday,
      icon: "💰",
      label: t("Salaire prévu"),
      detail: taken > 0 ? `+${money(salaryHere)} ${t("(avance de {amount} déduite)", { amount: money(taken) })}` : `+${money(salaryHere)}`,
    });
  }

  for (const e of expenses) {
    if (e.type !== "credit" || !e.active) continue;
    const state = getCreditRealState(e, payments, current);
    if (!same(state.projectedEndMonth)) continue;
    const date = dayIn(month, dueDayOf(e.startDate));
    const icon = displayIcon(e, emojiById);
    infos.push(
      state.status === "completed"
        ? { id: `credit-${e.id}`, date, icon, label: t("Dette {name} remboursée ✅", { name: e.name }) }
        : {
            id: `credit-${e.id}`,
            date,
            icon,
            label: `${t("Dernière mensualité")} · ${e.name}`,
            detail: `${money(projectCreditInstallment(e, payments, month, current) ?? Math.min(e.amount, state.remaining))} — ${t("fin de la dette 🎉")}`,
          },
    );
  }

  for (const d of darets) {
    const state = getDaretState(d, payments, current);
    const date = dayIn(month, dueDayOf(d.expense.startDate));
    if (same(state.turn)) {
      infos.push({ id: `daret-turn-${d.id}`, date, icon: "🤝🏻", label: t("Tu prends la daret {name}", { name: d.expense.name }), detail: `+${money(state.payout)}` });
    }
    if (same(state.end) && !same(state.turn)) {
      infos.push({ id: `daret-end-${d.id}`, date, icon: "🤝🏻", label: t("Dernière cotisation · daret {name}", { name: d.expense.name }), detail: money(d.expense.amount) });
    }
  }

  for (const g of goals) {
    const p = getGoalProgress(g, darets, payments, current);
    if (p.completed) continue;
    const hit = p.reachedByDaretsIn ?? p.estimatedMonth;
    if (same(hit)) {
      const viaDaret = p.reachedByDaretsIn ? darets.find((d) => g.daretIds.includes(d.id) && d.turnMonth === key) : undefined;
      infos.push({
        id: `goal-${g.id}`,
        date: viaDaret ? dayIn(month, dueDayOf(viaDaret.expense.startDate)) : payday,
        icon: g.emoji,
        label: t("Objectif {name} atteint 🎉", { name: g.name }),
        detail: p.reachedByDaretsIn ? t("Grâce à tes darets") : t("En mettant {amount}/mois", { amount: money(g.monthlySaving ?? 0) }),
      });
    }
    if (same(p.deadline)) {
      infos.push({
        id: `goal-deadline-${g.id}`,
        date: dayIn(month, 31),
        icon: g.emoji,
        label: t("Date limite · objectif {name}", { name: g.name }),
        detail: p.remainingNow > 0 ? t("Il manque {amount}", { amount: money(p.remainingNow) }) : undefined,
      });
    }
  }

  const notes = Object.fromEntries(dayNotes.filter((n) => n.date.startsWith(key)).map((n) => [n.date, n.text]));

  return (
    <>
      <PageHeader title={t("Calendrier")} back info="calendar" />
      <main className="px-4 py-5">
        <CalendarView
          key={key}
          month={key}
          monthLabel={monthLabelFr(month)}
          events={events}
          infos={infos}
          notes={notes}
          prevHref={`/calendar?month=${monthKey(addMonths(month, -1))}`}
          nextHref={`/calendar?month=${monthKey(addMonths(month, 1))}`}
          currency={settings.currency}
        />
      </main>
    </>
  );
}
