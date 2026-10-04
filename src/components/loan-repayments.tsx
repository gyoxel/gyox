"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { PaymentMethod } from "@/lib/types";
import { METHOD_META } from "@/lib/payment-method";
import { mutate } from "@/lib/use-refresh-data";
import { cn, formatMoney } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";

/** "Reçu ?" 💵 / 💳: the installment came back — an income in Revenus. */
export function ReceiveRepayment({
  loanId,
  slot,
  amount,
  className,
}: {
  loanId: string;
  slot: number;
  amount: number;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function receive(method: PaymentMethod) {
    if (busy) return;
    setBusy(true);
    const res = await mutate({ method: "POST", path: `/api/loans/${loanId}/repayments`, body: { slot, method } });
    if (!res.ok) {
      toast.error(await errorMessage(res));
      setBusy(false);
      return;
    }
    toast.success(`+${formatMoney(amount)} ajouté à ton solde (${METHOD_META[method].label}).`);
    setBusy(false);
  }

  return (
    <span className={cn("flex shrink-0 items-center gap-1", className)} aria-label="Reçu comment ?">
      {(["cash", "card"] as const).map((m) => (
        <button
          key={m}
          type="button"
          disabled={busy}
          onClick={() => receive(m)}
          aria-label={`Reçu en ${METHOD_META[m].label}`}
          className="flex h-9 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-sm font-medium shadow-sm transition-transform active:scale-95 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
        >
          <span className="text-base leading-none">{METHOD_META[m].emoji}</span>
          <span className="text-xs text-slate-700 dark:text-slate-200">{METHOD_META[m].label}</span>
        </button>
      ))}
    </span>
  );
}

/** Undo a received installment (its income goes with it). */
export function CancelRepayment({ loanId, slot }: { loanId: string; slot: number }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await mutate({ method: "DELETE", path: `/api/loans/${loanId}/repayments/${slot}` });
        if (!res.ok) toast.error("Impossible d'annuler.");
        setBusy(false);
      }}
      className="text-xs font-medium text-slate-500 underline underline-offset-2 disabled:opacity-60 dark:text-slate-400"
    >
      Annuler
    </button>
  );
}
