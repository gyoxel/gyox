import { NextResponse, type NextRequest } from "next/server";
import { logActivity } from "@/lib/activity";
import { z } from "zod";
import { addPerson, getPeople } from "@/lib/people-repo";

const nameSchema = z.object({ name: z.string().trim().min(1, "Indique un nom.").max(60) });

export async function GET() {
  return NextResponse.json(await getPeople());
}

/** POST { name }: someone new (or the one who has that name already). */
export async function POST(req: NextRequest) {
  const parsed = nameSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const person = await addPerson(parsed.data.name);
  await logActivity({ kind: "person", action: "add", name: person.name });
  return NextResponse.json(person, { status: 201 });
}
