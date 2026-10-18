import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[15px] font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/20",
  {
    variants: {
      variant: {
        /** The main action: the brand colour (globals.css). */
        default: "gx-cta hover:brightness-110",
        /** The other actions: white pills, dark text. */
        outline: "gx-pill text-slate-800 hover:brightness-[1.02] dark:text-slate-100",
        ghost: "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10",
        /** Deleting: the same tinted glass, in coral. */
        destructive: "gx-danger hover:brightness-110",
        subtle: "bg-[var(--gx-chip)] text-slate-900 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-100",
        /** Colours come from className only (see below). */
        plain: "",
      },
      size: {
        default: "h-12 px-5 py-2",
        sm: "h-9 px-3.5 text-[13px]",
        lg: "h-14 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    // A button given its own background keeps it in dark mode too: the
    // default variant's dark: colours would otherwise win over it.
    const resolved = variant ?? (className && /(^|\s)bg-(\[|[a-z])/.test(className) ? "plain" : undefined);
    return <Comp className={cn(buttonVariants({ variant: resolved, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
