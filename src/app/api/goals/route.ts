import { NextRequest, NextResponse } from "next/server";
import { createGoal, getAllGoals } from "@/lib/repository";
import { goalInputSchema } from "@/lib/validation";

export async function GET() {
  return NextResponse.json(await getAllGoals());
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = goalInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  return NextResponse.json(await createGoal(parsed.data), { status: 201 });
}
