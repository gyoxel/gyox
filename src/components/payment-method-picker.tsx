"use client";

import type { DepositSource, PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DEPOSIT_SOURCE_META, METHOD_META } from "@/lib/payment-method";

/** One of a few accounts, as a switch: icon and label each. */
function AccountPicker<T extends string>({
  value,
  onChange,
  label,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  label: string;
  options: Record<T, { emoji: string; label: string }>;
}) {
  const keys = Object.keys(options) as T[];
  // Three don't fit beside the label: it goes above them.
  const wide = keys.length > 2;
  return (
    <div className={cn("flex gap-3", wide ? "flex-col gap-2" : "items-center")}>
      <span className="shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <div role="radiogroup" aria-label={label} className={cn("grid flex-1 gap-2", wide ? "grid-cols-3" : "grid-cols-2")}>
        {keys.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={value === m}
            onClick={() => onChange(m)}
            className={cn(
              "flex h-10 items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition-colors",
              value === m
                ? "border-slate-900 bg-slate-900 text-white dark:border-sky-400/50 dark:bg-sky-400/15 dark:text-sky-50 dark:shadow-[0_0_20px_-6px] dark:shadow-sky-400/60"
                : "border-slate-200 bg-white text-slate-600 active:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
            )}
          >
            <span className="text-base leading-none">{options[m].emoji}</span>
            {options[m].label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Cash or card, as a two-option switch. */
export function PaymentMethodPicker({
  value,
  onChange,
  label = "Payé en",
}: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  label?: string;
}) {
  return <AccountPicker value={value} onChange={onChange} label={label} options={METHOD_META} />;
}

/** Where a goal deposit comes from: cash, the card or the savings. */
export function DepositSourcePicker({
  value,
  onChange,
  label = "Pris de",
}: {
  value: DepositSource;
  onChange: (source: DepositSource) => void;
  label?: string;
}) {
  return <AccountPicker value={value} onChange={onChange} label={label} options={DEPOSIT_SOURCE_META} />;
}
