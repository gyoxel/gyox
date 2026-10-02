import type { DaretWithExpense, Goal } from "./types";
import type { DaretOption } from "@/components/goal-form";

/** Darets as offered in the goal form, with the other goal each one feeds. */
export function daretOptions(darets: DaretWithExpense[], goals: Goal[], editingId?: string): DaretOption[] {
  return darets.map((d) => {
    const owner = goals.find((g) => g.id !== editingId && g.daretIds.includes(d.id));
    return {
      id: d.id,
      name: d.expense.name,
      payout: Math.round(d.expense.amount * d.members * 100) / 100,
      turnMonth: d.turnMonth,
      linkedTo: owner ? `${owner.emoji} ${owner.name}` : null,
    };
  });
}
