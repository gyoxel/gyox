"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthKey, monthLabelFr, type MonthId } from "@/lib/date";
import { Button } from "@/components/ui/button";

export function MonthSwitcher({ month, basePath = "/" }: { month: MonthId; basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function go(next: MonthId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", monthKey(next));
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between gap-2">
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
