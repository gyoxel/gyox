import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  backHref,
  action,
}: {
  title: ReactNode;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="flex items-center gap-2">
        {backHref && (
          <Link
            href={backHref}
            className="-ml-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        )}
        <h1 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h1>
      </div>
      {action}
    </div>
  );
}
