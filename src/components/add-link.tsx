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
        "flex items-center justify-center gap-2 rounded-full bg-white py-3.5 text-[15px] font-semibold text-violet-700 shadow-[0_6px_18px_-10px_rgba(20,18,31,0.3)] ring-1 ring-slate-900/[0.04] active:scale-[0.99] dark:bg-white/[0.07] dark:text-violet-300 dark:shadow-none dark:ring-white/10",
        className,
      )}
    >
      <Plus className="h-[18px] w-[18px]" strokeWidth={2.2} />
      {label}
    </Link>
  );
}
