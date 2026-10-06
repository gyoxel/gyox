// Each page's colour: its header, and the browser's bar (theme-color) so
// the app looks full screen. Matches the section colours used elsewhere.
import { SIMPLE_HEADER } from "./theme";

export const HOME_COLOR = "#019c86";

const PAGE_COLORS: [prefix: string, color: string][] = [
  ["/budget", "#e11d48"],
  ["/expenses", "#e11d48"],
  ["/credits", "#2563eb"],
  ["/menu", "#7c3aed"],
  ["/incomes", "#059669"],
  ["/solde", "#4f46e5"],
  ["/epargne", "#65a30d"],
  ["/prets", "#b45309"],
  ["/daret", "#0d9488"],
  ["/goals", "#ea580c"],
  ["/stats", "#0284c7"],
  ["/calendar", "#db2777"],
  ["/categories", "#9333ea"],
  ["/salary", "#0891b2"],
  ["/settings", "#334155"],
  ["/profil", "#334155"],
  ["/admin", "#334155"],
  ["/confidentialite", "#334155"],
  ["/conditions", "#334155"],
];

/** The colour of the page at `pathname`. */
export function pageColor(pathname: string): string {
  return PAGE_COLORS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? HOME_COLOR;
}

/** Runs in <head> after THEME_BOOT_SCRIPT, before the first paint: the
 *  browser's bar already has the page's colour (the simple theme's plain
 *  header colour with it) instead of a default one until hydration. */
export const THEME_COLOR_BOOT_SCRIPT = `(function(){try{var c=${JSON.stringify(PAGE_COLORS)},p=location.pathname,v=${JSON.stringify(HOME_COLOR)};for(var i=0;i<c.length;i++){if(p===c[i][0]||p.indexOf(c[i][0]+"/")===0){v=c[i][1];break}}var r=document.documentElement;if(r.classList.contains("simple"))v=r.classList.contains("dark")?${JSON.stringify(SIMPLE_HEADER.dark)}:${JSON.stringify(SIMPLE_HEADER.light)};var m=document.createElement("meta");m.name="theme-color";m.content=v;document.head.appendChild(m)}catch(e){}})();`;

/** Credits (new or edited) are blue even under /expenses. */
export const CREDIT_COLOR = "#2563eb";
