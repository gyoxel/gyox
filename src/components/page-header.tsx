import Link from "next/link";
import { Settings } from "lucide-react";
import type { ReactNode } from "react";
import { BackButton } from "@/components/back-button";

export function PageHeader({
  title,
  back = false,
  action,
  hideSettings = false,
}: {
  title: ReactNode;
  /** Back arrow: previous page, or home when this is the first page opened. */
  back?: boolean;
  action?: ReactNode;
  hideSettings?: boolean;
}) {
  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2">
        {back && <BackButton />}
        <h1 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h1>
      </div>
      <div className="flex items-center gap-1">
        {action}
        {!hideSettings && (
          <Link
            href="/settings"
            prefetch
            aria-label="Paramètres"
            className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Settings className="h-5 w-5" />
          </Link>
        )}
      </div>
    </div>
  );
}
