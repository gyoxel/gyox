import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { reorderPeople } from "@/lib/people-repo";

/** PUT { ids }: the list's new order. */
export async function PUT(req: NextRequest) {
  const parsed = z.object({ ids: z.array(z.string().min(1)).max(500) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  await reorderPeople(parsed.data.ids);
  return NextResponse.json({ ok: true });
}
