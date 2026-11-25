import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
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
  const goal = await createGoal(parsed.data);
  await logActivity({ kind: "goal", action: "add", name: goal.name, amount: goal.targetAmount });
  return NextResponse.json(goal, { status: 201 });
});
