import { NextResponse, type NextRequest } from "next/server";
import { signInWithGoogle } from "@/lib/accounts";
import { CALLBACK_PATH, OAUTH_COOKIE, appOrigin, googleCredentials, safeNext, setSession } from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

/** Back from Google: check the answer, sign in (or up), and go on. */
export async function GET(request: NextRequest) {
  const origin = appOrigin(request);
  const failed = (reason: string) => {
    const response = NextResponse.redirect(new URL(`/connexion?erreur=${reason}`, origin));
    response.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth" });
    return response;
  };

  const params = request.nextUrl.searchParams;
  if (params.get("error")) return failed("annule");
  const credentials = googleCredentials();
  if (!credentials) return failed("config");
  let saved: { state?: string; verifier?: string; next?: string } = {};
  try {
    saved = JSON.parse(request.cookies.get(OAUTH_COOKIE)?.value ?? "{}");
  } catch {}
  const code = params.get("code");
  if (!code || !saved.state || !saved.verifier || params.get("state") !== saved.state) return failed("expire");

  // The code for the account's identity (straight from Google, over HTTPS:
  // the id token needs no signature check — OpenID Connect Core 3.1.3.7).
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      redirect_uri: origin + CALLBACK_PATH,
      grant_type: "authorization_code",
      code_verifier: saved.verifier,
    }),
    cache: "no-store",
  });
  if (!tokenResponse.ok) {
    console.warn(`[auth] token exchange failed: ${tokenResponse.status} ${(await tokenResponse.text()).slice(0, 200)}`);
    return failed("google");
  }
  const { id_token: idToken } = (await tokenResponse.json()) as { id_token?: string };
  let claims: Record<string, unknown> = {};
  try {
    claims = JSON.parse(Buffer.from(idToken?.split(".")[1] ?? "", "base64url").toString("utf8"));
  } catch {}
  const valid =
    claims.aud === credentials.clientId &&
    GOOGLE_ISSUERS.includes(String(claims.iss)) &&
    Number(claims.exp) * 1000 > Date.now() &&
    claims.email_verified === true &&
    typeof claims.sub === "string" &&
    typeof claims.email === "string";
  if (!valid) return failed("google");

  let userId: string;
  try {
    userId = await signInWithGoogle({
      sub: claims.sub as string,
      email: claims.email as string,
      name: typeof claims.name === "string" ? claims.name : null,
      picture: typeof claims.picture === "string" ? claims.picture : null,
    });
  } catch (error) {
    // Database unreachable: say so (Google's code is spent, a new tap starts over).
    console.error("[auth] sign-in failed:", error);
    return failed("serveur");
  }
  const response = NextResponse.redirect(new URL(safeNext(saved.next), origin));
  response.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth" });
  await setSession(response, request, userId);
  return response;
}
