"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, PartyPopper } from "lucide-react";
import { formatMoney, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export interface DueNowItemView {
  id: string;
  name: string;
  amountDue: number;
}

export function DueNowList({ items, currency }: { items: DueNowItemView[]; currency: string }) {
  const router = useRouter();
  // Captured once on mount: checking an item off keeps it visible (struck
  // through, sunk to the bottom, undoable) instead of vanishing the moment
  // the server no longer reports it as due.
  const [fixedItems] = useState(items);
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    const wasPaid = paidIds.has(id);
    setPaidIds((prev) => {
      const next = new Set(prev);
      if (wasPaid) next.delete(id);
      else next.add(id);
      return next;
    });
    setPendingIds((prev) => new Set(prev).add(id));

    const request = wasPaid
      ? fetch(`/api/expenses/${id}/payments`, { method: "DELETE" })
      : fetch(`/api/expenses/${id}/payments`, { method: "POST" });

    request.finally(() => {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      router.refresh();
    });
  }

  if (fixedItems.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20">
        <CardContent className="flex items-center justify-center gap-2 py-5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <PartyPopper className="h-4 w-4" />
          Rien à payer pour le moment
        </CardContent>
      </Card>
    );
  }

  const ordered = [...fixedItems].sort((a, b) => Number(paidIds.has(a.id)) - Number(paidIds.has(b.id)));

  return (
    <div className="flex flex-col gap-2">
      {ordered.map((item) => {
        const isPaid = paidIds.has(item.id);
        const isPending = pendingIds.has(item.id);
        return (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-l-4 border-slate-200 border-l-rose-400 bg-white px-3.5 py-3 shadow-sm transition-opacity dark:border-slate-800 dark:bg-slate-900",
              isPaid && "border-l-slate-300 opacity-50 dark:border-l-slate-700",
            )}
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              disabled={isPending}
              aria-label={isPaid ? `Annuler le paiement de ${item.name}` : `Marquer ${item.name} comme payé`}
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-50",
                isPaid
                  ? "border-emerald-500 bg-emerald-500"
                  : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800",
              )}
            >
              {isPaid && <Check className="h-3.5 w-3.5 text-white" />}
            </button>
            <p
              className={cn(
                "min-w-0 flex-1 truncate text-sm font-medium text-slate-900 dark:text-slate-100",
                isPaid && "text-slate-400 line-through dark:text-slate-500",
              )}
            >
              {item.name}
            </p>
            <span
              className={cn(
                "shrink-0 text-sm font-semibold text-rose-600",
                isPaid && "text-slate-400 line-through dark:text-slate-500",
              )}
            >
              {formatMoney(item.amountDue, currency)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
