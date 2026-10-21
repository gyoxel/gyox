// Solde: the money in cash and on the card, built from everything recorded
// with its method — salaries received, advances, extra incomes, daret
// payouts in; expense / credit payments out; plus transfers between the two
// and adjustments to the real amount. Pure (no DB access).
import { displayIcon } from "./category";
import { daretPayout } from "./daret";
import { GROUPS } from "./category-stats";
import { incomeCategory } from "./income";
import { loanRemaining, loanToRepay } from "./loans";
import { savingsBalance } from "./savings";
import { msg } from "./i18n";
import type {
  Category,
  DaretWithExpense,
  Expense,
  Goal,
  Income,
  Loan,
  Payment,
  PaymentMethod,
  SalaryAdvance,
  SalaryReceipt,
  SavingsMove,
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
  | "savings"
  | "loan"
  | "transfer"
  | "adjust";

export interface WalletEntry {
  id: string;
  kind: EntryKind;
  /** ISO timestamp. */
  at: string;
  emoji: string;
  /** In French; the app's own wording also as `say`, to show it in the
   *  device's language (a name typed by the user stays as typed). */
  label: string;
  say?: { text: string; vars?: Record<string, string>; period?: string };
  /** Signed change per account (a transfer moves money out of one, into the other). */
  lines: { account: PaymentMethod; amount: number }[];
  /** Page to open it, when it has one. */
  href?: string;
  /** Transfers / adjustments can be deleted from the history. */
  opId?: string;
  /** Its category, to filter the history. */
  group: EntryGroup;
}

/** An entry's category: the user's own (an expense's, an income's), or
 *  what the app made it from (Salaire, Épargne, Dettes…). */
export interface EntryGroup {
  /** A category's id (an income category's: "in:" + it), or the app's group. */
  key: string;
  /** The user's category name, or (`own` false) the app's French word, to
   *  translate where it's shown. */
  label: string;
  own: boolean;
  emoji: string;
}

const appGroup = (key: keyof typeof GROUPS): EntryGroup => ({ key, label: GROUPS[key].label, own: false, emoji: GROUPS[key].emoji });
const SALARY_GROUP: EntryGroup = { key: "salary", label: msg("Salaire"), own: false, emoji: "💼" };
const INTERNAL_GROUP: EntryGroup = { key: "internal", label: msg("Transferts et ajustements"), own: false, emoji: "🔁" };

export interface WalletSummary {
  balance: Record<PaymentMethod, number>;
  /** Solde actuel: cash + card (the savings aren't in it). */
  total: number;
  /** Épargne: put aside, outside the Solde. */
  savings: number;
  /** In / out of each account during `month` ("YYYY-MM"), transfers
   *  excluded; money lent only for what hasn't come back, what comes back
   *  not as money in. */
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
  /** Épargne and Prêts: their expenses / incomes open their own page. */
  savingsMoves?: SavingsMove[];
  loans?: Loan[];
  /** For the incomes' emoji (the user's own categories). */
  incomeCategories?: Category[];
  /** The expenses' categories, for the history's filter. */
  categories?: Category[];
  categoryEmoji: Map<string, string>;
  month: string;
}): WalletSummary {
  const byId = new Map(input.expenses.map((e) => [e.id, e]));
  const entries: WalletEntry[] = [];
  // Expense / income id → the savings move or loan behind it.
  const source = new Map<string, { kind: EntryKind; href: string; group: EntryGroup }>();
  const loanExpenses = new Set<string>();
  for (const m of input.savingsMoves ?? []) {
    const link = { kind: "savings" as const, href: `/epargne/${m.id}`, group: appGroup("savings") };
    if (m.expenseId) source.set(m.expenseId, link);
    if (m.incomeId) source.set(m.incomeId, link);
  }
  for (const l of input.loans ?? []) {
    const link = { kind: "loan" as const, href: `/prets/${l.id}`, group: appGroup("loans") };
    if (l.expenseId) {
      source.set(l.expenseId, link);
      loanExpenses.add(l.expenseId);
    }
    for (const r of l.repayments) if (r.incomeId) source.set(r.incomeId, link);
  }
  // An expense's category; the ones the app makes, by what made them.
  const madeBy = new Map<string, keyof typeof GROUPS>();
  for (const g of input.goals ?? []) for (const d of g.deposits) if (d.expenseId) madeBy.set(d.expenseId, "savings");
  for (const d of input.darets) madeBy.set(d.expenseId, "darets");
  const categories = new Map((input.categories ?? []).map((c) => [c.id, c]));
  const expenseGroup = (e: Expense): EntryGroup => {
    const made = source.get(e.id)?.group ?? (madeBy.has(e.id) ? appGroup(madeBy.get(e.id)!) : null);
    if (made) return made;
    if (e.type === "credit") return appGroup("debts");
    const c = e.categoryId ? categories.get(e.categoryId) : undefined;
    return c ? { key: c.id, label: c.name, own: true, emoji: c.emoji } : appGroup("none");
  };
  const incomeGroup = (i: Income): EntryGroup => {
    const made = source.get(i.id)?.group;
    if (made) return made;
    // Money borrowed (a debt's), taken back from the savings, a loan given back.
    if (i.expenseId || i.category === "credit") return appGroup("debts");
    if (i.category === "epargne") return appGroup("savings");
    if (i.category === "pret") return appGroup("loans");
    const c = incomeCategory(i.category, input.incomeCategories);
    return { key: `in:${c.key}`, label: c.label, own: !c.system, emoji: c.emoji };
  };

  for (const r of input.receipts) {
    entries.push({
      id: `salary-${r.id}`,
      kind: "salary",
      at: r.createdAt,
      emoji: "💼",
      label: `Salaire ${periodLabel(r.period)}`,
      say: { text: msg("Salaire {period}"), period: r.period },
      lines: [{ account: r.method, amount: r.amount }],
      href: "/salary",
      group: SALARY_GROUP,
    });
  }
  for (const a of input.advances) {
    entries.push({
      id: `advance-${a.id}`,
      kind: "advance",
      at: a.createdAt,
      emoji: "🤲",
      label: `Avance sur salaire ${periodLabel(a.period)}`,
      say: { text: msg("Avance sur salaire {period}"), period: a.period },
      lines: [{ account: a.method, amount: a.amount }],
      href: "/salary",
      group: SALARY_GROUP,
    });
  }
  for (const i of input.incomes) {
    entries.push({
      id: `income-${i.id}`,
      kind: source.get(i.id)?.kind ?? "income",
      at: i.createdAt,
      emoji: incomeCategory(i.category, input.incomeCategories).emoji,
      label: i.name,
      lines: [{ account: i.method, amount: i.amount }],
      href: source.get(i.id)?.href ?? `/incomes/${i.id}`,
      group: incomeGroup(i),
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
      say: { text: msg("Daret reçue · {name}"), vars: { name: d.expense.name } },
      lines: [{ account: d.payoutMethod, amount: daretPayout(d) }],
      href: "/daret",
      group: appGroup("darets"),
    });
  }
  for (const p of input.payments) {
    const e = byId.get(p.expenseId);
    // A loan's money out comes from the loan itself (below): its expense
    // may show less in Dépenses, or be gone once all is given back.
    if (!e || !p.method || !countsInWallet(p, byId) || loanExpenses.has(e.id)) continue;
    entries.push({
      id: `payment-${p.id}`,
      kind: source.get(e.id)?.kind ?? (e.type === "credit" ? "credit" : "expense"),
      at: p.paidAt,
      emoji: displayIcon(e, input.categoryEmoji),
      label: e.name,
      lines: [{ account: p.method, amount: -p.amountPaid }],
      href: source.get(e.id)?.href ?? `/expenses/${e.id}`,
      group: expenseGroup(e),
    });
  }
  for (const l of input.loans ?? []) {
    if (!l.expenseId || !l.method) continue;
    entries.push({
      id: `loan-${l.id}`,
      kind: "loan",
      at: l.createdAt,
      emoji: "💸",
      label: `Argent prêté · ${l.name}`,
      lines: [{ account: l.method, amount: -loanToRepay(l) }],
      href: `/prets/${l.id}`,
      group: appGroup("loans"),
    });
  }
  for (const g of input.goals ?? []) {
    for (const d of g.deposits) {
      // (Newer deposits are a paid expense: that payment already counts;
      // one taken from the savings doesn't touch the Solde.)
      if (!d.method || d.method === "savings" || d.expenseId || !(d.amount > 0)) continue;
      entries.push({
        id: `goal-${d.id}`,
        kind: "goal",
        at: d.createdAt,
        emoji: g.emoji,
        label: `Versement · ${g.name}`,
        say: { text: msg("Versement · {name}"), vars: { name: g.name } },
        lines: [{ account: d.method, amount: -d.amount }],
        href: `/goals/${g.id}`,
        group: appGroup("savings"),
      });
    }
  }
  for (const o of input.ops) {
    if (!o.toAccount) continue;
    const transfer = o.kind === "transfer" && o.fromAccount;
    const opLabel = transfer
      ? o.toAccount === "card"
        ? msg("Versement sur la carte")
        : msg("Retrait en espèces")
      : msg("Ajustement du solde");
    entries.push({
      id: `op-${o.id}`,
      kind: o.kind,
      at: o.createdAt,
      emoji: transfer ? "🔁" : "✏️",
      label: o.note || opLabel,
      say: o.note ? undefined : { text: opLabel },
      lines: transfer
        ? [
            { account: o.fromAccount!, amount: -o.amount },
            { account: o.toAccount, amount: o.amount },
          ]
        : [{ account: o.toAccount, amount: o.amount }],
      opId: o.id,
      group: INTERNAL_GROUP,
    });
  }

  entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  const balance = { cash: 0, card: 0 };
  const monthIn = { cash: 0, card: 0 };
  const monthOut = { cash: 0, card: 0 };
  for (const e of entries) {
    for (const l of e.lines) {
      balance[l.account] += l.amount;
      // Money lent and given back: not the month's in and out (below).
      if (e.kind !== "transfer" && e.kind !== "adjust" && e.kind !== "loan" && e.at.slice(0, 7) === input.month) {
        if (l.amount > 0) monthIn[l.account] += l.amount;
        else monthOut[l.account] -= l.amount;
      }
    }
  }
  // Of a loan, the month it was lent: only what hasn't come back yet.
  for (const l of input.loans ?? []) {
    if (l.expenseId && l.method && l.date.slice(0, 7) === input.month) monthOut[l.method] += loanRemaining(l);
  }
  const r2 = (o: Record<PaymentMethod, number>) => ({
    cash: round(o.cash),
    card: round(o.card),
  });
  return {
    balance: r2(balance),
    total: round(balance.cash + balance.card),
    savings: savingsBalance(input.savingsMoves ?? [], input.payments),
    monthIn: r2(monthIn),
    monthOut: r2(monthOut),
    entries,
  };
}
