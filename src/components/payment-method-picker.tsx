"use client";

import type { DepositSource, PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DEPOSIT_SOURCE_META, METHOD_META } from "@/lib/payment-method";
import { MethodIcon } from "@/components/method-icon";

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
              "flex h-11 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-colors",
              value === m
                ? "gx-cta"
                : "bg-[var(--gx-chip)] text-slate-600 active:bg-slate-200 dark:bg-white/[0.07] dark:text-slate-300",
            )}
          >
            <MethodIcon method={m as PaymentMethod | DepositSource} className={m === "savings" ? "text-base" : "h-[17px]"} />
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
