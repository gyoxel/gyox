"use client";

import type { PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/utils";
import { METHOD_META } from "@/lib/payment-method";


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
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <div role="radiogroup" aria-label={label} className="grid flex-1 grid-cols-2 gap-2">
        {(Object.keys(METHOD_META) as PaymentMethod[]).map((m) => (
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
            <span className="text-base leading-none">{METHOD_META[m].emoji}</span>
            {METHOD_META[m].label}
          </button>
        ))}
      </div>
    </div>
  );
}
