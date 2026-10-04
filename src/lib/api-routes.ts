// The app's mutating API routes, callable in-process by the callApi Server
// Function (src/app/api-actions.ts) — see there for why.
import type { NextRequest } from "next/server";
import * as categories from "@/app/api/categories/route";
import * as categoriesById from "@/app/api/categories/[id]/route";
import * as categoriesOrder from "@/app/api/categories/order/route";
import * as categoriesReset from "@/app/api/categories/reset/route";
import * as darets from "@/app/api/darets/route";
import * as daretsById from "@/app/api/darets/[id]/route";
import * as dayNotesByDate from "@/app/api/day-notes/[date]/route";
import * as expenses from "@/app/api/expenses/route";
import * as expensesById from "@/app/api/expenses/[id]/route";
import * as expensesByIdPayments from "@/app/api/expenses/[id]/payments/route";
import * as goalIdeas from "@/app/api/goal-ideas/route";
import * as goalIdeasById from "@/app/api/goal-ideas/[id]/route";
import * as goals from "@/app/api/goals/route";
import * as goalsById from "@/app/api/goals/[id]/route";
import * as goalsByIdDeposits from "@/app/api/goals/[id]/deposits/route";
import * as goalsByIdDepositsByDepositId from "@/app/api/goals/[id]/deposits/[depositId]/route";
import * as incomeCategories from "@/app/api/income-categories/route";
import * as incomeCategoriesById from "@/app/api/income-categories/[id]/route";
import * as incomeCategoriesOrder from "@/app/api/income-categories/order/route";
import * as incomeCategoriesReset from "@/app/api/income-categories/reset/route";
import * as incomes from "@/app/api/incomes/route";
import * as incomesById from "@/app/api/incomes/[id]/route";
import * as loans from "@/app/api/loans/route";
import * as loansById from "@/app/api/loans/[id]/route";
import * as loansByIdRepayments from "@/app/api/loans/[id]/repayments/route";
import * as loansByIdRepaymentsBySlot from "@/app/api/loans/[id]/repayments/[slot]/route";
import * as salaryAdvances from "@/app/api/salary-advances/route";
import * as salaryAdvancesById from "@/app/api/salary-advances/[id]/route";
import * as savings from "@/app/api/savings/route";
import * as savingsById from "@/app/api/savings/[id]/route";
import * as settings from "@/app/api/settings/route";
import * as wallet from "@/app/api/wallet/route";
import * as walletById from "@/app/api/wallet/[id]/route";

type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
type RouteModule = Partial<Record<"POST" | "PATCH" | "PUT" | "DELETE", unknown>>;

const ROUTES: [string, RouteModule][] = [
  ["categories", categories],
  ["categories/[id]", categoriesById],
  ["categories/order", categoriesOrder],
  ["categories/reset", categoriesReset],
  ["darets", darets],
  ["darets/[id]", daretsById],
  ["day-notes/[date]", dayNotesByDate],
  ["expenses", expenses],
  ["expenses/[id]", expensesById],
  ["expenses/[id]/payments", expensesByIdPayments],
  ["goal-ideas", goalIdeas],
  ["goal-ideas/[id]", goalIdeasById],
  ["goals", goals],
  ["goals/[id]", goalsById],
  ["goals/[id]/deposits", goalsByIdDeposits],
  ["goals/[id]/deposits/[depositId]", goalsByIdDepositsByDepositId],
  ["income-categories", incomeCategories],
  ["income-categories/[id]", incomeCategoriesById],
  ["income-categories/order", incomeCategoriesOrder],
  ["income-categories/reset", incomeCategoriesReset],
  ["incomes", incomes],
  ["incomes/[id]", incomesById],
  ["loans", loans],
  ["loans/[id]", loansById],
  ["loans/[id]/repayments", loansByIdRepayments],
  ["loans/[id]/repayments/[slot]", loansByIdRepaymentsBySlot],
  ["salary-advances", salaryAdvances],
  ["salary-advances/[id]", salaryAdvancesById],
  ["savings", savings],
  ["savings/[id]", savingsById],
  ["settings", settings],
  ["wallet", wallet],
  ["wallet/[id]", walletById],
];

const COMPILED = ROUTES.map(([pattern, mod]) => ({ segments: pattern.split("/"), mod }))
  // Literal segments win over dynamic ones ("categories/order" before "categories/[id]").
  .sort((a, b) => dynamicCount(a.segments) - dynamicCount(b.segments));

function dynamicCount(segments: string[]) {
  return segments.filter((s) => s.startsWith("[")).length;
}

/** The handler for `method` on `pathname` (e.g. "/api/expenses/abc"), with its params. */
export function findApiHandler(method: string, pathname: string): { handler: Handler; params: Record<string, string> } | null {
  if (!pathname.startsWith("/api/")) return null;
  const parts = pathname.slice(5).split("/");
  for (const { segments, mod } of COMPILED) {
    if (segments.length !== parts.length) continue;
    const params: Record<string, string> = {};
    const matches = segments.every((seg, i) => {
      if (seg.startsWith("[")) {
        params[seg.slice(1, -1)] = decodeURIComponent(parts[i]);
        return parts[i] !== "";
      }
      return seg === parts[i];
    });
    const handler = mod[method as keyof RouteModule];
    if (matches) return typeof handler === "function" ? { handler: handler as Handler, params } : null;
  }
  return null;
}
