import type { DisplayColor } from "@/lib/engine";
import { cn } from "@/lib/utils";

export const DOT_CLASS: Record<DisplayColor, string> = {
  red: "bg-rose-400",
  yellow: "bg-amber-400",
  blue: "bg-sky-400",
};

/** The category dot shown before every expense name (same rule everywhere:
 *  see getExpenseDisplayColor). */
export function ColorDot({ color, className }: { color: DisplayColor; className?: string }) {
  return <span aria-hidden className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", DOT_CLASS[color], className)} />;
}
