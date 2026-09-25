"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthKey, monthLabelFr, type MonthId } from "@/lib/date";
import { Button } from "@/components/ui/button";

const SWIPE_THRESHOLD_PX = 40;

export function MonthSwitcher({ month, basePath = "/" }: { month: MonthId; basePath?: string }) {
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
    router.push(delta > 0 ? prevHref : nextHref);
  }

  return (
    <div
      className="flex items-center justify-between gap-2 touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <Button asChild variant="outline" size="icon">
        <Link href={prevHref} prefetch scroll={false} aria-label="Mois précédent">
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </Button>
      <div className="text-lg font-semibold text-slate-900 dark:text-white">{monthLabelFr(month)}</div>
      <Button asChild variant="outline" size="icon">
        <Link href={nextHref} prefetch scroll={false} aria-label="Mois suivant">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
