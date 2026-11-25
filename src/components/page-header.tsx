"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { BackButton } from "@/components/back-button";
import { cn } from "@/lib/utils";
import { PageInfoButton } from "@/components/page-info";
import { HistoryButton } from "@/components/history-button";
import type { HistoryScope } from "@/lib/history";

/**
 * Page header, the same on every page: on the page itself while at the top,
 * glass (the page blurred under it) once the page scrolls under it — the
 * browser's bar takes the backdrop's colour, so the app looks full screen —
 * with a bold title and round glass back / history buttons (Paramètres is
 * in the Menu).
 */
export function PageHeader({
  title,
  back = false,
  action,
  hideSettings = false,
  info,
  history = "all",
}: {
  title: ReactNode;
  /** Back arrow: previous page, or home when this is the first page opened. */
  back?: boolean;
  action?: ReactNode;
  /** No history button (Menu, Paramètres, Profil…). */
  hideSettings?: boolean;
  /** Whose last operations the history button shows. */
  history?: HistoryScope;
  /** The page's « i »: what it is and what can be done on it (PAGE_INFO). */
  info?: string;
}) {
  const ref = useScrolledFlag();
  // A long title ("Ajouter une dépense", "Modifier · Makla" beside a
  // delete button) would be cut between the buttons: smaller then.
  const length = typeof title === "string" ? title.length + (action ? 4 : 0) : 0;
  return (
    <header ref={ref} data-tone className="gx-header sticky top-0 z-30 px-5 pb-2 pt-4 text-slate-900 dark:text-white">
      <div className="flex h-12 items-center gap-3">
        {back && <BackButton />}
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <h1
            className={cn(
              "min-w-0 truncate font-extrabold tracking-tight",
              length > 24 ? "text-[18px]" : length > 17 ? "text-[21px]" : "text-[25px]",
            )}
          >
            {title}
          </h1>
          {info && <PageInfoButton page={info} />}
        </div>
        {action}
        {!hideSettings && <HistoryButton scope={history} />}
      </div>
    </header>
  );
}

/** Sets data-scrolled on the element while the page is scrolled down. */
function useScrolledFlag() {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const update = () => ref.current?.toggleAttribute("data-scrolled", window.scrollY > 4);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return ref;
}
