import { NextRequest, NextResponse } from "next/server";
import { getSettings, syncSalaryReceipts, updateSettings } from "@/lib/repository";
import { settingsInputSchema } from "@/lib/validation";
import { withBalanceGuard } from "@/lib/balance-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getSettings());
}

export const PATCH = withBalanceGuard(async function patch(req: NextRequest) {
  const body = await req.json();
  const before = await getSettings();
  const merged = { ...before, ...body };
  const parsed = settingsInputSchema.safeParse(merged);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const settings = await updateSettings(parsed.data);
  // "Salaire reçu" (or its undo): record / remove it in the Solde history.
  await syncSalaryReceipts(before.salaryReceivedMonth, settings.salaryReceivedMonth, settings);
  return NextResponse.json(settings);
});
