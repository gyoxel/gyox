"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, PartyPopper } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export interface DueNowItemView {
  id: string;
  name: string;
  amountDue: number;
}

export function DueNowList({ items, currency }: { items: DueNowItemView[]; currency: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [payingId, setPayingId] = useState<string | null>(null);

  function markPaid(id: string) {
    setPayingId(id);
    startTransition(async () => {
      await fetch(`/api/expenses/${id}/payments`, { method: "POST" });
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20">
        <CardContent className="flex items-center justify-center gap-2 py-5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <PartyPopper className="h-4 w-4" />
          Rien à payer pour le moment
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-l-4 border-slate-200 border-l-rose-400 bg-white px-3.5 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{item.name}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm font-semibold text-rose-600">{formatMoney(item.amountDue, currency)}</span>
            <button
              type="button"
              onClick={() => markPaid(item.id)}
              disabled={isPending && payingId === item.id}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white transition-transform active:scale-95 disabled:opacity-50"
              aria-label={`Marquer ${item.name} comme payé`}
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
