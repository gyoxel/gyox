"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthKey, monthLabelFr, type MonthId } from "@/lib/date";
import type { ReactNode } from "react";

const SWIPE_THRESHOLD_PX = 40;
const ARROW =
  "flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100 dark:text-slate-400 dark:active:bg-slate-800";

/** ‹ month › as a card (like the Accueil's), with an optional line under the month. */
export function MonthSwitcher({
  month,
  basePath = "/",
  caption,
}: {
  month: MonthId;
  basePath?: string;
  caption?: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const touchStartX = useRef<number | null>(null);

  function hrefFor(next: MonthId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", monthKey(next));
    return `${basePath}?${params.toString()}`;
  }

  // Previous/next months are fully prefetched by the <Link>s below, so
  // arrows and swipes both switch instantly from the client cache.
  const prevHref = hrefFor(addMonths(month, -1));
  const nextHref = hrefFor(addMonths(month, 1));

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    router.replace(delta > 0 ? prevHref : nextHref, { scroll: false });
  }

  return (
    <div
      data-no-tab-swipe
      className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm touch-pan-y dark:border-slate-800 dark:bg-slate-900"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <Link href={prevHref} prefetch replace scroll={false} aria-label="Mois précédent" className={ARROW}>
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <div className="min-w-0 text-center">
        <p className="text-[15px] font-semibold capitalize text-slate-900 dark:text-white">{monthLabelFr(month)}</p>
        {caption && <p className="text-[11px] text-slate-400">{caption}</p>}
      </div>
      <Link href={nextHref} prefetch replace scroll={false} aria-label="Mois suivant" className={ARROW}>
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
