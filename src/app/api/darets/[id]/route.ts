import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { deleteDaret, getDaretById, pagesGoneWithExpenses, setDaretPayout, updateDaret } from "@/lib/repository";
import { daretDates, daretInputSchema } from "@/lib/daret-input";
import { withBalanceGuard } from "@/lib/balance-guard";

export const DELETE = withBalanceGuard(async function remove(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const daret = await getDaretById(id);
  const gone = daret ? await pagesGoneWithExpenses([daret.expenseId]) : [];
  const ok = await deleteDaret(id);
  if (!ok) return NextResponse.json({ error: "Daret introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true, gone });
});

const patchSchema = z.object({
  payoutMethod: z.enum(["cash", "card"]).nullable(),
});

/**
 * PATCH { payoutMethod }: the payout collected in cash / card, or null to undo.
 * PATCH { name, amount, members, startMonth, turnMonth }: edits the daret.
 */
export const PATCH = withBalanceGuard(async function patch(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (body && typeof body === "object" && !("payoutMethod" in body)) {
    const edit = daretInputSchema.safeParse(body);
    if (!edit.success) return NextResponse.json({ error: edit.error.flatten() }, { status: 400 });
    const dates = daretDates(edit.data);
    if (typeof dates === "string") {
      return NextResponse.json({ error: { formErrors: [dates], fieldErrors: {} } }, { status: 400 });
    }
    const { name, amount, members, turnMonth } = edit.data;
    const daret = await updateDaret(id, { name, amount, members, ...dates, turnMonth });
    if (!daret) return NextResponse.json({ error: "Daret introuvable." }, { status: 404 });
    return NextResponse.json(daret);
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const ok = await setDaretPayout(id, parsed.data.payoutMethod);
  if (!ok) return NextResponse.json({ error: "Daret introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
});
