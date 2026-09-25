import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Expense, Payment } from "@/lib/types";
import { getCreditDisplayProgress, getCreditEndMonth, getCreditRealState } from "@/lib/engine";
import { monthLabelFr, todayMonth } from "@/lib/date";
import { formatMoney } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ColorDot } from "@/components/color-dot";
import type { DisplayColor } from "@/lib/engine";

const STATUS_LABEL: Record<string, { label: string; variant: "neutral" | "blue" | "green" | "red" }> = {
  "not-started": { label: "À venir", variant: "neutral" },
  "in-progress": { label: "En cours", variant: "blue" },
  completed: { label: "Terminé", variant: "green" },
};

export function CreditCard({
  expense,
  payments,
  currency,
  color,
}: {
  expense: Expense;
  payments: Payment[];
  currency: string;
  color: DisplayColor;
}) {
  const state = getCreditRealState(expense, payments, todayMonth());
  const { total, paid, percent } = getCreditDisplayProgress(expense, state);
  const status = STATUS_LABEL[state.status];
  // Real projected end once started; the planned schedule end before that.
  const endMonth = state.projectedEndMonth ?? getCreditEndMonth(expense);

  return (
    <Link href={`/expenses/${expense.id}`}>
      <Card className="transition-colors active:bg-slate-50 dark:active:bg-slate-800">
        <CardContent className="flex flex-col gap-3 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="flex min-w-0 items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <ColorDot color={color} />
              <span className="truncate">{expense.name}</span>
            </h3>
            <div className="flex items-center gap-1.5">
              {state.isOverdue && state.pendingAmount > 0 && <Badge variant="red">En retard</Badge>}
              {state.status === "completed" && <Badge variant={status.variant}>{status.label}</Badge>}
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Restant</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {formatMoney(state.remaining, currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">Paiement mensuel</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {formatMoney(expense.amount, currency)}
              </p>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                {formatMoney(paid, currency)} / {formatMoney(total, currency)}
              </span>
              <span>{percent}%</span>
            </div>
            <Progress value={percent} indicatorClassName="bg-sky-400 dark:bg-sky-500" />
          </div>

          <div className="flex items-center justify-between text-sm">
            <p className="text-xs text-slate-500 dark:text-slate-400">Fin prévue</p>
            <p className="font-medium text-slate-800 dark:text-slate-200">{endMonth ? monthLabelFr(endMonth) : "—"}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
