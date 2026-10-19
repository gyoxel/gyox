// Accueil's bilan of the month just over: what came in and went out of
// cash and the card, what of it was put aside, and its biggest categories.
// Pure (no DB access).
import type { CategorySlice } from "./category-stats";
import type { WalletSummary } from "./wallet";

export interface MonthBilanData {
  /** The month it's about: "YYYY-MM". */
  monthKey: string;
  /** "Septembre 2026", in the device's language. */
  monthLabel: string;
  /** Money in and out of cash and the card that month (transfers aside). */
  moneyIn: number;
  moneyOut: number;
  /** Of what went out: put into the savings. */
  putAside: number;
  /** Its biggest categories, against the month before. */
  top: CategorySlice[];
}

/** Closed for that month on this device (a cookie: the server leaves it out). */
export const BILAN_COOKIE = "gx_bilan";

/** Shown the first days of a month. */
export const BILAN_DAYS = 7;

const round = (n: number) => Math.round(n * 100) / 100;

/** The bilan of `monthKey` from the Solde built for that month; null when
 *  nothing happened in it. */
export function buildMonthBilan(wallet: WalletSummary, slices: CategorySlice[], monthKey: string, monthLabel: string): MonthBilanData | null {
  const moneyIn = round(wallet.monthIn.cash + wallet.monthIn.card);
  const moneyOut = round(wallet.monthOut.cash + wallet.monthOut.card);
  let putAside = 0;
  for (const e of wallet.entries) {
    if (e.kind !== "savings" || e.at.slice(0, 7) !== monthKey) continue;
    for (const l of e.lines) if (l.amount < 0) putAside -= l.amount;
  }
  if (moneyIn === 0 && moneyOut === 0 && slices.length === 0) return null;
  return { monthKey, monthLabel, moneyIn, moneyOut, putAside: round(putAside), top: slices.slice(0, 3) };
}
