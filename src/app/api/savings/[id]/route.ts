import { NextResponse, type NextRequest } from "next/server";
import { getAllPayments } from "@/lib/repository";
import { deleteSavingsMove, getAllSavingsMoves, getSavingsMove, updateSavingsMove } from "@/lib/savings-repo";
import { savingsBalance } from "@/lib/savings";
import { savingsSchema } from "@/lib/savings-input";
import { formatMoney } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

/** PATCH { amount, method, note, date }: edits a move (its expense / income follows). */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const parsed = savingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const move = await getSavingsMove(id);
  if (!move) return NextResponse.json({ error: "Opération introuvable." }, { status: 404 });
  const amount = Math.round(parsed.data.amount * 100) / 100;
  if (move.kind === "out" && amount > move.amount) {
    // Taking more out: the savings must hold it.
    const [moves, payments] = await Promise.all([getAllSavingsMoves(), getAllPayments()]);
    const available = savingsBalance(moves, payments) + move.amount;
    if (amount > available + 1e-9) {
      return NextResponse.json({ error: `Il n'y a que ${formatMoney(available)} dans l'épargne.` }, { status: 400 });
    }
  }
  const updated = await updateSavingsMove(id, { amount, method: parsed.data.method, note: parsed.data.note, date: parsed.data.date ?? move.date });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const gone = await deleteSavingsMove(id);
  if (!gone) return NextResponse.json({ error: "Opération introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true, gone });
}
