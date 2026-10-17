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
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <div role="radiogroup" aria-label={label} className={cn("grid flex-1 gap-2", keys.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
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
                ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
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
