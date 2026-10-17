import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { deleteGoalDeposit, getAllPayments, getGoalDeposit, pagesGoneWithExpenses, updateGoalDeposit } from "@/lib/repository";
import { getAllSavingsMoves } from "@/lib/savings-repo";
import { savingsBalance } from "@/lib/savings";
import { formatMoney } from "@/lib/utils";
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
  const current = await getGoalDeposit(id, depositId);
  if (current?.method === "savings" && parsed.data.amount > current.amount) {
    // Taking more from the savings: they must hold it.
    const [moves, payments] = await Promise.all([getAllSavingsMoves(), getAllPayments()]);
    const available = savingsBalance(moves, payments) + current.amount;
    if (parsed.data.amount > available + 1e-9) {
      return NextResponse.json({ error: `Il n'y a que ${formatMoney(available)} dans l'épargne.` }, { status: 400 });
    }
  }
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
