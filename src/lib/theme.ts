/** "simple": light or dark like the system, with calm colours (plain
 *  headers and cards instead of the coloured ones). */
export type ThemeChoice = "light" | "dark" | "system" | "simple";

export const THEME_STORAGE_KEY = "gx-theme";

/** Colour of the plain headers in the simple theme (the browser's bar too). */
export const SIMPLE_HEADER = { light: "#ffffff", dark: "#0f172a" };

/** Runs before the page paints (inlined in the root layout) so the right
 *  theme shows from the first frame: the saved choice, or the system's. */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";var m=window.matchMedia("(prefers-color-scheme: dark)");var r=document.documentElement;var a=function(){r.classList.toggle("dark",t==="dark"||(t!=="light"&&t!=="dark"&&m.matches))};r.classList.toggle("simple",t==="simple");a();if((t==="system"||t==="simple")&&m.addEventListener)m.addEventListener("change",a)}catch(e){}})();`;

let followSystem: (() => void) | null = null;

/** Applies a theme choice now and remembers it on this device. */
export function applyTheme(choice: ThemeChoice) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {}
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () => root.classList.toggle("dark", choice === "dark" || (choice !== "light" && media.matches));
  root.classList.toggle("simple", choice === "simple");
  apply();
  if (followSystem) media.removeEventListener("change", followSystem);
  followSystem = null;
  if (choice === "system" || choice === "simple") {
    followSystem = apply;
    media.addEventListener("change", apply);
  }
}
