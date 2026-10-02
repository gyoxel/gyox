import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number, currency = "MAD"): string {
  const rounded = Math.round(amount * 100) / 100;
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rounded);
  const suffix = currency === "MAD" ? "DH" : currency;
  return `${formatted} ${suffix}`;
}

export function formatSignedMoney(amount: number, currency = "MAD"): string {
  const sign = amount > 0 ? "+" : "";
  return `${sign}${formatMoney(amount, currency)}`;
}

/**
 * Money typed by hand: keeps digits and a single decimal separator — a
 * comma (French keyboards) or a dot — with at most 2 decimals. Used with
 * text inputs (inputMode="decimal"): a type="number" input rejects "12,5"
 * as invalid and empties itself.
 */
export function cleanDecimalInput(raw: string): string {
  const s = raw.replace(/[^\d.,]/g, "");
  const sep = s.search(/[.,]/);
  if (sep < 0) return s;
  return s.slice(0, sep + 1) + s.slice(sep + 1).replace(/[.,]/g, "").slice(0, 2);
}

/** Number value of a cleanDecimalInput string ("12,5" → 12.5; "" → 0). */
export function parseDecimalInput(value: string): number {
  return Number(value.replace(",", ".")) || 0;
}

/** A stored amount as shown in a decimal input, with a French comma. */
export function toDecimalInput(value: number | null | undefined): string {
  return value == null ? "" : String(value).replace(".", ",");
}
