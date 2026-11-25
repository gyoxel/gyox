import { NextResponse, type NextRequest } from "next/server";
import { logActivity } from "@/lib/activity";
import { createIncome, getAllIncomes } from "@/lib/repository";
import { incomeInputSchema } from "@/lib/validation";
import { withBalanceGuard } from "@/lib/balance-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getAllIncomes());
}

export const POST = withBalanceGuard(async function post(req: NextRequest) {
  const parsed = incomeInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const income = await createIncome(parsed.data);
  await logActivity({ kind: "income", action: "add", name: income.name, amount: income.amount, detail: income.method });
  return NextResponse.json(income, { status: 201 });
});
