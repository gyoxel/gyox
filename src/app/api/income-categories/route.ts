import { NextRequest, NextResponse } from "next/server";
import { createIncomeCategory, getIncomeCategories } from "@/lib/income-categories-repo";
import { categoryInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getIncomeCategories());
}

export async function POST(req: NextRequest) {
  const parsed = categoryInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(await createIncomeCategory(parsed.data), { status: 201 });
}
