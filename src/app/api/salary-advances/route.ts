import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSalaryAdvance, getAllSalaryAdvances } from "@/lib/repository";
import { withBalanceGuard } from "@/lib/balance-guard";

const bodySchema = z.object({
  amount: z.coerce.number().positive("Le montant doit être positif."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  method: z.enum(["cash", "card"]).default("card"),
});

export async function GET() {
  return NextResponse.json(await getAllSalaryAdvances());
}

/** POST { amount, date, period, method }: an advance on the salary of `period`. */
export const POST = withBalanceGuard(async function post(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(await createSalaryAdvance(parsed.data), { status: 201 });
});
