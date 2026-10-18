"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { GearSix } from "@phosphor-icons/react/ssr";
import { BackButton } from "@/components/back-button";
import { HEADER_BUTTON } from "@/components/header-button";
import { cn } from "@/lib/utils";

/**
 * Page header, the same on every page: on the page's sky while at the top,
 * blue glass once the page scrolls under it — the browser's bar takes the
 * sky's colour, so the app looks full screen — with a bold white title and
 * round glass back / settings buttons.
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
  const ref = useScrolledFlag();
  // A long title ("Ajouter une dépense", "Modifier · Makla" beside a
  // delete button) would be cut between the buttons: smaller then.
  const length = typeof title === "string" ? title.length + (action ? 4 : 0) : 0;
  return (
    <header ref={ref} data-tone className="gx-header gx-onblue sticky top-0 z-30 px-5 pb-2 pt-4 text-slate-900 dark:text-white">
      <div className="flex h-12 items-center gap-3">
        {back && <BackButton />}
        <h1
          className={cn(
            "min-w-0 flex-1 truncate font-extrabold tracking-tight",
            length > 24 ? "text-[18px]" : length > 17 ? "text-[21px]" : "text-[25px]",
          )}
        >
          {title}
        </h1>
        {action}
        {!hideSettings && (
          <Link href="/settings" prefetch aria-label="Paramètres" className={HEADER_BUTTON}>
            <GearSix weight="bold" className="h-[19px] w-[19px]" />
          </Link>
        )}
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
