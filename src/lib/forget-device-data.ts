// What this device keeps of someone's data: the tab snapshots (swipes), the
// salary reminder and the pages the service worker cached. Forgotten on
// Déconnexion and on the Connexion page, so the next account starts clean.
// The theme and the lock stay (they're the device's).
import { THEME_STORAGE_KEY } from "./theme";

const KEPT_KEYS = new Set([THEME_STORAGE_KEY, "gx-lock"]);

export async function forgetDeviceData(): Promise<void> {
  try {
    for (const key of Object.keys(localStorage)) if (!KEPT_KEYS.has(key)) localStorage.removeItem(key);
  } catch {}
  try {
    if ("caches" in window) await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
  } catch {}
}
