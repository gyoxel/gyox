import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { deletePerson, renamePerson } from "@/lib/people-repo";

type Params = { params: Promise<{ id: string }> };
const nameSchema = z.object({ name: z.string().trim().min(1, "Indique un nom.").max(60) });

/** PATCH { name }: renamed (no debt or loan changes). */
export async function PATCH(req: NextRequest, { params }: Params) {
  const parsed = nameSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const person = await renamePerson((await params).id, parsed.data.name);
  if (person === "taken") return NextResponse.json({ error: "Ce nom est déjà dans la liste." }, { status: 409 });
  return person ? NextResponse.json(person) : NextResponse.json({ error: "Introuvable." }, { status: 404 });
}

/** DELETE: off the list (no debt or loan changes). */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const ok = await deletePerson((await params).id);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Introuvable." }, { status: 404 });
}
