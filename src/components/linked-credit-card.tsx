import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Expense, Payment } from "@/lib/types";
import { getEffectiveEndMonth, getUnpaidMonths } from "@/lib/engine";
import { addMonths, compareMonths, monthKey, monthLabelFr, monthOfDateStr, monthsBetween, todayMonth } from "@/lib/date";
import { formatMoney } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ColorDot } from "@/components/color-dot";
import type { DisplayColor } from "@/lib/engine";

/** An expense tied to a credit (e.g. Zineb ends together with Dnya), shown
 *  on the Crédits page right under that credit. Display only — every
 *  number comes from the existing engine and confirmed payments. */
export function LinkedCreditCard({
  expense,
  credit,
  payments,
  byId,
  currency,
  color,
}: {
  expense: Expense;
  credit: Expense;
  payments: Payment[];
  byId: Map<string, Expense>;
  currency: string;
  color: DisplayColor;
}) {
  const current = todayMonth();
  const start = monthOfDateStr(expense.startDate);
  const end = getEffectiveEndMonth(expense, byId);
  const totalMonths = end ? Math.max(1, monthsBetween(start, end) + 1) : null;

  const paidKeys = new Set(
    payments
      .filter((p) => p.expenseId === expense.id && p.monthKey != null && p.amountPaid >= p.amountDue - 0.005)
      .map((p) => p.monthKey as string),
  );
  let paidMonths = 0;
  if (totalMonths != null) {
    for (let i = 0; i < totalMonths; i++) if (paidKeys.has(monthKey(addMonths(start, i)))) paidMonths++;
  }

  const overdue = getUnpaidMonths(expense, payments, addMonths(current, -1), byId).length > 0;
  const finished = totalMonths != null && paidMonths >= totalMonths;
  const upcoming = compareMonths(current, start) < 0;

  const percent = totalMonths ? Math.round((paidMonths / totalMonths) * 100) : 0;
  const remaining = totalMonths != null ? (totalMonths - paidMonths) * expense.amount : null;

  const status = finished
    ? { label: "Terminé", variant: "green" as const }
    : upcoming
      ? { label: "À venir", variant: "neutral" as const }
      : { label: "En cours", variant: "blue" as const };

  return (
    <Link href={`/expenses/${expense.id}`}>
      <Card className="transition-colors active:bg-slate-50 dark:active:bg-slate-800">
        <CardContent className="flex flex-col gap-3 pt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex min-w-0 items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <ColorDot color={color} />
              <span className="truncate">{expense.name}</span>
            </h3>
            <div className="flex shrink-0 items-center gap-1.5">
              {overdue && !finished && <Badge variant="red">En retard</Badge>}
              {finished && <Badge variant={status.variant}>{status.label}</Badge>}
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Restant</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {remaining != null ? formatMoney(remaining, currency) : "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">Paiement mensuel</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{formatMoney(expense.amount, currency)}</p>
            </div>
          </div>

          {totalMonths != null && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {paidMonths} / {totalMonths} mois payés
                </span>
                <span>{percent}%</span>
              </div>
              <Progress value={percent} indicatorClassName="bg-amber-400 dark:bg-amber-500" />
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <p className="text-xs text-slate-500 dark:text-slate-400">Fin prévue · avec {credit.name}</p>
            <p className="font-medium text-slate-800 dark:text-slate-200">{end ? monthLabelFr(end) : "Sans fin"}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
