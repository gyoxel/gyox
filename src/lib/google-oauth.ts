// Sign-in with Google (OAuth 2.0 authorization code flow with PKCE). The
// redirect URIs registered in Google Cloud (project gx-salaire) are
// <origin>/api/auth/callback/google for gxsalaire.ma, test.gxsalaire.ma,
// gx-salaire.vercel.app and gx-salaire-test.vercel.app.
import type { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from "./session";

export const OAUTH_COOKIE = "gx_oauth";
export const CALLBACK_PATH = "/api/auth/callback/google";

/** The site's address as the browser sees it (test.gxsalaire.ma…). */
export function appOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return request.nextUrl.origin;
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export const isHttps = (request: NextRequest) => appOrigin(request).startsWith("https:");

/** Only a path of this site (never "//elsewhere" or a full URL). */
export function safeNext(value: string | null | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/";
}

export function googleCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function randomToken(bytes = 32): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString("base64url");
}

export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return Buffer.from(digest).toString("base64url");
}

/** Signs the user in on this response (the session cookie, for a year). */
export async function setSession(response: NextResponse, request: NextRequest, userId: string): Promise<void> {
  response.cookies.set(SESSION_COOKIE, await createSessionToken(userId), {
    httpOnly: true,
    secure: isHttps(request),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}
