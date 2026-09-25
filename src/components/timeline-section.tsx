import type { Expense, Payment } from "@/lib/types";
import { addMonths, compareMonths, monthKey, monthLabelFr, monthOfDateStr, monthsBetween, todayMonth, type MonthId } from "@/lib/date";
import { getCreditDisplayProgress, getCreditRealState, getEffectiveEndMonth, getExpenseDisplayColor, type DisplayColor } from "@/lib/engine";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatMoney } from "@/lib/utils";
import { ColorDot } from "@/components/color-dot";

const BAR: Record<DisplayColor, string> = { red: "bg-rose-400", yellow: "bg-amber-400", blue: "bg-sky-400" };

interface Row {
  expense: Expense;
  color: DisplayColor;
  end: MonthId | null;
  /** Share actually repaid, 0-100 (null for permanent expenses). */
  percent: number | null;
}

/** Real repayment progress: money paid for credits, months paid for the
 *  rest — never elapsed calendar time, so nothing shows as filled until it
 *  has actually been paid. */
function progressOf(expense: Expense, payments: Payment[], byId: Map<string, Expense>): Omit<Row, "expense" | "color"> {
  if (expense.type === "permanent") return { end: null, percent: null };

  if (expense.type === "credit") {
    const state = getCreditRealState(expense, payments, todayMonth());
    const { percent } = getCreditDisplayProgress(expense, state);
    return { end: state.projectedEndMonth ?? getEffectiveEndMonth(expense, byId), percent };
  }

  const start = monthOfDateStr(expense.startDate);
  const end = getEffectiveEndMonth(expense, byId);
  if (!end) return { end: null, percent: 0 };
  const total = Math.max(1, monthsBetween(start, end) + 1);
  const paidKeys = new Set(
    payments
      .filter((p) => p.expenseId === expense.id && p.monthKey != null && p.amountPaid >= p.amountDue - 0.005)
      .map((p) => p.monthKey as string),
  );
  let paid = 0;
  for (let i = 0; i < total; i++) if (paidKeys.has(monthKey(addMonths(start, i)))) paid++;
  return { end, percent: Math.round((paid / total) * 100) };
}

export function TimelineSection({
  expenses,
  payments,
  currency,
}: {
  expenses: Expense[];
  payments: Payment[];
  currency: string;
}) {
  const active = expenses.filter((e) => e.active);
  const byId = new Map(expenses.map((e) => [e.id, e]));

  const rows: Row[] = active.map((expense) => ({
    expense,
    color: getExpenseDisplayColor(expense, byId),
    ...progressOf(expense, payments, byId),
  }));

  // Soonest end first; permanent expenses (no end) last.
  rows.sort((a, b) => {
    if (a.percent == null || b.percent == null) return a.percent == null ? (b.percent == null ? 0 : 1) : -1;
    if (!a.end || !b.end) return a.end ? -1 : b.end ? 1 : 0;
    return compareMonths(a.end, b.end);
  });

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Timeline</h2>
      <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
        Progression réelle du remboursement de chaque dépense (ce qui est déjà payé), et sa date de fin.
      </p>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-4">
          {rows.map(({ expense, color, end, percent }) => (
            <div key={expense.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                  <ColorDot color={color} />
                  <span className="truncate">{expense.name}</span>
                  <span className="shrink-0 text-xs font-normal text-slate-400">
                    {formatMoney(expense.amount, currency)}
                    {expense.frequency === "monthly" ? "/mois" : ""}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                  {percent == null ? "Permanent" : `${percent}% · → ${end ? monthLabelFr(end) : "Sans fin"}`}
                </span>
              </div>
              {percent != null && (
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={cn("h-full rounded-full transition-[width] duration-500", BAR[color])}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
