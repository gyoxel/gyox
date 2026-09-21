import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Expense } from "@/lib/types";
import { getCreditProgress } from "@/lib/engine";
import { monthLabelFr, todayMonth } from "@/lib/date";
import { formatMoney } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<string, { label: string; variant: "neutral" | "blue" | "green" }> = {
  "not-started": { label: "À venir", variant: "neutral" },
  "in-progress": { label: "En cours", variant: "blue" },
  completed: { label: "Terminé", variant: "green" },
};

export function CreditCard({ expense, currency }: { expense: Expense; currency: string }) {
  const progress = getCreditProgress(expense, todayMonth());
  const initial = expense.creditInitialAmount ?? 0;
  const percent = initial > 0 ? Math.min(100, Math.round((progress.paid / initial) * 100)) : 0;
  const status = STATUS_LABEL[progress.status];

  return (
    <Link href={`/expenses/${expense.id}`}>
      <Card className="transition-colors active:bg-slate-50 dark:active:bg-slate-800">
        <CardContent className="flex flex-col gap-3 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{expense.name}</h3>
            <div className="flex items-center gap-1.5">
              <Badge variant={status.variant}>{status.label}</Badge>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Restant</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {formatMoney(progress.remaining, currency)}
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
                {formatMoney(progress.paid, currency)} / {formatMoney(initial, currency)}
              </span>
              <span>{percent}%</span>
            </div>
            <Progress value={percent} indicatorClassName="bg-sky-400 dark:bg-sky-500" />
          </div>

          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Prochain paiement</p>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {progress.nextPaymentMonth
                  ? `${monthLabelFr(progress.nextPaymentMonth)} · ${formatMoney(progress.nextPaymentAmount, currency)}`
                  : "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">Fin prévue</p>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {progress.endMonth ? monthLabelFr(progress.endMonth) : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
