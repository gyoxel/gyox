import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { createIncomeCategory, getIncomeCategories } from "@/lib/income-categories-repo";
import { categoryInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getIncomeCategories());
}

export async function POST(req: NextRequest) {
  const parsed = categoryInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const category = await createIncomeCategory(parsed.data);
  await logActivity({ kind: "category", action: "add", name: parsed.data.name });
  return NextResponse.json(category, { status: 201 });
}
