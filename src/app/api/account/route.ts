import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";
import { signedInUserId } from "@/lib/user-scope";

export const dynamic = "force-dynamic";

/**
 * Supprimer mon compte: the signed-in account and everything in it (every
 * table's rows go with the user: ON DELETE CASCADE), then the session.
 * Asked for with { confirm: true }, so a stray request can't do it.
 */
export async function DELETE(request: Request) {
  const userId = await signedInUserId();
  if (!userId) return NextResponse.json({ error: "Session expirée : reconnecte-toi." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (body?.confirm !== true) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  await prisma.user.delete({ where: { id: userId } });

  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete({ name: SESSION_COOKIE, path: "/" });
  return response;
}
