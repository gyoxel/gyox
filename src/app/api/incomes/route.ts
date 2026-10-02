import { NextResponse, type NextRequest } from "next/server";
import { createIncome, getAllIncomes } from "@/lib/repository";
import { incomeInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getAllIncomes());
}

export async function POST(req: NextRequest) {
  const parsed = incomeInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(await createIncome(parsed.data), { status: 201 });
}
