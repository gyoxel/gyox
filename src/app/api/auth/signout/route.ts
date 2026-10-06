import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Déconnexion: forgets the session (the page then goes to /connexion). */
export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete({ name: SESSION_COOKIE, path: "/" });
  return response;
}
