import Link from "next/link";
import { Settings } from "lucide-react";
import type { ReactNode } from "react";
import { BackButton } from "@/components/back-button";
import { HEADER_BUTTON } from "@/components/header-button";

/**
 * Page header: blends with the page (blurred when content scrolls under
 * it), a bold title, and round buttons for back and settings.
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
    <header className="sticky top-0 z-30 bg-slate-50/85 px-4 pb-2 pt-3 backdrop-blur-xl dark:bg-slate-950/85">
      <div className="flex h-11 items-center gap-3">
        {back && <BackButton />}
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
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
