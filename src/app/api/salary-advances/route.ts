import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSalaryAdvance, getAllSalaryAdvances } from "@/lib/repository";

const bodySchema = z.object({
  amount: z.coerce.number().positive("Le montant doit être positif."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period: z.string().regex(/^\d{4}-\d{2}$/),
});

export async function GET() {
  return NextResponse.json(await getAllSalaryAdvances());
}

/** POST { amount, date, period }: an advance on the salary of `period`. */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(await createSalaryAdvance(parsed.data), { status: 201 });
}
