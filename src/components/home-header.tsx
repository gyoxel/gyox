import Link from "next/link";
import { Settings } from "lucide-react";
import { HEADER_BUTTON } from "@/components/header-button";
import { RefreshLogo } from "@/components/refresh-logo";

const TIME_ZONE = "Africa/Casablanca";

/**
 * Accueil's own header, in the app's colour (the browser's bar too): the
 * logo (tap: refresh) and name with Bonjour / Bonsoir, today's date as a small calendar
 * tile (tap: the Calendrier), and settings.
 */
export function HomeHeader() {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(now));
  const greeting = hour >= 5 && hour < 18 ? "Bonjour" : "Bonsoir";
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, ...o }).format(now);

  return (
    <header data-tone className="gx-header sticky top-0 z-30 rounded-b-[28px] px-4 pb-3 pt-3 text-slate-900 dark:text-white">
      <div className="flex h-12 items-center gap-3">
        <RefreshLogo />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-white/60">{greeting} 👋</p>
          <h1 className="truncate text-xl font-extrabold tracking-tight">
            GX <span className="font-semibold text-slate-600 dark:text-white/85">Salaire</span>
          </h1>
        </div>
        <Link
          href="/calendar"
          prefetch
          aria-label={`Calendrier · ${part({ weekday: "long", day: "numeric", month: "long" })}`}
          className="flex w-11 shrink-0 flex-col items-center overflow-hidden rounded-2xl bg-white text-center shadow-sm ring-1 ring-slate-900/[0.06] transition-transform active:scale-95 dark:bg-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] dark:ring-white/15"
        >
          <span className="w-full pt-1 text-[9px] font-bold uppercase leading-[12px] tracking-[0.12em] text-sky-600 dark:text-sky-300">
            {part({ month: "short" }).replace(".", "")}
          </span>
          <span className="pb-1 text-base font-bold leading-[20px] text-slate-900 dark:text-white">{part({ day: "numeric" })}</span>
        </Link>
        <Link href="/settings" prefetch aria-label="Paramètres" className={HEADER_BUTTON}>
          <Settings className="h-[18px] w-[18px]" />
        </Link>
      </div>
    </header>
  );
}
