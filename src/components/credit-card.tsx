import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Expense, Payment } from "@/lib/types";
import { getCreditDisplayProgress, getCreditEndMonth, getCreditRealState } from "@/lib/engine";
import { compareMonths, monthLabelShortFr, monthsBetween, todayMonth } from "@/lib/date";
import { cn, formatMoney } from "@/lib/utils";
import type { DisplayColor } from "@/lib/engine";

const RING = 46; // px
const STROKE = 4;

/**
 * One credit: the person's icon inside a ring filled with what's already
 * repaid, the monthly amount and end, how many months are left, and the
 * remaining amount. Tapping it opens the credit.
 */
export function CreditCard({
  expense,
  payments,
  currency,
  icon,
}: {
  expense: Expense;
  payments: Payment[];
  currency: string;
  color?: DisplayColor;
  icon: string;
}) {
  const current = todayMonth();
  const state = getCreditRealState(expense, payments, current);
  const progress = getCreditDisplayProgress(expense, state);
  // Real projected end once started; the planned schedule end before that.
  const endMonth = state.projectedEndMonth ?? getCreditEndMonth(expense);
  const done = state.status === "completed";
  const late = state.isOverdue && state.pendingAmount > 0;
  const monthsLeft = endMonth && compareMonths(endMonth, current) >= 0 ? monthsBetween(current, endMonth) + 1 : 0;
  const money = (n: number) => formatMoney(n, currency);

  const r = (RING - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, progress.percent));

  return (
    <Link href={`/expenses/${expense.id}`} prefetch className="block">
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border bg-white px-3.5 py-3 shadow-sm transition-transform active:scale-[0.98] dark:bg-slate-900",
          late ? "border-rose-200 dark:border-rose-900/60" : "border-slate-200 dark:border-slate-800",
        )}
      >
        {/* Icon in a ring of what's repaid */}
        <div className="relative shrink-0" style={{ width: RING, height: RING }}>
          <svg width={RING} height={RING} className="-rotate-90">
            <circle cx={RING / 2} cy={RING / 2} r={r} fill="none" strokeWidth={STROKE} className="stroke-blue-100 dark:stroke-blue-950" />
            <circle
              cx={RING / 2}
              cy={RING / 2}
              r={r}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
              className={done ? "stroke-emerald-500" : late ? "stroke-rose-500" : "stroke-blue-600"}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xl leading-none">{icon}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[15px] font-semibold text-slate-900 dark:text-white">{expense.name}</h3>
            {late && (
              <span className="shrink-0 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                En retard
              </span>
            )}
            {done && (
              <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Terminé ✓
              </span>
            )}
          </div>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">{money(expense.amount)}</span>/mois
            {endMonth && (
              <>
                {" "}
                · fin {monthLabelShortFr(endMonth).toLowerCase().replace(/ 20(\d\d)$/, " $1")}
              </>
            )}
          </p>
          {!done && (
            <p className="mt-0.5 text-[11px] font-medium text-blue-600 dark:text-sky-400">
              {pct}% payé
              {monthsLeft > 0 && (
                <span className="text-slate-400">
                  {" "}
                  · {monthsLeft === 1 ? "dernier mois" : `encore ${monthsLeft} mois`}
                </span>
              )}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className={cn("text-base font-bold tabular-nums", done ? "text-emerald-600" : "text-slate-900 dark:text-white")}>
            {money(state.remaining)}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">{done ? "soldé" : "restant"}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
      </div>
    </Link>
  );
}
