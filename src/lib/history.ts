// The history window (the clock at the top of a page): the last money
// movements of that page — Dépenses' on Dépenses, Dettes' on Dettes… —
// newest first, the steps of one thing (a month paid in several times, a
// loan given back in several times) together on one row.
import type { WalletEntry } from "./wallet";

export const HISTORY_SCOPES = ["all", "expenses", "debts", "loans", "savings", "incomes", "darets", "salary"] as const;
export type HistoryScope = (typeof HISTORY_SCOPES)[number];

export type HistoryStep = Pick<WalletEntry, "id" | "at" | "kind" | "emoji" | "label" | "say" | "lines" | "href"> & {
  /** Recorded without money moving (a debt added whose money was already
   *  had): its amount shown plain, neither + nor −. */
  neutral?: boolean;
};

/** What the window is made from: the Solde's movements, and debts added
 *  without money coming in. */
export type HistoryEntry = WalletEntry & { neutral?: boolean };

export interface HistoryRow extends HistoryStep {
  /** Its steps, oldest first, when there are several. */
  steps: HistoryStep[];
}

const IN_SCOPE: Record<HistoryScope, (e: HistoryEntry) => boolean> = {
  all: () => true,
  expenses: (e) => e.kind === "expense" && e.group.key !== "darets" && e.group.key !== "savings",
  debts: (e) => e.kind === "credit" || (e.group.key === "debts" && e.kind === "income"),
  loans: (e) => e.kind === "loan",
  savings: (e) => e.kind === "savings" || e.kind === "goal" || e.group.key === "savings",
  incomes: (e) => e.kind === "salary" || e.kind === "advance" || (e.kind === "income" && e.group.key !== "debts" && e.group.key !== "savings"),
  darets: (e) => e.kind === "daret" || e.group.key === "darets",
  salary: (e) => e.kind === "salary" || e.kind === "advance",
};

const step = ({ id, at, kind, emoji, label, say, lines, href, neutral }: HistoryEntry): HistoryStep => ({ id, at, kind, emoji, label, say, lines, href, ...(neutral ? { neutral } : {}) });

/** `entries` (newest first) of `scope`, as rows: the newest `limit`. */
export function historyRows(entries: HistoryEntry[], scope: HistoryScope, limit = 60): HistoryRow[] {
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

/** Debts added with no money coming in (it was already had): a line each in
 *  the window, at the time they were added, `entries` (newest first) kept
 *  in order. */
export function withAddedDebts(entries: WalletEntry[], debts: { id: string; name: string; at: string; total: number; emoji: string }[]): HistoryEntry[] {
  const added: HistoryEntry[] = debts.map((d) => ({
    id: `debt-${d.id}`,
    kind: "credit",
    at: d.at,
    emoji: d.emoji,
    label: d.name,
    lines: [{ account: "cash", amount: d.total }],
    group: { key: "debts", label: "Dettes", own: false, emoji: "🏦" },
    counted: 0,
    neutral: true,
  }));
  return [...entries, ...added].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
