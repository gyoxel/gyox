// Verrouillage: the app asks for the phone's fingerprint / Face ID (or its
// code) before showing anything, when it's opened and after a minute away.
// Kept per device: a WebAuthn credential of the phone itself (platform
// authenticator) whose id is remembered here. The fingerprint never leaves
// the phone: it only answers "yes, it's the owner". Signing out keeps the
// lock (it's the device's), so it can't be skipped by signing in again.
// Only in the installed app (home screen): in Chrome or Safari the site
// neither offers it nor asks for it.
import { SIGNED_OUT_PAGES } from "./signed-out-pages";

const LOCK_KEY = "gx-lock";
/** Away longer than this, the app locks again. */
export const LOCK_AFTER_MS = 60_000;

interface LockConfig {
  /** The credential's id, base64url. */
  id: string;
  since: string;
}

// The installed app: opened from the home screen, not in a browser tab.
const INSTALLED = `(matchMedia("(display-mode: standalone)").matches||matchMedia("(display-mode: fullscreen)").matches||navigator.standalone===true)`;

/** Locks the page before it shows, when the lock is on (in <head>). */
export const LOCK_BOOT_SCRIPT = `(function(){try{if(!localStorage.getItem("${LOCK_KEY}"))return;if(!${INSTALLED})return;if(${JSON.stringify(SIGNED_OUT_PAGES)}.indexOf(location.pathname)>=0)return;document.documentElement.classList.add("gx-locked")}catch(e){}})();`;

/** Opened as the installed app (home screen), not in Chrome / Safari. */
export function installedApp(): boolean {
  try {
    return (
      matchMedia("(display-mode: standalone)").matches ||
      matchMedia("(display-mode: fullscreen)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

const toBase64Url = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

const challenge = () => crypto.getRandomValues(new Uint8Array(32));

function readLock(): LockConfig | null {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    return raw ? (JSON.parse(raw) as LockConfig) : null;
  } catch {
    return null;
  }
}

export const lockEnabled = () => readLock() !== null;

// Paramètres' switch follows the lock being turned on / off.
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());
export function subscribeLock(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** This page can be locked (the installed app, not the signed-out pages). */
export const lockablePage = () => installedApp() && !SIGNED_OUT_PAGES.includes(location.pathname);

/** Whether this device has a fingerprint / Face ID (or code) WebAuthn can use. */
export async function lockSupported(): Promise<boolean> {
  try {
    return typeof PublicKeyCredential !== "undefined" && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch {
    return false;
  }
}

/** Turns the lock on: the phone asks for the fingerprint / Face ID once to
 *  make the credential. False if refused or impossible. */
export async function enableLock(account: { id: string; email: string; name: string | null }): Promise<boolean> {
  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: challenge(),
        rp: { name: "GX Salaire" },
        user: { id: new TextEncoder().encode(account.id), name: account.email, displayName: account.name || account.email },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
        timeout: 60_000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;
    if (!credential) return false;
    localStorage.setItem(LOCK_KEY, JSON.stringify({ id: toBase64Url(credential.rawId), since: new Date().toISOString() } satisfies LockConfig));
    changed();
    return true;
  } catch {
    return false;
  }
}

export function disableLock() {
  try {
    localStorage.removeItem(LOCK_KEY);
  } catch {}
  document.documentElement.classList.remove("gx-locked");
  changed();
}

/** Asks the phone to confirm it's its owner; true once it did. */
export async function unlockDevice(): Promise<boolean> {
  const config = readLock();
  if (!config) return true;
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge(),
        allowCredentials: [{ type: "public-key", id: fromBase64Url(config.id), transports: ["internal"] }],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return assertion !== null;
  } catch {
    return false;
  }
}
