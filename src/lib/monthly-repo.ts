// Stopping money put aside every month (Épargne or a goal's deposit): its
// expense ends on its last month, so the months put aside stay.
import { prisma } from "./prisma";
import { todayMonth } from "./date";
import { lastDayOfMonth } from "./daret";
import { stopMonth } from "./monthly-plan";

/** Ends the expense on its last month (see stopMonth). False when it never
 *  put anything aside: then there's nothing to keep. */
export async function stopMonthlyExpense(expenseId: string): Promise<boolean> {
  const [expense, payments] = await Promise.all([
    prisma.expense.findUnique({ where: { id: expenseId } }),
    prisma.payment.findMany({ where: { expenseId } }),
  ]);
  if (!expense) return false;
  const last = stopMonth(expense, payments, todayMonth());
  if (!last) return false;
  await prisma.expense.update({
    where: { id: expenseId },
    data: { type: "temporary", endDate: lastDayOfMonth(last), updatedAt: new Date().toISOString() },
  });
  return true;
}
