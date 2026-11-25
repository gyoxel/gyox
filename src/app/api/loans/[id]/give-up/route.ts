import { NextResponse, type NextRequest } from "next/server";
import { getLoan } from "@/lib/page-data";
import { logActivity } from "@/lib/activity";
import { setLoanWrittenOff } from "@/lib/loans-repo";
import { todayDateStr } from "@/lib/date";

type Params = { params: Promise<{ id: string }> };

/** POST: what's left of the loan won't come back (it expects nothing more;
 *  what's left stays spent, in the month it was lent). DELETE: expected again. */
export async function POST(_req: NextRequest, { params }: Params) {
  const ok = await setLoanWrittenOff((await params).id, todayDateStr());
  const loan = ok ? await getLoan((await params).id) : null;
  if (loan) await logActivity({ kind: "loan", action: "giveup", name: loan.name, amount: loan.amount, detail: loan.person });
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Introuvable." }, { status: 404 });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const ok = await setLoanWrittenOff((await params).id, null);
  const loan = ok ? await getLoan((await params).id) : null;
  if (loan) await logActivity({ kind: "loan", action: "undo", name: loan.name, amount: loan.amount, detail: loan.person });
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Introuvable." }, { status: 404 });
}
