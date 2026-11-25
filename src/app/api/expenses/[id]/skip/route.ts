import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { findPayment } from "@/lib/engine";
import { getExpenseById, getPaymentsForExpense, setMonthSkipped } from "@/lib/repository";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({ monthKey: z.string().regex(/^\d{4}-\d{2}$/) });

/**
 * PUT { monthKey }: « pas ce mois-ci » — nothing to pay that month (0 DH);
 * a debt's installment moves a month later, and its end with it. Not on a
 * month already paid (in part or in full). DELETE ?monthKey=: undone.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Mois invalide." }, { status: 400 });
  const [expense, payments] = await Promise.all([getExpenseById(id), getPaymentsForExpense(id)]);
  if (!expense) return NextResponse.json({ error: "Dépense introuvable." }, { status: 404 });
  if (findPayment(payments, id, parsed.data.monthKey)) {
    return NextResponse.json({ error: "Ce mois est déjà payé : annule d'abord le paiement." }, { status: 409 });
  }
  const updated = await setMonthSkipped(id, parsed.data.monthKey, true);
  await logActivity({ kind: expense.type === "credit" ? "debt" : "expense", action: "skip", name: expense.name, amount: 0 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const key = req.nextUrl.searchParams.get("monthKey") ?? "";
  if (!/^\d{4}-\d{2}$/.test(key)) return NextResponse.json({ error: "Mois invalide." }, { status: 400 });
  const expense = await getExpenseById(id);
  if (!expense) return NextResponse.json({ error: "Dépense introuvable." }, { status: 404 });
  const updated = await setMonthSkipped(id, key, false);
  await logActivity({ kind: expense.type === "credit" ? "debt" : "expense", action: "unskip", name: expense.name });
  return NextResponse.json(updated);
}
