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
