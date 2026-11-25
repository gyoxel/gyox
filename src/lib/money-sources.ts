// Bilan → « D'où vient ton argent »: what came in that month (cash and the
// card), by where it came from — the salary, each income category, money
// borrowed (what's left of it once repaid the same month), savings taken
// back… — what the month's Entrées count (see WalletEntry.counted), so the
// list adds up to them. Pure.
import type { CategorySlice } from "./category-stats";
import { entryMonth, type WalletEntry } from "./wallet";

const round = (n: number) => Math.round(n * 100) / 100;

/** `entries`' money in during `monthKey`, by source, the largest first;
 *  `nameOf` gives an entry's name as shown. */
export function moneySources(entries: WalletEntry[], monthKey: string, previousKey: string, nameOf: (e: WalletEntry) => string): CategorySlice[] {
  const slices = new Map<string, CategorySlice>();
  const previous = new Map<string, number>();
  for (const e of entries) {
    if (!(e.counted > 0)) continue;
    const month = entryMonth(e);
    if (month === previousKey) previous.set(e.group.key, (previous.get(e.group.key) ?? 0) + e.counted);
    if (month !== monthKey) continue;
    const slice =
      slices.get(e.group.key) ??
      slices
        .set(e.group.key, { key: e.group.key, label: e.group.label, own: e.group.own, emoji: e.group.emoji, amount: 0, previous: 0, items: [] })
        .get(e.group.key)!;
    slice.amount = round(slice.amount + e.counted);
    slice.items.push({ id: e.id, name: nameOf(e), icon: e.emoji, amount: round(e.counted) });
  }
  return [...slices.values()]
    .map((s) => ({ ...s, previous: round(previous.get(s.key) ?? 0), items: s.items.sort((a, b) => b.amount - a.amount) }))
    .sort((a, b) => b.amount - a.amount);
}
