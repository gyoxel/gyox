import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addGoalDeposit, getGoalById } from "@/lib/repository";
import { todayDateStr } from "@/lib/date";

interface Params {
  params: Promise<{ id: string }>;
}

const depositSchema = z.object({
  name: z.string().trim().max(60).default(""),
  amount: z.coerce.number().positive("Le montant doit être positif."),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/** "+ Versement": money put aside for the goal, with an optional label. */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!(await getGoalById(id))) return NextResponse.json({ error: "Objectif introuvable." }, { status: 404 });
  const parsed = depositSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { name, amount, date } = parsed.data;
  const deposit = await addGoalDeposit(id, { name: name || "Versement", amount, date: date ?? todayDateStr() });
  return NextResponse.json(deposit, { status: 201 });
}
