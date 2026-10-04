"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import type { ReactNode } from "react";
import { pageColor } from "@/lib/page-theme";
import { BackButton } from "@/components/back-button";
import { HEADER_BUTTON } from "@/components/header-button";
import { ThemeColor } from "@/components/theme-color";

/**
 * Page header in the page's colour — the browser's bar takes the same
 * colour, so the app looks full screen — with a bold title and round back /
 * settings buttons.
 */
export function PageHeader({
  title,
  back = false,
  action,
  hideSettings = false,
  tone,
}: {
  title: ReactNode;
  /** Back arrow: previous page, or home when this is the first page opened. */
  back?: boolean;
  action?: ReactNode;
  hideSettings?: boolean;
  /** Overrides the page's colour (e.g. a credit under /expenses). */
  tone?: string;
}) {
  const pathname = usePathname();
  const color = tone ?? pageColor(pathname);
  return (
    <header data-tone className="sticky top-0 z-30 rounded-b-[28px] px-4 pb-3 pt-3 text-white shadow-sm" style={{ backgroundColor: color }}>
      <ThemeColor color={color} />
      <div className="flex h-11 items-center gap-3">
        {back && <BackButton />}
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold tracking-tight">{title}</h1>
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
