// The sign-in session: a cookie holding the user's id and an expiry, signed
// with AUTH_SECRET (HMAC-SHA256), so checking it needs no database query —
// in the proxy (src/proxy.ts) and on every query (lib/user-scope.ts).
// Web Crypto only: it runs anywhere.

export const SESSION_COOKIE = "gx_session";
/** Stays signed in a year (until Déconnexion). */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365;

const encoder = new TextEncoder();
let cachedKey: { secret: string; key: Promise<CryptoKey> } | null = null;

function signingKey(): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  if (cachedKey?.secret !== secret) {
    const key = crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
      "sign",
      "verify",
    ]);
    cachedKey = { secret, key };
  }
  return cachedKey.key;
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** "<userId>.<expires (unix s)>.<signature>" */
export async function createSessionToken(userId: string): Promise<string> {
  const payload = `${userId}.${Math.floor(Date.now() / 1000) + SESSION_MAX_AGE}`;
  const signature = await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(payload));
  return `${payload}.${toBase64Url(signature)}`;
}

/** The user id of a valid, unexpired token; null otherwise. */
export async function readSessionToken(token: string): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expires, signature] = parts;
  if (!userId || !(Number(expires) > Date.now() / 1000)) return null;
  const bytes = fromBase64Url(signature);
  if (!bytes) return null;
  try {
    const valid = await crypto.subtle.verify("HMAC", await signingKey(), bytes, encoder.encode(`${userId}.${expires}`));
    return valid ? userId : null;
  } catch {
    return null;
  }
}
