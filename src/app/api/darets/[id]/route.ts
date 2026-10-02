import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { deleteDaret, setDaretPayout } from "@/lib/repository";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteDaret(id);
  if (!ok) return NextResponse.json({ error: "Daret introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

const patchSchema = z.object({
  payoutMethod: z.enum(["cash", "card"]).nullable(),
});

/** PATCH { payoutMethod }: the payout collected in cash / card, or null to undo. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const ok = await setDaretPayout(id, parsed.data.payoutMethod);
  if (!ok) return NextResponse.json({ error: "Daret introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
