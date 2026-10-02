import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { setDayNote } from "@/lib/repository";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const bodySchema = z.object({ text: z.string().max(2000) });

/** PUT { text }: saves the day's note (an empty text removes it). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!DATE.test(date)) return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json({ note: await setDayNote(date, parsed.data.text) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!DATE.test(date)) return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  await setDayNote(date, "");
  return NextResponse.json({ ok: true });
}
