import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addGoalDeposit, getAllPayments, getGoalById } from "@/lib/repository";
import { getAllSavingsMoves } from "@/lib/savings-repo";
import { savingsBalance } from "@/lib/savings";
import { todayDateStr } from "@/lib/date";
import { formatMoney } from "@/lib/utils";
import { withBalanceGuard } from "@/lib/balance-guard";

interface Params {
  params: Promise<{ id: string }>;
}

const depositSchema = z.object({
  name: z.string().trim().max(60).default(""),
  amount: z.coerce.number().positive("Le montant doit être positif."),
  method: z.enum(["cash", "card", "savings"]).nullable().default(null),
  /** Every month (cash / card only): this month's paid now. */
  monthly: z.boolean().default(false),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/** "+ Versement": money put aside for the goal (from cash, the card or the
 *  savings — from cash / the card, maybe every month), with an optional label. */
export const POST = withBalanceGuard(async function post(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!(await getGoalById(id))) return NextResponse.json({ error: "Objectif introuvable." }, { status: 404 });
  const parsed = depositSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { name, amount, date, method, monthly } = parsed.data;
  if (method === "savings") {
    const [moves, payments] = await Promise.all([getAllSavingsMoves(), getAllPayments()]);
    const available = savingsBalance(moves, payments);
    if (amount > available + 1e-9) {
      return NextResponse.json({ error: `Il n'y a que ${formatMoney(available)} dans l'épargne.` }, { status: 400 });
    }
  }
  const deposit = await addGoalDeposit(id, {
    name: name || "Versement",
    amount,
    date: date ?? todayDateStr(),
    method,
    monthly: monthly && (method === "cash" || method === "card"),
  });
  return NextResponse.json(deposit, { status: 201 });
});
