// Each page's colour: its header, and the browser's bar (theme-color) so
// the app looks full screen. Matches the section colours used elsewhere.
export const HOME_COLOR = "#019c86";

const PAGE_COLORS: [prefix: string, color: string][] = [
  ["/budget", "#e11d48"],
  ["/expenses", "#e11d48"],
  ["/credits", "#2563eb"],
  ["/menu", "#7c3aed"],
  ["/incomes", "#059669"],
  ["/solde", "#4f46e5"],
  ["/daret", "#0d9488"],
  ["/goals", "#ea580c"],
  ["/stats", "#0284c7"],
  ["/calendar", "#db2777"],
  ["/categories", "#9333ea"],
  ["/salary", "#0891b2"],
  ["/settings", "#334155"],
];

/** The colour of the page at `pathname`. */
export function pageColor(pathname: string): string {
  return PAGE_COLORS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? HOME_COLOR;
}

/** Credits (new or edited) are blue even under /expenses. */
export const CREDIT_COLOR = "#2563eb";
