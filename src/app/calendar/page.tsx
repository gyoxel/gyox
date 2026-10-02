import { getAllCategories, getAllExpenses, getAllGoals, getAllPayments, getSettings } from "@/lib/repository";
import { addMonths, compareMonths, monthFromSearchParams, monthKey, monthLabelFr, parseMonthKey, todayMonth, type MonthId } from "@/lib/date";
import { displayIcon } from "@/lib/category";
import { PageHeader } from "@/components/page-header";
import { CalendarView, type CalendarEvent } from "@/components/calendar-view";

export const dynamic = "force-dynamic";

/** "YYYY-MM-DD" of the pay day in a month (last day when the month is shorter). */
function paydayOf(m: MonthId, payDay: number): string {
  const day = Math.min(payDay, new Date(m.year, m.month, 0).getDate());
  return `${monthKey(m)}-${String(day).padStart(2, "0")}`;
}

/**
 * Calendrier: the history of money movements, day by day — expenses paid
 * (the day they were ticked), the salary on its pay day, and money put
 * aside for goals. Current and past months only.
 */
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const [sp, settings, expenses, payments, categories, goals] = await Promise.all([
    searchParams,
    getSettings(),
    getAllExpenses(),
    getAllPayments(),
    getAllCategories(),
    getAllGoals(),
  ]);
  const current = todayMonth();

  // History starts with the first recorded movement (or this month).
  const firstDates = [
    ...payments.map((p) => p.paidAt.slice(0, 7)),
    ...goals.flatMap((g) => g.deposits.map((d) => d.date.slice(0, 7))),
  ].sort();
  const earliest = firstDates[0] ? parseMonthKey(firstDates[0]) : current;
  const earliestMonth = compareMonths(earliest, current) < 0 ? earliest : current;

  let month = monthFromSearchParams(sp.month, current);
  if (compareMonths(month, current) > 0) month = current;
  if (compareMonths(month, earliestMonth) < 0) month = earliestMonth;
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
      label: expense?.name ?? "Dépense supprimée",
      icon: expense ? displayIcon(expense, emojiById) : "💸",
      amount: p.amountPaid,
      at: p.paidAt,
    });
  }

  const payday = paydayOf(month, settings.payDay);
  const todayStr = new Date().toISOString().slice(0, 10);
  if (settings.salary > 0 && payday <= todayStr) {
    events.push({ id: `salary-${key}`, kind: "in", label: "Salaire", icon: "💰", amount: settings.salary, at: payday });
  }

  for (const g of goals) {
    for (const d of g.deposits) {
      if (!d.date.startsWith(key)) continue;
      events.push({ id: d.id, kind: "saving", label: `${d.name} · ${g.emoji} ${g.name}`, icon: "🐷", amount: d.amount, at: d.date });
    }
  }

  return (
    <>
      <PageHeader title="Calendrier" back />
      <main className="px-4 py-5">
        <CalendarView
          key={key}
          month={key}
          monthLabel={monthLabelFr(month)}
          events={events}
          prevHref={compareMonths(month, earliestMonth) > 0 ? `/calendar?month=${monthKey(addMonths(month, -1))}` : null}
          nextHref={compareMonths(month, current) < 0 ? `/calendar?month=${monthKey(addMonths(month, 1))}` : null}
          currency={settings.currency}
        />
      </main>
    </>
  );
}
