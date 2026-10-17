import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** The "+ Ajouter …" pill that sits right under a page's hero card — the
 *  same on every page, in the brand colour. */
export function AddLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "flex items-center justify-center gap-2 rounded-full bg-emerald-50 py-3.5 text-[15px] font-semibold text-emerald-800 ring-1 ring-emerald-700/10 active:scale-[0.99] dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/15",
        className,
      )}
    >
      <Plus className="h-[18px] w-[18px]" strokeWidth={2.2} />
      {label}
    </Link>
  );
}
