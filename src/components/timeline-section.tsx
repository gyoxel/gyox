import type { DaretWithExpense, Expense, Payment } from "@/lib/types";
import { compareMonths, monthLabelFr, todayMonth, type MonthId } from "@/lib/date";
import { getDaretState } from "@/lib/daret";
import { getCreditDisplayProgress, getCreditRealState, getEffectiveEndMonth, getExpenseDisplayColor, type DisplayColor } from "@/lib/engine";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatMoney } from "@/lib/utils";
import { ColorDot } from "@/components/color-dot";
import { displayIcon } from "@/lib/category";

const BAR: Record<DisplayColor, string> = { orange: "bg-[#f97316]", red: "bg-[#e11d48]", blue: "bg-[#2563eb]" };

interface Row {
  expense: Expense;
  color: DisplayColor;
  end: MonthId | null;
  /** Share actually repaid, 0-100. */
  percent: number;
  paid: number;
  total: number;
}

/**
 * Timeline: only commitments with an end — credits and darets. Progress is
 * what has really been paid: money for a credit, rounds paid for a daret
 * (never elapsed calendar time).
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
  const byId = new Map(expenses.map((e) => [e.id, e]));
  const current = todayMonth();

  const creditRows: Row[] = expenses
    .filter((e) => e.active && e.type === "credit")
    .map((expense) => {
      const state = getCreditRealState(expense, payments, current);
      return {
        expense,
        color: getExpenseDisplayColor(expense),
        end: state.projectedEndMonth ?? getEffectiveEndMonth(expense, byId),
        ...getCreditDisplayProgress(expense, state),
      };
    });

  const daretRows: Row[] = darets
    .filter((d) => d.expense.active)
    .map((daret) => {
      const state = getDaretState(daret, payments, current);
      return {
        expense: daret.expense,
        color: getExpenseDisplayColor(daret.expense),
        end: state.end,
        percent: Math.round((state.paidRounds / Math.max(1, daret.members)) * 100),
        paid: state.paidRounds * daret.expense.amount,
        total: state.totalContribution,
      };
    });

  // Soonest end first.
  const rows = [...creditRows, ...daretRows].sort((a, b) => {
    if (!a.end || !b.end) return a.end ? -1 : b.end ? 1 : 0;
    return compareMonths(a.end, b.end);
  });
  if (rows.length === 0) return null;

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Timeline</h2>
      <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
        Progression réelle de chaque crédit et daret (ce qui est déjà payé), et sa date de fin.
      </p>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-4">
          {rows.map(({ expense, color, end, percent, paid, total }) => (
            <div key={expense.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                  <ColorDot color={color} />
                  <span className="leading-none">{displayIcon(expense, categoryEmoji)}</span>
                  <span className="truncate">{expense.name}</span>
                  <span className="shrink-0 text-xs font-normal text-slate-400">
                    {formatMoney(expense.amount, currency)}
                    {expense.frequency === "monthly" ? "/mois" : ""}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                  {`${percent}% · → ${end ? monthLabelFr(end) : "Sans fin"}`}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={cn("h-full rounded-full transition-[width] duration-500", BAR[color])}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Payé {formatMoney(paid, currency)} / Total {formatMoney(total, currency)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
