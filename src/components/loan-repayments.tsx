"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { PaymentMethod } from "@/lib/types";
import { METHOD_META } from "@/lib/payment-method";
import { mutate } from "@/lib/use-refresh-data";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** What a different amount does to the next month. */
function differenceHint(value: number, expected: number): string | null {
  if (!(value > 0) || Math.abs(value - expected) < 0.005) return null;
  return value < expected
    ? `Il reste ${formatMoney(expected - value)} à recevoir ce mois-ci. Pas reçus d'ici la fin du mois, ils passent au mois suivant.`
    : `${formatMoney(value - expected)} en avance : le mois suivant attend moins.`;
}

/**
 * "Reçu ?" 💵 / 💳: opens what came back — the amount (all of it by
 * default, or what was actually given) and how. An income in Revenus.
 */
export function ReceiveRepayment({
  loanId,
  slot,
  amount,
  className,
}: {
  loanId: string;
  slot: number;
  /** Expected that month. */
  amount: number;
  className?: string;
}) {
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  return (
    <>
      <span className={cn("flex shrink-0 items-center gap-1", className)} aria-label="Reçu comment ?">
        {(["cash", "card"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            aria-label={`Reçu en ${METHOD_META[m].label}`}
            className="flex h-9 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-sm font-medium shadow-sm transition-transform active:scale-95 dark:border-slate-700 dark:bg-slate-800"
          >
            <span className="text-base leading-none">{METHOD_META[m].emoji}</span>
            <span className="text-xs text-slate-700 dark:text-slate-200">{METHOD_META[m].label}</span>
          </button>
        ))}
      </span>
      {method && (
        <RepaymentDialog
          title="Remboursement reçu"
          expected={amount}
          initialAmount={amount}
          initialMethod={method}
          onClose={() => setMethod(null)}
          submit={(value, m) => ({ method: "POST", path: `/api/loans/${loanId}/repayments`, body: { slot, method: m, amount: value } })}
          done={(value, m) => `+${formatMoney(value)} ajouté à ton solde (${METHOD_META[m].label}).`}
        />
      )}
    </>
  );
}

/** "Modifier": what a repayment brought, and how. */
export function EditRepayment({
  loanId,
  repaymentId,
  expected,
  amount,
  method,
}: {
  loanId: string;
  repaymentId: string;
  /** What its month expected besides this repayment. */
  expected: number;
  amount: number;
  method: PaymentMethod;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-amber-700 underline underline-offset-2 dark:text-amber-400"
      >
        Modifier
      </button>
      {open && (
        <RepaymentDialog
          title="Modifier le remboursement"
          expected={expected}
          initialAmount={amount}
          initialMethod={method}
          onClose={() => setOpen(false)}
          submit={(value, m) => ({ method: "PATCH", path: `/api/loans/${loanId}/repayments/${repaymentId}`, body: { amount: value, method: m } })}
          done={() => "Remboursement modifié."}
        />
      )}
    </>
  );
}

function RepaymentDialog({
  title,
  expected,
  initialAmount,
  initialMethod,
  onClose,
  submit,
  done,
}: {
  title: string;
  expected: number;
  initialAmount: number;
  initialMethod: PaymentMethod;
  onClose: () => void;
  submit: (value: number, method: PaymentMethod) => Parameters<typeof mutate>[0];
  done: (value: number, method: PaymentMethod) => string;
}) {
  const [amount, setAmount] = useState(toDecimalInput(initialAmount));
  const [method, setMethod] = useState<PaymentMethod>(initialMethod);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const value = parseDecimalInput(amount);
  const hint = differenceHint(value, expected);

  function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(value > 0)) return setError("Indique combien il t'a rendu.");
    startTransition(async () => {
      const res = await mutate(submit(value, method));
      if (!res.ok) return setError(await errorMessage(res));
      toast.success(done(value, method));
      onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Encore attendu ce mois-ci : {formatMoney(expected)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={confirm} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="repayment-amount">Il t&apos;a rendu</Label>
            <Input
              id="repayment-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(e) => setAmount(cleanDecimalInput(e.target.value))}
              className="text-base font-semibold"
            />
            {hint && <p className="text-[11px] text-amber-700 dark:text-amber-300">{hint}</p>}
          </div>
          <PaymentMethodPicker value={method} onChange={setMethod} label="Reçu en" />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" className="bg-amber-600 text-white hover:bg-amber-700" disabled={pending || !(value > 0)}>
            {pending ? "Enregistrement…" : `Confirmer +${formatMoney(value > 0 ? value : 0)}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Undo a repayment (its income goes with it). */
export function CancelRepayment({ loanId, repaymentId }: { loanId: string; repaymentId: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await mutate({ method: "DELETE", path: `/api/loans/${loanId}/repayments/${repaymentId}` });
        if (!res.ok) toast.error(await errorMessage(res));
        setBusy(false);
      }}
      className="text-xs font-medium text-slate-500 underline underline-offset-2 disabled:opacity-60 dark:text-slate-400"
    >
      Annuler
    </button>
  );
}
