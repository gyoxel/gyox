import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAllPayments } from "@/lib/repository";
import { createSavingsMove, getAllSavingsMoves } from "@/lib/savings-repo";
import { savingsBalance } from "@/lib/savings";
import { todayDateStr } from "@/lib/date";
import { formatMoney } from "@/lib/utils";
import { savingsSchema } from "@/lib/savings-input";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getAllSavingsMoves());
}

/** POST { kind: "in" | "out", amount, method, note }: into / out of the savings. */
export async function POST(req: NextRequest) {
  const parsed = savingsSchema.extend({ kind: z.enum(["in", "out"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { kind, amount, method, note, date } = parsed.data;
  if (kind === "out") {
    const [moves, payments] = await Promise.all([getAllSavingsMoves(), getAllPayments()]);
    const balance = savingsBalance(moves, payments);
    if (amount > balance + 1e-9) {
      return NextResponse.json({ error: `Il n'y a que ${formatMoney(balance)} dans l'épargne.` }, { status: 400 });
    }
  }
  const move = await createSavingsMove({ kind, amount: Math.round(amount * 100) / 100, method, note, date: date ?? todayDateStr() });
  return NextResponse.json(move, { status: 201 });
}
