import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createGoalIdea, getAllGoalIdeas } from "@/lib/repository";

const ideaSchema = z.object({
  emoji: z.string().trim().min(1).max(16),
  name: z.string().trim().min(1, "Donne un nom.").max(40),
});

export async function GET() {
  return NextResponse.json(await getAllGoalIdeas());
}

export async function POST(req: NextRequest) {
  const parsed = ideaSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(await createGoalIdea(parsed.data), { status: 201 });
}
