// The history window (the clock at the top of a page): the last money
// movements of that page — Dépenses' on Dépenses, Dettes' on Dettes… —
// newest first, the steps of one thing (a month paid in several times, a
// loan given back in several times) together on one row.
import type { WalletEntry } from "./wallet";

export const HISTORY_SCOPES = ["all", "expenses", "debts", "loans", "savings", "incomes", "darets", "salary"] as const;
export type HistoryScope = (typeof HISTORY_SCOPES)[number];

export type HistoryStep = Pick<WalletEntry, "id" | "at" | "kind" | "emoji" | "label" | "say" | "lines" | "href">;

export interface HistoryRow extends HistoryStep {
  /** Its steps, oldest first, when there are several. */
  steps: HistoryStep[];
}

const IN_SCOPE: Record<HistoryScope, (e: WalletEntry) => boolean> = {
  all: () => true,
  expenses: (e) => e.kind === "expense" && e.group.key !== "darets" && e.group.key !== "savings",
  debts: (e) => e.kind === "credit" || (e.group.key === "debts" && e.kind === "income"),
  loans: (e) => e.kind === "loan",
  savings: (e) => e.kind === "savings" || e.kind === "goal" || e.group.key === "savings",
  incomes: (e) => e.kind === "salary" || e.kind === "advance" || (e.kind === "income" && e.group.key !== "debts" && e.group.key !== "savings"),
  darets: (e) => e.kind === "daret" || e.group.key === "darets",
  salary: (e) => e.kind === "salary" || e.kind === "advance",
};

const step = ({ id, at, kind, emoji, label, say, lines, href }: WalletEntry): HistoryStep => ({ id, at, kind, emoji, label, say, lines, href });

/** `entries` (newest first) of `scope`, as rows: the newest `limit`. */
export function historyRows(entries: WalletEntry[], scope: HistoryScope, limit = 60): HistoryRow[] {
  const rows: HistoryRow[] = [];
  const bySeries = new Map<string, HistoryRow>();
  for (const e of entries) {
    if (!IN_SCOPE[scope](e)) continue;
    const row = e.series ? bySeries.get(e.series) : undefined;
    if (row) {
      // An older step of a row already there (its newest step gave its place).
      row.steps.unshift(step(e));
      row.lines = row.lines.map((l, i) => (i === 0 ? { ...l, amount: Math.round((l.amount + e.lines[0].amount) * 100) / 100 } : l));
      continue;
    }
    if (rows.length >= limit) continue;
    const added: HistoryRow = { ...step(e), steps: [step(e)] };
    rows.push(added);
    if (e.series) bySeries.set(e.series, added);
  }
  for (const r of rows) if (r.steps.length === 1) r.steps = [];
  return rows;
}
