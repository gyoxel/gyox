import type { MonthId } from "./date";

export type ExpenseType = "permanent" | "temporary" | "credit";
export type Frequency = "monthly" | "one-time";
export type ColorCategory = "blue" | "red" | "yellow";
export type CreditStatus = "not-started" | "in-progress" | "completed";

export interface Expense {
  id: string;
  name: string;
  /** Monthly payment amount, or the one-time amount. */
  amount: number;
  type: ExpenseType;
  frequency: Frequency;
  /** "YYYY-MM-DD" */
  startDate: string;
  /** "YYYY-MM-DD" or null. Ignored for credits (computed) and for expenses linked to a credit. */
  endDate: string | null;
  active: boolean;
  color: ColorCategory;
  notes: string | null;
  /** Remaining debt as of startDate. Required when type === "credit". */
  creditInitialAmount: number | null;
  /** When set, this expense's end date follows the linked expense's (usually a credit). */
  linkedExpenseId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseInput = Omit<Expense, "id" | "createdAt" | "updatedAt">;

export interface Settings {
  salary: number;
  currency: string;
  savingsTarget: number;
  /** "YYYY-MM" earliest navigable month */
  startMonth: string;
  theme: "light" | "dark" | "system";
}

export interface MonthlyOccurrence {
  expense: Expense;
  amount: number;
  isFinalCreditPayment?: boolean;
  remainingAfter?: number | null;
}

export interface MonthSummary {
  month: MonthId;
  monthKey: string;
  label: string;
  salary: number;
  occurrences: MonthlyOccurrence[];
  totalExpenses: number;
  totalPermanent: number;
  totalCredit: number;
  totalTemporary: number;
  remaining: number;
}

export interface CreditProgress {
  paid: number;
  remaining: number;
  status: CreditStatus;
  nextPaymentMonth: MonthId | null;
  nextPaymentAmount: number;
  endMonth: MonthId | null;
  totalMonths: number;
}
