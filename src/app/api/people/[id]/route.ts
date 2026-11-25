import { NextResponse, type NextRequest } from "next/server";
import { logActivity } from "@/lib/activity";
import { z } from "zod";
import { deletePerson, getPeople, renamePerson } from "@/lib/people-repo";
import { isPersonBusy } from "@/lib/people-busy";

type Params = { params: Promise<{ id: string }> };
const nameSchema = z.object({ name: z.string().trim().min(1, "Indique un nom.").max(60) });

/** PATCH { name }: renamed (no debt or loan changes). */
export async function PATCH(req: NextRequest, { params }: Params) {
  const parsed = nameSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const person = await renamePerson((await params).id, parsed.data.name);
  if (person && person !== "taken") await logActivity({ kind: "person", action: "edit", name: person.name });
  if (person === "taken") return NextResponse.json({ error: "Ce nom est déjà dans la liste." }, { status: 409 });
  return person ? NextResponse.json(person) : NextResponse.json({ error: "Introuvable." }, { status: 404 });
}

/** DELETE: off the list (no debt or loan changes) — not while a debt or a
 *  loan of theirs is still going. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const id = (await params).id;
  if (await isPersonBusy(id)) return NextResponse.json({ error: "Une dette ou un prêt est encore en cours avec cette personne." }, { status: 409 });
  const before = (await getPeople()).find((p) => p.id === id);
  const ok = await deletePerson(id);
  if (ok && before) await logActivity({ kind: "person", action: "delete", name: before.name });
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Introuvable." }, { status: 404 });
}
