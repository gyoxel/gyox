import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deleteGoal, getGoalById, updateGoal } from "@/lib/repository";
import { goalInputSchema } from "@/lib/validation";

interface Params {
  params: Promise<{ id: string }>;
}

// Any field of the goal, or `addToSaved` to record a deposit ("+ Versement").
const patchSchema = goalInputSchema.partial().extend({
  addToSaved: z.coerce.number().positive().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const current = await getGoalById(id);
  if (!current) return NextResponse.json({ error: "Objectif introuvable." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { addToSaved, ...fields } = parsed.data;
  // Only the fields actually sent (partial() still fills in defaults).
  const sent = Object.fromEntries(Object.entries(fields).filter(([k]) => body && k in body));
  if (addToSaved) sent.savedAmount = Math.round((current.savedAmount + addToSaved) * 100) / 100;

  const goal = await updateGoal(id, sent);
  if (!goal) return NextResponse.json({ error: "Modification impossible." }, { status: 400 });
  return NextResponse.json(goal);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const ok = await deleteGoal(id);
  if (!ok) return NextResponse.json({ error: "Objectif introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
