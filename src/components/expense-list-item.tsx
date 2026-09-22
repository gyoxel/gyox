import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { MonthlyOccurrence } from "@/lib/types";
import { CATEGORY_META, expenseIcon } from "@/lib/category";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function ExpenseListItem({ occurrence, currency }: { occurrence: MonthlyOccurrence; currency: string }) {
  const meta = CATEGORY_META[occurrence.expense.color];
  return (
    <Link
      href={`/expenses/${occurrence.expense.id}`}
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border-l-4 border border-slate-200 bg-white px-3.5 py-3 shadow-sm transition-colors active:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:active:bg-slate-800",
        meta.cardBorder,
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-lg leading-none">{expenseIcon(occurrence.expense)}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{occurrence.expense.name}</p>
          {occurrence.isFinalCreditPayment && (
            <p className="text-[11px] text-slate-400">Dernier paiement</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {formatMoney(occurrence.amount, currency)}
        </span>
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </div>
    </Link>
  );
}
