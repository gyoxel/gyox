import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { deleteGoalDeposit, getGoalDeposit, pagesGoneWithExpenses, updateGoalDeposit } from "@/lib/repository";
import { withBalanceGuard } from "@/lib/balance-guard";

interface Params {
  params: Promise<{ id: string; depositId: string }>;
}

const patchSchema = z.object({
  name: z.string().trim().max(60).default(""),
  amount: z.coerce.number().positive("Le montant doit être positif."),
  method: z.enum(["cash", "card"]).nullable().default(null),
  paid: z.boolean().default(true),
});

/** PATCH { name, amount, method, paid }: edits the deposit (and its expense). */
export const PATCH = withBalanceGuard(async function patch(req: NextRequest, { params }: Params) {
  const { id, depositId } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const deposit = await updateGoalDeposit(id, depositId, parsed.data);
  if (!deposit) return NextResponse.json({ error: "Versement introuvable." }, { status: 404 });
  return NextResponse.json(deposit);
});

export const DELETE = withBalanceGuard(async function remove(_req: Request, { params }: Params) {
  const { id, depositId } = await params;
  const deposit = await getGoalDeposit(id, depositId);
  const gone = [
    `/goals/${id}/deposits/${depositId}`,
    ...(await pagesGoneWithExpenses(deposit?.expenseId ? [deposit.expenseId] : [])),
  ];
  const ok = await deleteGoalDeposit(id, depositId);
  if (!ok) return NextResponse.json({ error: "Versement introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true, gone });
});
