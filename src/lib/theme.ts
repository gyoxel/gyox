export type ThemeChoice = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "gx-theme";

/** Runs before the page paints (inlined in the root layout) so the right
 *  theme shows from the first frame: the saved choice, or the system's. */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";var m=window.matchMedia("(prefers-color-scheme: dark)");var a=function(){document.documentElement.classList.toggle("dark",t==="dark"||(t==="system"&&m.matches))};a();if(t==="system"&&m.addEventListener)m.addEventListener("change",a)}catch(e){}})();`;

/** Applies a theme choice now and remembers it on this device. */
export function applyTheme(choice: ThemeChoice) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {}
  const dark = choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}
