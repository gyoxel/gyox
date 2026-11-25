import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resetAll, resetMonth } from "@/lib/reset";
import { logActivity } from "@/lib/activity";

const bodySchema = z.object({
  scope: z.enum(["month", "all"]),
  /** Everything: expense / income categories back to the app's own. */
  categories: z.boolean().default(false),
  /** Everything: the Personnes list emptied. */
  people: z.boolean().default(false),
  /** Asked for on purpose (a stray request can't wipe anything). */
  confirm: z.literal(true),
});

/** POST: Menu → « Réinitialiser » (see lib/reset.ts). */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  const { scope, categories, people } = parsed.data;
  if (scope === "all") await resetAll({ categories, people });
  else await resetMonth();
  await logActivity({ kind: "reset", action: scope === "all" ? "delete" : "edit", name: scope === "all" ? "Tout" : "Ce mois-ci" });
  return NextResponse.json({ ok: true });
}
