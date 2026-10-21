import Link from "next/link";
import { Plus } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

/** The "+ Ajouter …" pill that sits right under a page's hero card — the
 *  same on every page: clear glass, its + on a drop of violet glass. */
export function AddLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "gx-pill flex items-center justify-center gap-2.5 rounded-full py-2.5 pl-3 pr-5 text-[15px] font-semibold text-violet-800 transition-transform active:scale-[0.99] dark:text-violet-100",
        className,
      )}
    >
      <span className="gx-cta flex h-8 w-8 items-center justify-center rounded-full">
        <Plus weight="bold" className="h-4 w-4" />
      </span>
      {label}
    </Link>
  );
}
