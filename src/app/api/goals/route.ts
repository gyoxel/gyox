import { NextRequest, NextResponse } from "next/server";
import { createGoal, getAllGoals } from "@/lib/repository";
import { goalInputSchema } from "@/lib/validation";
import { withBalanceGuard } from "@/lib/balance-guard";

export async function GET() {
  return NextResponse.json(await getAllGoals());
}

export const POST = withBalanceGuard(async function post(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = goalInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  return NextResponse.json(await createGoal(parsed.data), { status: 201 });
});
