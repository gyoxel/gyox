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
  /** Credits only: already repaid before being tracked in the app.
   *  Display-only (total = creditInitialAmount + this). */
  creditPriorPaid: number | null;
  /** When set, this expense's end date follows the linked expense's (usually a credit). */
  linkedExpenseId: string | null;
  /** Optional custom emoji shown in lists. Falls back to a generic icon
   *  derived from `color` (see CATEGORY_META) when not set. */
  icon: string | null;
  /** User-managed category (see Category), or null if uncategorized. */
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  /** Display order, ascending. */
  position: number;
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

/** An actual confirmed payment. Absence of a row means "not paid". */
export interface Payment {
  id: string;
  expenseId: string;
  /** "YYYY-MM": which month's occurrence this settles (non-credit only). */
  monthKey: string | null;
  /** 1-based installment number (credit only) — not tied to a calendar month. */
  slotIndex: number | null;
  amountDue: number;
  amountPaid: number;
  paidAt: string;
  createdAt: string;
}

export type PaymentStatus = "paid" | "unpaid" | "not-yet-due";

/** Real-time (payment-aware) state of a credit, as opposed to the old
 *  theoretical schedule (which assumed every payment happens on time). */
export interface CreditRealState {
  /** Total actually paid so far (sum of confirmed Payment rows). */
  paidTotal: number;
  /** creditInitialAmount - paidTotal, never negative. */
  remaining: number;
  /** Number of installments actually confirmed paid. */
  paidSlots: number;
  /** The next unpaid installment's amount, or 0 if nothing pending (finished
   *  or not yet started). */
  pendingAmount: number;
  /** True when the pending installment is already behind the calendar
   *  (should have been paid in an earlier month). */
  isOverdue: boolean;
  status: CreditStatus;
  /** Recalculated end month, pushed back by exactly the number of missed
   *  installments so far. */
  projectedEndMonth: MonthId | null;
  /** The calendar month the pending installment naturally falls in, had
   *  every prior one been paid exactly on schedule. Null once completed or
   *  not yet started. A given month only actually owes this installment
   *  once it reaches (or passes) dueMonth — a payment made ahead of
   *  schedule must not make earlier months look due too. */
  dueMonth: MonthId | null;
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


/** Daret-specific data; the monthly contribution itself lives on `expense`. */
export interface Daret {
  id: string;
  expenseId: string;
  /** Number of participants = number of months the daret runs. */
  members: number;
  /** "YYYY-MM": the month the user collects the pot. */
  turnMonth: string;
  createdAt: string;
}

export interface DaretWithExpense extends Daret {
  expense: Expense;
}
