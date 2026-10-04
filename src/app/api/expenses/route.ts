import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createExpense, createIncome, getAllExpenses } from "@/lib/repository";
import { payExpense } from "@/lib/pay-expense";
import { expenseInputSchema, incomeInputSchema } from "@/lib/validation";

export async function GET() {
  return NextResponse.json(await getAllExpenses());
}

/** Optional extras done in the same request (one round trip from the phone). */
const extrasSchema = z.object({
  /** Already paid: settles this month (a credit: its installment). */
  paid: z.object({ monthKey: z.string().regex(/^\d{4}-\d{2}$/), method: z.enum(["cash", "card"]) }).optional(),
  /** A credit's money received: an income linked to it. */
  income: incomeInputSchema.omit({ expenseId: true }).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = expenseInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const extras = extrasSchema.safeParse(body);
  if (!extras.success) return NextResponse.json({ error: extras.error.flatten() }, { status: 400 });
  const expense = await createExpense(parsed.data);
  const problems: string[] = [];
  if (extras.data.income) {
    try {
      await createIncome({ ...extras.data.income, expenseId: expense.id });
    } catch {
      problems.push("income");
    }
  }
  if (extras.data.paid) {
    const result = await payExpense(expense.id, extras.data.paid.monthKey, extras.data.paid.method);
    if ("error" in result) problems.push("paid");
  }
  return NextResponse.json({ ...expense, problems }, { status: 201 });
}
