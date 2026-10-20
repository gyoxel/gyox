import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/accounts";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

/** A device still signed in to an account deleted elsewhere: signed out,
 *  to Connexion (which says the account is gone). Any other visit: home. */
export async function GET(request: Request) {
  if (await currentAccount()) return NextResponse.redirect(new URL("/", request.url));
  const response = NextResponse.redirect(new URL("/connexion?compte=supprime", request.url));
  response.cookies.delete({ name: SESSION_COOKIE, path: "/" });
  return response;
}
