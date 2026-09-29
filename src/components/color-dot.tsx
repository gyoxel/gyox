import type { DisplayColor } from "@/lib/engine";
import { cn } from "@/lib/utils";

/** One palette for every place an expense's color shows (checked for
 *  colorblind separation): see getExpenseDisplayColor. */
export const COLOR_HEX: Record<DisplayColor, string> = {
  brown: "#a0522d",
  red: "#e11d48",
  blue: "#2563eb",
  yellow: "#facc15",
};

export const DOT_CLASS: Record<DisplayColor, string> = {
  brown: "bg-[#a0522d]",
  red: "bg-[#e11d48]",
  blue: "bg-[#2563eb]",
  yellow: "bg-[#facc15]",
};

/** The category dot shown before every expense name (same rule everywhere:
 *  see getExpenseDisplayColor). */
export function ColorDot({ color, className }: { color: DisplayColor; className?: string }) {
  return <span aria-hidden className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", DOT_CLASS[color], className)} />;
}
