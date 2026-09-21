import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", {
  variants: {
    variant: {
      blue: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
      red: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
      yellow: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    },
  },
  defaultVariants: {
    variant: "neutral",
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
