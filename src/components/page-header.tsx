"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import type { ReactNode } from "react";
import { BackButton } from "@/components/back-button";
import { HEADER_BUTTON } from "@/components/header-button";

/**
 * Page header, the same on every page: on the page itself (nothing floating
 * over it; night glass in the dark) — the browser's bar takes its colour, so
 * the app looks full screen — with a bold title and round back / settings
 * buttons.
 */
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
    <header data-tone className="gx-header sticky top-0 z-30 px-5 pb-2 pt-4 text-slate-900 dark:rounded-b-[28px] dark:text-white">
      <div className="flex h-12 items-center gap-3">
        {back && <BackButton />}
        <h1 className="min-w-0 flex-1 truncate text-[23px] font-bold tracking-tight">{title}</h1>
        {action}
        {!hideSettings && (
          <Link href="/settings" prefetch aria-label="Paramètres" className={HEADER_BUTTON}>
            <Settings className="h-[18px] w-[18px]" />
          </Link>
        )}
      </div>
    </header>
  );
}
