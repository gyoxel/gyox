import * as React from "react";
import { CaretDown } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex h-11 w-full appearance-none rounded-2xl border border-transparent bg-[var(--gx-chip)] shadow-[inset_0_1px_2px_rgba(40,24,110,0.06)] focus:bg-white px-3 py-2 pr-9 text-sm text-slate-900 transition-colors outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:focus:border-violet-400/60 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:focus:bg-white/10",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <CaretDown weight="bold" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
});
Select.displayName = "Select";

export { Select };
