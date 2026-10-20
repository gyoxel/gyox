import { NextResponse, type NextRequest } from "next/server";
import { stopSavingsMove } from "@/lib/savings-repo";
import { withBalanceGuard } from "@/lib/balance-guard";

/** POST: stops putting aside every month (the months put aside stay). */
export const POST = withBalanceGuard(async function post(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stopped = await stopSavingsMove(id);
  if (!stopped) return NextResponse.json({ error: "Opération introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true, gone: stopped.gone });
});
