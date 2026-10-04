"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Delete button for something created elsewhere (a credit's income, a goal
 * deposit's expense, a daret's contribution…): greyed out, with where to
 * delete it — only its source can remove it.
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

/** The header's bin for such a page: greyed, tapping it says where to delete. */
export function LockedDeleteIcon({ hint }: { hint: string }) {
  return (
    <button
      type="button"
      aria-label="Supprimer (depuis sa source)"
      aria-disabled
      onClick={() => toast(hint)}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white/45 ring-1 ring-white/20"
    >
      <Trash2 className="h-[18px] w-[18px]" />
    </button>
  );
}
