import { NextResponse, type NextRequest } from "next/server";
import { setLoanWrittenOff } from "@/lib/loans-repo";
import { todayDateStr } from "@/lib/date";

type Params = { params: Promise<{ id: string }> };

/** POST: what's left of the loan won't come back (it expects nothing more;
 *  what's left stays spent, in the month it was lent). DELETE: expected again. */
export async function POST(_req: NextRequest, { params }: Params) {
  const ok = await setLoanWrittenOff((await params).id, todayDateStr());
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Introuvable." }, { status: 404 });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const ok = await setLoanWrittenOff((await params).id, null);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Introuvable." }, { status: 404 });
}
