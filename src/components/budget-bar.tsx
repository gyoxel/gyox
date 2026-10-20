import { budgetLevel, budgetPercent, type BudgetLevel } from "@/lib/category-budgets";
import { cn } from "@/lib/utils";

const BAR: Record<BudgetLevel, string> = {
  ok: "bg-emerald-500",
  near: "bg-orange-500",
  over: "bg-rose-500",
};

/** A budget's colour as text: green, orange from 80%, red once gone past. */
export const LEVEL_TEXT: Record<BudgetLevel, string> = {
  ok: "text-emerald-600 dark:text-emerald-400",
  near: "text-orange-600 dark:text-orange-400",
  over: "text-rose-600 dark:text-rose-400",
};

/** How much of a budget is spent (full once reached), in its colour. The
 *  numbers are always written beside it, never the colour alone. */
export function BudgetBar({ spent, budget, className }: { spent: number; budget: number; className?: string }) {
  const pct = Math.min(100, budgetPercent(spent, budget));
  return (
    <span aria-hidden className={cn("block h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", className)}>
      <span className={cn("block h-full rounded-full", BAR[budgetLevel(spent, budget)])} style={{ width: `${Math.max(pct, spent > 0 ? 2 : 0)}%` }} />
    </span>
  );
}
