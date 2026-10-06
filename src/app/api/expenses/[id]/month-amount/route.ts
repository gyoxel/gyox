import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDaretOfExpense, getDepositOfExpense, getExpenseById, getPaymentsForExpense, setMonthAmount } from "@/lib/repository";
import { getSavingsMoveOfExpense } from "@/lib/savings-repo";
import { getLoanOfExpense } from "@/lib/loans-repo";

interface Params {
  params: Promise<{ id: string }>;
}

const bodySchema = z.object({
  monthKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  /** null: back to the usual amount. */
  amount: z.number().min(0).max(1e9).nullable(),
});

/**
 * One month's own amount ("montant de ce mois"), for that month only; the
 * next ones keep the usual amount (a credit carries the difference over to
 * its last installment). Body: { monthKey, amount | null }.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  const { monthKey, amount } = parsed.data;

  const expense = await getExpenseById(id);
  if (!expense) return NextResponse.json({ error: "Dépense introuvable." }, { status: 404 });
  if (expense.frequency === "one-time" && expense.type !== "credit") {
    return NextResponse.json({ error: "Une dépense unique a déjà son propre montant." }, { status: 400 });
  }
  const [daret, deposit, move, loan] = await Promise.all([
    getDaretOfExpense(id),
    getDepositOfExpense(id),
    getSavingsMoveOfExpense(id),
    getLoanOfExpense(id),
  ]);
  if (daret || deposit || move || loan) {
    return NextResponse.json({ error: "Ce montant se change depuis là d'où vient la dépense." }, { status: 409 });
  }
  if (expense.type === "credit" && amount != null && amount <= 0) {
    return NextResponse.json({ error: "Une mensualité doit être de plus de 0." }, { status: 400 });
  }
  // A month already paid keeps the amount it was paid with.
  const payments = await getPaymentsForExpense(id);
  if (payments.some((p) => p.monthKey === monthKey)) {
    return NextResponse.json({ error: "Ce mois est déjà payé : décoche-le d'abord." }, { status: 409 });
  }

  const updated = await setMonthAmount(id, monthKey, amount);
  return NextResponse.json(updated);
}
