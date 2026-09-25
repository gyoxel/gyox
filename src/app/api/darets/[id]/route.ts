import { NextResponse } from "next/server";
import { deleteDaret } from "@/lib/repository";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteDaret(id);
  if (!ok) return NextResponse.json({ error: "Daret introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
