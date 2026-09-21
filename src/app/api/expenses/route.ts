import { NextRequest, NextResponse } from "next/server";
import { createExpense, getAllExpenses } from "@/lib/repository";
import { expenseInputSchema } from "@/lib/validation";

export async function GET() {
  return NextResponse.json(getAllExpenses());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = expenseInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const expense = createExpense(parsed.data);
  return NextResponse.json(expense, { status: 201 });
}
