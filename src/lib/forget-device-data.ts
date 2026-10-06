// What this device keeps of someone's data: the tab snapshots (swipes), the
// salary reminder and the pages the service worker cached. Forgotten on
// Déconnexion and on the Connexion page, so the next account starts clean.
// The theme stays (it's the device's).
const KEPT_KEYS = new Set(["gx-theme"]);

export async function forgetDeviceData(): Promise<void> {
  try {
    for (const key of Object.keys(localStorage)) if (!KEPT_KEYS.has(key)) localStorage.removeItem(key);
  } catch {}
  try {
    if ("caches" in window) await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
  } catch {}
}
