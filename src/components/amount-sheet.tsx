"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { PaymentMethod } from "@/lib/types";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface AmountSheetProps {
  /** "Karim t'a rendu combien ?", "Tu as payé combien ?" */
  title: string;
  /** "🤝 Karim · Octobre 2026" */
  subtitle: string;
  /** What's expected (the bar's full width). */
  expected: number;
  /** Already in before this one (loans: earlier repayments that month). */
  already?: number;
  initialAmount: number;
  initialMethod: PaymentMethod;
  /** Quick amounts: [label, amount]. */
  chips: [string, number][];
  /** What the typed amount does (shown under it), or null. */
  explain: (value: number) => string | null;
  methodLabel: string;
  confirmLabel: (value: number) => string;
  tone: "amber" | "rose";
  onClose: () => void;
  /** Saves; resolves to an error message, or null when done. */
  onSubmit: (value: number, method: PaymentMethod) => Promise<string | null>;
  /** Editing an existing one: removes it. */
  onDelete?: () => Promise<string | null>;
}

const TONES = {
  amber: { bar: "bg-amber-500", over: "bg-emerald-500", chip: "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200", button: "bg-amber-600 hover:bg-amber-700" },
  rose: { bar: "bg-rose-500", over: "bg-emerald-500", chip: "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200", button: "bg-rose-600 hover:bg-rose-700" },
} as const;

/**
 * "How much, really?": the amount given back / paid (what was expected by
 * default, or less, or more), a bar of it against what's expected, what
 * that does (the rest this month, the next month…), and cash or card.
 */
export function AmountSheet(props: AmountSheetProps) {
  const { expected, already = 0, tone } = props;
  const [amount, setAmount] = useState(toDecimalInput(props.initialAmount));
  const [method, setMethod] = useState<PaymentMethod>(props.initialMethod);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const value = parseDecimalInput(amount);
  const typed = value > 0 ? value : 0;
  const total = already + typed;
  const scale = Math.max(expected, total, 1);
  const explanation = typed > 0 ? props.explain(typed) : null;
  const colors = TONES[tone];

  function run(action: () => Promise<string | null>) {
    setError(null);
    startTransition(async () => {
      const failed = await action();
      if (failed) setError(failed);
      else props.onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.subtitle}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!(value > 0)) return setError("Indique un montant.");
            run(() => props.onSubmit(value, method));
          }}
        >
          <div className="flex items-baseline justify-center gap-2 rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-800/60">
            <input
              aria-label="Montant (DH)"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(e) => setAmount(cleanDecimalInput(e.target.value))}
              placeholder="0"
              style={{ width: `${Math.max(1, amount.length) + 0.3}ch` }}
              className="max-w-[60vw] bg-transparent text-center text-4xl font-bold text-slate-900 outline-none placeholder:text-slate-300 dark:text-white"
            />
            <span className="text-lg font-semibold text-slate-400">DH</span>
          </div>

          {props.chips.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {props.chips.map(([label, n]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setAmount(toDecimalInput(n))}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    Math.abs(typed - n) < 0.005 ? colors.chip : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                  )}
                >
                  {label} · {formatMoney(n)}
                </button>
              ))}
            </div>
          )}

          {/* Against what's expected: before, this one, the rest. */}
          <div className="flex flex-col gap-1.5">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              {already > 0 && <div className="h-full bg-slate-400" style={{ width: `${(Math.min(already, scale) / scale) * 100}%` }} />}
              <div
                className={cn("h-full transition-all", total > expected + 0.005 ? colors.over : colors.bar)}
                style={{ width: `${(Math.min(typed, scale - Math.min(already, scale)) / scale) * 100}%` }}
              />
            </div>
            <p className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>
                {formatMoney(total)} sur {formatMoney(expected)}
                {already > 0 && <> (dont {formatMoney(already)} déjà reçus)</>}
              </span>
              <span>
                {total < expected - 0.005
                  ? `reste ${formatMoney(expected - total)}`
                  : total > expected + 0.005
                    ? `+${formatMoney(total - expected)}`
                    : "tout ✓"}
              </span>
            </p>
          </div>

          {explanation && (
            <p
              className={cn(
                "rounded-xl px-3 py-2 text-xs",
                tone === "amber" ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200" : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
              )}
            >
              {explanation}
            </p>
          )}

          <PaymentMethodPicker value={method} onChange={setMethod} label={props.methodLabel} />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" className={cn("text-white", colors.button)} disabled={pending || !(value > 0)}>
            {pending ? "Enregistrement…" : props.confirmLabel(typed)}
          </Button>
          {props.onDelete && (
            <Button type="button" variant="outline" className="text-rose-600" disabled={pending} onClick={() => run(props.onDelete!)}>
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
