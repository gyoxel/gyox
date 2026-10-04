import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reorderIncomeCategories } from "@/lib/income-categories-repo";

const orderSchema = z.object({ ids: z.array(z.string().min(1)).max(200) });

export async function PUT(req: NextRequest) {
  const parsed = orderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  await reorderIncomeCategories(parsed.data.ids);
  return NextResponse.json({ ok: true });
}
