import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-20 w-full rounded-2xl border border-transparent bg-[var(--gx-chip)] shadow-[inset_0_1px_2px_rgba(40,24,110,0.06)] focus:bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:focus:border-violet-400/60 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:focus:bg-white/10",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
