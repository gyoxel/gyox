/** Light, dark or like the system — each one also in "simple": calm colours
 *  (plain headers and cards instead of the coloured ones). "simple" alone
 *  is the simple version of the system's. */
export const THEME_CHOICES = ["light", "dark", "system", "simple", "simple-light", "simple-dark"] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];
export type ThemeBase = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "gx-theme";

/** Colour of the plain headers in the simple theme (the browser's bar too). */
export const SIMPLE_HEADER = { light: "#ffffff", dark: "#0f172a" };

export function parseTheme(choice: ThemeChoice): { base: ThemeBase; simple: boolean } {
  if (choice === "simple") return { base: "system", simple: true };
  if (choice.startsWith("simple-")) return { base: choice.slice(7) as ThemeBase, simple: true };
  return { base: choice as ThemeBase, simple: false };
}

export function composeTheme(base: ThemeBase, simple: boolean): ThemeChoice {
  if (!simple) return base;
  return base === "system" ? "simple" : `simple-${base}`;
}

/** Runs before the page paints (inlined in the root layout) so the right
 *  theme shows from the first frame: the saved choice, or the system's. */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";var s=t.indexOf("simple")===0;var b=t==="simple"?"system":t.replace("simple-","");var m=window.matchMedia("(prefers-color-scheme: dark)");var r=document.documentElement;var a=function(){r.classList.toggle("dark",b==="dark"||(b==="system"&&m.matches))};r.classList.toggle("simple",s);a();if(b==="system"&&m.addEventListener)m.addEventListener("change",a)}catch(e){}})();`;

let followSystem: (() => void) | null = null;

/** Applies a theme choice now and remembers it on this device. */
export function applyTheme(choice: ThemeChoice) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {}
  const { base, simple } = parseTheme(choice);
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () => root.classList.toggle("dark", base === "dark" || (base === "system" && media.matches));
  root.classList.toggle("simple", simple);
  apply();
  if (followSystem) media.removeEventListener("change", followSystem);
  followSystem = null;
  if (base === "system") {
    followSystem = apply;
    media.addEventListener("change", apply);
  }
}
