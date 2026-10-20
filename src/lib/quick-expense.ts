// Dépense rapide: the category and account used last on this device, so the
// next one starts there (a cookie: the page reads it before showing).
import type { PaymentMethod } from "./types";

export const QUICK_COOKIE = "gx_quick";
export const QUICK_HREF = "/expenses/quick";

/** "categoryId|method" → the last category and account (cash by default). */
export function readQuickCookie(value: string | undefined): { categoryId: string | null; method: PaymentMethod } {
  const [categoryId, method] = (value ?? "").split("|");
  return { categoryId: categoryId || null, method: method === "card" ? "card" : "cash" };
}
