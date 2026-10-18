"use client";

import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * A choice among a few, as one track of glass: each option an icon and a
 * word, the chosen one on a lens of violet glass that slides over to it
 * (like the bar's current tab).
 */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { key: T; label: string; icon: PhosphorIcon }[];
}) {
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="relative grid rounded-[22px] bg-[var(--gx-chip)] p-1 shadow-[inset_0_1px_2px_rgba(40,24,110,0.06)]"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="gx-cta absolute inset-y-1 left-1 rounded-[18px] transition-transform duration-500 ease-[cubic-bezier(0.3,1.25,0.5,1)]"
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map(({ key, label: name, icon: Icon }) => {
        const selected = key === value;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(key)}
            className={cn(
              "relative z-10 flex flex-col items-center gap-1 rounded-[18px] px-1 py-2.5 transition-colors duration-300",
              selected ? "text-white" : "text-slate-600 active:bg-white/60 dark:text-slate-300 dark:active:bg-white/10",
            )}
          >
            <Icon
              weight={selected ? "fill" : "duotone"}
              className={cn("h-[22px] w-[22px]", !selected && "text-violet-600 dark:text-violet-300")}
            />
            <span className="whitespace-nowrap text-[11.5px] font-semibold leading-tight">{name}</span>
          </button>
        );
      })}
    </div>
  );
}

/** The line under a choice saying what it means: calm, in violet. */
export function ChoiceNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl bg-violet-50 px-3.5 py-2.5 text-[12.5px] leading-snug text-violet-900 dark:bg-violet-500/10 dark:text-violet-100">
      {children}
    </p>
  );
}
