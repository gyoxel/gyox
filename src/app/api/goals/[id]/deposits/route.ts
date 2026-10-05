import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addGoalDeposit, getGoalById } from "@/lib/repository";
import { todayDateStr } from "@/lib/date";
import { withBalanceGuard } from "@/lib/balance-guard";

interface Params {
  params: Promise<{ id: string }>;
}

const depositSchema = z.object({
  name: z.string().trim().max(60).default(""),
  amount: z.coerce.number().positive("Le montant doit être positif."),
  method: z.enum(["cash", "card"]).nullable().default(null),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/** "+ Versement": money put aside for the goal (from cash or the card),
 *  with an optional label. */
export const POST = withBalanceGuard(async function post(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!(await getGoalById(id))) return NextResponse.json({ error: "Objectif introuvable." }, { status: 404 });
  const parsed = depositSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { name, amount, date, method } = parsed.data;
  const deposit = await addGoalDeposit(id, { name: name || "Versement", amount, date: date ?? todayDateStr(), method });
  return NextResponse.json(deposit, { status: 201 });
});
