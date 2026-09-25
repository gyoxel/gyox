"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Pencil } from "lucide-react";
import type { PaymentStatus } from "@/lib/types";
import { expenseIcon } from "@/lib/category";
import { formatMoney, cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { DeleteExpenseButton } from "@/components/delete-expense-button";
import { ColorDot } from "@/components/color-dot";
import type { DisplayColor } from "@/lib/engine";

const STATUS_META: Record<PaymentStatus, { label: string; className: string }> = {
  paid: { label: "Payé", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  unpaid: { label: "Impayé", className: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
  "not-yet-due": { label: "À venir", className: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
};

export interface AccordionItemData {
  expenseId: string;
  name: string;
  icon: string | null;
  type: "permanent" | "temporary" | "credit";
  color: DisplayColor;
  amount: number;
  monthKey: string;
  status: PaymentStatus;
  isFinalCreditPayment?: boolean;
  /** Credit-only real-time state. */
  credit?: {
    initialAmount: number;
    paidTotal: number;
    remaining: number;
    pendingAmount: number;
    isOverdue: boolean;
    monthlyAmount: number;
    endMonthLabel: string | null;
    statusLabel: string;
  };
}

export function ExpenseAccordionItem({ item, currency }: { item: AccordionItemData; currency: string }) {
  const [open, setOpen] = useState(false);
  const status = STATUS_META[item.status];

  const percent =
    item.credit && item.credit.initialAmount > 0
      ? Math.min(100, Math.round((item.credit.paidTotal / item.credit.initialAmount) * 100))
      : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left active:bg-slate-50 dark:active:bg-slate-800"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <ColorDot color={item.color} />
          <span className="text-lg leading-none">{expenseIcon({ icon: item.icon, type: item.type })}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{item.name}</p>
            <span className={cn("mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium", status.className)}>
              {status.label}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {formatMoney(item.amount, currency)}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-3.5 py-3 dark:border-slate-800">
          {item.credit && (
            <div className="flex flex-col gap-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {formatMoney(item.credit.paidTotal, currency)} / {formatMoney(item.credit.initialAmount, currency)}
                  </span>
                  <span>{percent}%</span>
                </div>
                <Progress value={percent} indicatorClassName="bg-sky-400 dark:bg-sky-500" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {formatMoney(item.credit.initialAmount, currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Reste</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {formatMoney(item.credit.remaining, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Mensualité actuelle</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {formatMoney(item.credit.monthlyAmount, currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Fin prévue</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {item.credit.endMonthLabel ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className={cn("flex gap-2", item.credit && "mt-3 border-t border-slate-100 pt-3 dark:border-slate-800")}>
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link href={`/expenses/${item.expenseId}`}>
                <Pencil className="h-4 w-4" />
                Modifier
              </Link>
            </Button>
            <DeleteExpenseButton id={item.expenseId} name={item.name} />
          </div>
        </div>
      )}
    </div>
  );
}
