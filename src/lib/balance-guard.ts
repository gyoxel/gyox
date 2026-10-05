// The Solde can't go below 0 DH: cash and the card each hold what they hold.
// Any change that would take one of them below zero — a payment, a transfer,
// money put aside, an income deleted… — is refused with what's left there.
import { NextResponse } from "next/server";
import { committedPrisma, inTransaction, prisma } from "./prisma";
import { insufficientMessage } from "./balance-message";
import type { PaymentMethod } from "./types";

type Balance = Record<PaymentMethod, number>;

// The same sums as buildWallet (wallet.ts), in one query.
const BALANCE_SQL = `
SELECT acct, COALESCE(SUM(amt), 0)::float8 AS total FROM (
  SELECT CASE WHEN method = 'cash' THEN 'cash' ELSE 'card' END AS acct, amount AS amt FROM salary_receipts
  UNION ALL SELECT CASE WHEN method = 'cash' THEN 'cash' ELSE 'card' END, amount FROM salary_advances
  UNION ALL SELECT CASE WHEN method = 'card' THEN 'card' ELSE 'cash' END, amount FROM incomes
  UNION ALL SELECT d."payoutMethod", ROUND((e.amount * d.members * 100)::numeric) / 100
    FROM darets d JOIN expenses e ON e.id = d."expenseId"
    WHERE d."payoutMethod" IN ('cash', 'card') AND d."payoutReceivedAt" IS NOT NULL
  UNION ALL SELECT p.method, -p."amountPaid" FROM payments p JOIN expenses e ON e.id = p."expenseId"
    WHERE p.method IN ('cash', 'card') AND p."amountPaid" > 0
  UNION ALL SELECT g.method, -g.amount FROM goal_deposits g
    WHERE g.method IN ('cash', 'card') AND g."expenseId" IS NULL AND g.amount > 0
  UNION ALL SELECT o."fromAccount", -o.amount FROM wallet_ops o
    WHERE o.kind = 'transfer' AND o."fromAccount" IN ('cash', 'card') AND o."toAccount" IN ('cash', 'card')
  UNION ALL SELECT o."toAccount", o.amount FROM wallet_ops o WHERE o."toAccount" IN ('cash', 'card')
) t GROUP BY acct`;

async function readBalance(client: typeof prisma): Promise<Balance> {
  const rows = await client.$queryRawUnsafe<{ acct: string; total: number }[]>(BALANCE_SQL);
  const balance: Balance = { cash: 0, card: 0 };
  for (const r of rows) if (r.acct === "cash" || r.acct === "card") balance[r.acct] = Math.round(Number(r.total) * 100) / 100;
  return balance;
}

/** Cash and card as recorded (the Solde page's numbers). */
export const currentBalance = () => readBalance(prisma);

class InsufficientBalance extends Error {
  constructor(
    readonly account: PaymentMethod,
    readonly available: number,
  ) {
    super("insufficient balance");
  }
}

const EPSILON = 0.005;

/**
 * Wraps a route handler: it runs in a transaction, and if it leaves cash or
 * the card below 0 — lower than it was before — everything it did is undone
 * and the request is refused (409) with what's left in that account. A
 * change that doesn't lower an account (or raises one still below zero from
 * older data) goes through.
 */
export function withBalanceGuard<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>,
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    // The state before, as committed: only needed if an account ends below 0.
    let before: Promise<Balance> | null = null;
    try {
      return await inTransaction(async () => {
        const res = await handler(...args);
        if (!res.ok) return res;
        const after = await readBalance(prisma);
        for (const account of ["cash", "card"] as const) {
          if (after[account] >= -EPSILON) continue;
          before ??= readBalance(committedPrisma);
          const was = (await before)[account];
          if (after[account] < was - EPSILON) throw new InsufficientBalance(account, was);
        }
        return res;
      });
    } catch (error) {
      if (error instanceof InsufficientBalance) {
        return NextResponse.json({ error: insufficientMessage(error.account, error.available) }, { status: 409 });
      }
      throw error;
    }
  };
}
