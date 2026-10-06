import { NextResponse, type NextRequest } from "next/server";
import {
  CALLBACK_PATH,
  OAUTH_COOKIE,
  appOrigin,
  codeChallenge,
  googleCredentials,
  isHttps,
  randomToken,
  safeNext,
} from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

/** "Continuer avec Google": off to Google's account chooser. */
export async function GET(request: NextRequest) {
  const credentials = googleCredentials();
  if (!credentials) return NextResponse.redirect(new URL("/connexion?erreur=config", appOrigin(request)));
  const state = randomToken(16);
  const verifier = randomToken();
  const next = safeNext(request.nextUrl.searchParams.get("suite"));
  const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  google.search = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: appOrigin(request) + CALLBACK_PATH,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: await codeChallenge(verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  const response = NextResponse.redirect(google);
  // What the callback checks the answer against (10 minutes to choose).
  response.cookies.set(OAUTH_COOKIE, JSON.stringify({ state, verifier, next }), {
    httpOnly: true,
    secure: isHttps(request),
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 600,
  });
  return response;
}
