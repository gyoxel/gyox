import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSessionToken } from "@/lib/session";

/** Open without signing in: the sign-in page and what Google asks to be public. */
const PUBLIC_PAGES = new Set(["/connexion", "/confidentialite", "/conditions"]);

/**
 * Signed-in only: without a valid session, pages go to Connexion (and back
 * here after), the API answers 401. The data itself is scoped to the user
 * on every query (lib/user-scope.ts); this only keeps visitors out.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const signedIn = token ? (await readSessionToken(token)) !== null : false;

  if (pathname === "/connexion" && signedIn) return NextResponse.redirect(new URL("/", request.url));
  if (signedIn || PUBLIC_PAGES.has(pathname) || pathname.startsWith("/api/auth/") || pathname === "/api/health") {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/") || request.method !== "GET") {
    return NextResponse.json({ error: "Session expirée : reconnecte-toi." }, { status: 401 });
  }
  const login = new URL("/connexion", request.url);
  if (pathname !== "/") login.searchParams.set("suite", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Not the build's files, icons, manifest, service worker or link preview image.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json|sw.js|robots.txt|opengraph-image).*)"],
};
