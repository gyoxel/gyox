import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { createCategory, getAllCategories } from "@/lib/repository";
import { categoryInputSchema } from "@/lib/validation";

export async function GET() {
  return NextResponse.json(await getAllCategories());
}

export async function POST(req: NextRequest) {
  const parsed = categoryInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const category = await createCategory(parsed.data);
  await logActivity({ kind: "category", action: "add", name: category.name });
  return NextResponse.json(category, { status: 201 });
}
