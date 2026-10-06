"use client";

import { useTransition } from "react";
import { useRefreshData } from "@/lib/use-refresh-data";
import { cn } from "@/lib/utils";

/** The GX logo on Accueil: tapping it reloads the data (all pages). */
export function RefreshLogo() {
  const refreshData = useRefreshData();
  const [refreshing, startRefresh] = useTransition();
  return (
    <button
      type="button"
      aria-label="Actualiser"
      disabled={refreshing}
      onClick={() => startRefresh(() => refreshData())}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[15px] font-black tracking-tight text-[#007261] shadow-md transition-transform active:scale-90"
    >
      <span className={cn(refreshing && "animate-spin")}>GX</span>
    </button>
  );
}
