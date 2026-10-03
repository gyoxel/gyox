// Solde: the money in cash and on the card, built from everything recorded
// with its method — salaries received, advances, extra incomes, daret
// payouts in; expense / credit payments out; plus transfers between the two
// and adjustments to the real amount. Pure (no DB access).
import { displayIcon } from "./category";
import { daretPayout } from "./daret";
import { incomeCategory } from "./income";
import type {
  DaretWithExpense,
  Expense,
  Goal,
  Income,
  Payment,
  PaymentMethod,
  SalaryAdvance,
  SalaryReceipt,
  WalletOp,
} from "./types";

export type EntryKind =
  | "salary"
  | "advance"
  | "income"
  | "daret"
  | "expense"
  | "credit"
  | "goal"
  | "transfer"
  | "adjust";

export interface WalletEntry {
  id: string;
  kind: EntryKind;
  /** ISO timestamp. */
  at: string;
  emoji: string;
  label: string;
  /** Signed change per account (a transfer moves money out of one, into the other). */
  lines: { account: PaymentMethod; amount: number }[];
  /** Page to open it, when it has one. */
  href?: string;
  /** Transfers / adjustments can be deleted from the history. */
  opId?: string;
}

export interface WalletSummary {
  balance: Record<PaymentMethod, number>;
  total: number;
  /** In / out of each account during `month` ("YYYY-MM"), transfers excluded. */
  monthIn: Record<PaymentMethod, number>;
  monthOut: Record<PaymentMethod, number>;
  /** Newest first. */
  entries: WalletEntry[];
}

const round = (n: number) => Math.round(n * 100) / 100;
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const periodLabel = (period: string) => `${MONTHS[Number(period.slice(5, 7)) - 1]} ${period.slice(0, 4)}`;

/** Whether a payment moves money in the Solde (it has its cash / card). */
function countsInWallet(p: Payment, byId: ReadonlyMap<string, Expense>): boolean {
  return p.method != null && byId.has(p.expenseId) && p.amountPaid > 0;
}

/** What the payments take off each account: lets the home page move
 *  Disponible instantly while a tick is still being saved. */
export function walletPaidOut(payments: Payment[], expenses: Expense[]): Record<PaymentMethod, number> {
  const byId = new Map(expenses.map((e) => [e.id, e]));
  const out = { cash: 0, card: 0 };
  for (const p of payments) if (countsInWallet(p, byId)) out[p.method!] += p.amountPaid;
  return out;
}

export function buildWallet(input: {
  receipts: SalaryReceipt[];
  advances: SalaryAdvance[];
  incomes: Income[];
  darets: DaretWithExpense[];
  payments: Payment[];
  expenses: Expense[];
  ops: WalletOp[];
  /** Their deposits taken from cash / the card come off the Solde. */
  goals?: Goal[];
  categoryEmoji: Map<string, string>;
  month: string;
}): WalletSummary {
  const byId = new Map(input.expenses.map((e) => [e.id, e]));
  const entries: WalletEntry[] = [];

  for (const r of input.receipts) {
    entries.push({
      id: `salary-${r.id}`,
      kind: "salary",
      at: r.createdAt,
      emoji: "💼",
      label: `Salaire ${periodLabel(r.period)}`,
      lines: [{ account: r.method, amount: r.amount }],
      href: "/salary",
    });
  }
  for (const a of input.advances) {
    entries.push({
      id: `advance-${a.id}`,
      kind: "advance",
      at: a.createdAt,
      emoji: "🤲",
      label: `Avance sur salaire ${periodLabel(a.period)}`,
      lines: [{ account: a.method, amount: a.amount }],
      href: "/salary",
    });
  }
  for (const i of input.incomes) {
    entries.push({
      id: `income-${i.id}`,
      kind: "income",
      at: i.createdAt,
      emoji: incomeCategory(i.category).emoji,
      label: i.name,
      lines: [{ account: i.method, amount: i.amount }],
      href: `/incomes/${i.id}`,
    });
  }
  for (const d of input.darets) {
    if (!d.payoutMethod || !d.payoutReceivedAt) continue;
    entries.push({
      id: `daret-${d.id}`,
      kind: "daret",
      at: d.payoutReceivedAt,
      emoji: "🤝🏻",
      label: `Daret reçue · ${d.expense.name}`,
      lines: [{ account: d.payoutMethod, amount: daretPayout(d) }],
      href: "/daret",
    });
  }
  for (const p of input.payments) {
    const e = byId.get(p.expenseId);
    if (!e || !p.method || !countsInWallet(p, byId)) continue;
    entries.push({
      id: `payment-${p.id}`,
      kind: e.type === "credit" ? "credit" : "expense",
      at: p.paidAt,
      emoji: displayIcon(e, input.categoryEmoji),
      label: e.name,
      lines: [{ account: p.method, amount: -p.amountPaid }],
      href: `/expenses/${e.id}`,
    });
  }
  for (const g of input.goals ?? []) {
    for (const d of g.deposits) {
      // (Newer deposits are a paid expense: that payment already counts.)
      if (!d.method || d.expenseId || !(d.amount > 0)) continue;
      entries.push({
        id: `goal-${d.id}`,
        kind: "goal",
        at: d.createdAt,
        emoji: g.emoji,
        label: `Versement · ${g.name}`,
        lines: [{ account: d.method, amount: -d.amount }],
        href: `/goals/${g.id}`,
      });
    }
  }
  for (const o of input.ops) {
    if (!o.toAccount) continue;
    const transfer = o.kind === "transfer" && o.fromAccount;
    entries.push({
      id: `op-${o.id}`,
      kind: o.kind,
      at: o.createdAt,
      emoji: transfer ? "🔁" : "✏️",
      label:
        o.note ||
        (transfer ? (o.toAccount === "card" ? "Versement sur la carte" : "Retrait en cash") : "Ajustement du solde"),
      lines: transfer
        ? [
            { account: o.fromAccount!, amount: -o.amount },
            { account: o.toAccount, amount: o.amount },
          ]
        : [{ account: o.toAccount, amount: o.amount }],
      opId: o.id,
    });
  }

  entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  const balance = { cash: 0, card: 0 };
  const monthIn = { cash: 0, card: 0 };
  const monthOut = { cash: 0, card: 0 };
  for (const e of entries) {
    for (const l of e.lines) {
      balance[l.account] += l.amount;
      if (e.kind !== "transfer" && e.kind !== "adjust" && e.at.slice(0, 7) === input.month) {
        if (l.amount > 0) monthIn[l.account] += l.amount;
        else monthOut[l.account] -= l.amount;
      }
    }
  }
  const r2 = (o: Record<PaymentMethod, number>) => ({
    cash: round(o.cash),
    card: round(o.card),
  });
  return {
    balance: r2(balance),
    total: round(balance.cash + balance.card),
    monthIn: r2(monthIn),
    monthOut: r2(monthOut),
    entries,
  };
}
