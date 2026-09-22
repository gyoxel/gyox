"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthKey, monthLabelFr, type MonthId } from "@/lib/date";
import { Button } from "@/components/ui/button";

const SWIPE_THRESHOLD_PX = 40;

export function MonthSwitcher({ month, basePath = "/" }: { month: MonthId; basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const touchStartX = useRef<number | null>(null);

  function go(next: MonthId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", monthKey(next));
    router.push(`${basePath}?${params.toString()}`);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    go(addMonths(month, delta > 0 ? -1 : 1));
  }

  return (
    <div
      className="flex items-center justify-between gap-2 touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <Button variant="outline" size="icon" onClick={() => go(addMonths(month, -1))} aria-label="Mois précédent">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-lg font-semibold text-slate-900 dark:text-white">{monthLabelFr(month)}</div>
      <Button variant="outline" size="icon" onClick={() => go(addMonths(month, 1))} aria-label="Mois suivant">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
