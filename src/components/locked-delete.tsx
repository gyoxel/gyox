import Link from "next/link";
import { Trash2 } from "lucide-react";

/**
 * Delete button for something created elsewhere (a credit's income, a goal
 * deposit's expense…): greyed out, with where to delete it — only its
 * source can remove it.
 */
export function LockedDelete({ hint, href, linkLabel }: { hint: string; href: string; linkLabel: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled
        aria-disabled
        className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 text-sm font-medium text-slate-400 dark:bg-slate-800 dark:text-slate-500"
      >
        <Trash2 className="h-4 w-4" />
        Supprimer
      </button>
      <p className="px-1 text-center text-[11px] leading-snug text-slate-400">
        {hint}{" "}
        <Link href={href} className="font-semibold text-slate-600 underline underline-offset-2 dark:text-slate-300">
          {linkLabel}
        </Link>
      </p>
    </div>
  );
}
