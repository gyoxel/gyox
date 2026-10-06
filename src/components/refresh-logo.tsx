"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** The GX logo on Accueil: tapping it reloads the page. */
export function RefreshLogo() {
  const [reloading, setReloading] = useState(false);
  return (
    <button
      type="button"
      aria-label="Actualiser"
      disabled={reloading}
      onClick={() => {
        setReloading(true);
        window.location.reload();
      }}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[15px] font-black tracking-tight text-[#007261] shadow-md transition-transform active:scale-90"
    >
      <span className={cn(reloading && "animate-spin")}>GX</span>
    </button>
  );
}
