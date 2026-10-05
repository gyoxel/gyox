import { NextRequest, NextResponse } from "next/server";
import { deleteGoal, getGoalById, pagesGoneWithExpenses, updateGoal } from "@/lib/repository";
import { goalInputSchema } from "@/lib/validation";
import { withBalanceGuard } from "@/lib/balance-guard";

interface Params {
  params: Promise<{ id: string }>;
}

// Any field of the goal (deposits have their own route).
const patchSchema = goalInputSchema.partial();

export const PATCH = withBalanceGuard(async function patch(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const current = await getGoalById(id);
  if (!current) return NextResponse.json({ error: "Objectif introuvable." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  // Only the fields actually sent (partial() still fills in defaults).
  const sent = Object.fromEntries(Object.entries(parsed.data).filter(([k]) => body && k in body));

  const goal = await updateGoal(id, sent);
  if (!goal) return NextResponse.json({ error: "Modification impossible." }, { status: 400 });
  return NextResponse.json(goal);
});

export const DELETE = withBalanceGuard(async function remove(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const goal = await getGoalById(id);
  const expenseIds = (goal?.deposits ?? []).flatMap((d) => (d.expenseId ? [d.expenseId] : []));
  const gone = [`/goals/${id}`, ...(await pagesGoneWithExpenses(expenseIds))];
  const ok = await deleteGoal(id);
  if (!ok) return NextResponse.json({ error: "Objectif introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true, gone });
});
