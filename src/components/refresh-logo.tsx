"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";

/** The GX logo on Accueil: tapping it reloads the page. */
export function RefreshLogo() {
  const [reloading, setReloading] = useState(false);
  const t = useT();
  return (
    <button
      type="button"
      aria-label={t("Actualiser")}
      disabled={reloading}
      onClick={() => {
        setReloading(true);
        window.location.reload();
      }}
      className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-white transition-transform active:scale-90 dark:ring-white/10"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-round-192.png" alt="" width={48} height={48} className={cn("h-full w-full", reloading && "animate-spin")} />
    </button>
  );
}
