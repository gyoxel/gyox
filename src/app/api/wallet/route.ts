import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createWalletOp, getAllWalletOps } from "@/lib/repository";

export const dynamic = "force-dynamic";

const account = z.enum(["cash", "card"]);
const bodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("transfer"),
    fromAccount: account,
    toAccount: account,
    amount: z.coerce.number().positive("Le montant doit être positif."),
    note: z.string().trim().max(80).nullable().default(null),
  }),
  z.object({
    kind: z.literal("adjust"),
    toAccount: account,
    /** Signed change bringing the account to its real amount. */
    amount: z.coerce.number().refine((n) => n !== 0, "Aucun changement."),
    note: z.string().trim().max(80).nullable().default(null),
  }),
]);

export async function GET() {
  return NextResponse.json(await getAllWalletOps());
}

/** POST a transfer (cash ⇄ card) or an adjustment of one account. */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const op = parsed.data;
  if (op.kind === "transfer" && op.fromAccount === op.toAccount) {
    return NextResponse.json({ error: "Choisis deux comptes différents." }, { status: 400 });
  }
  const created = await createWalletOp({
    kind: op.kind,
    fromAccount: op.kind === "transfer" ? op.fromAccount : null,
    toAccount: op.toAccount,
    amount: Math.round(op.amount * 100) / 100,
    note: op.note || null,
  });
  return NextResponse.json(created, { status: 201 });
}
