import Link from "next/link";
import { Settings } from "lucide-react";
import { HEADER_BUTTON } from "@/components/header-button";
import { ThemeColor } from "@/components/theme-color";
import { HOME_COLOR } from "@/lib/page-theme";

const TIME_ZONE = "Africa/Casablanca";

/**
 * Accueil's own header, in the app's colour (the browser's bar too): the
 * logo and name with Bonjour / Bonsoir, today's date as a small calendar
 * tile, and settings.
 */
export function HomeHeader() {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(now));
  const greeting = hour >= 5 && hour < 18 ? "Bonjour" : "Bonsoir";
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, ...o }).format(now);

  return (
    <header data-tone className="sticky top-0 z-30 rounded-b-[28px] px-4 pb-3 pt-3 text-white shadow-sm" style={{ backgroundColor: HOME_COLOR }}>
      <ThemeColor color={HOME_COLOR} />
      <div className="flex h-12 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[15px] font-black tracking-tight text-[#007261] shadow-md">
          GX
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">{greeting} 👋</p>
          <h1 className="truncate text-xl font-extrabold tracking-tight">
            GX <span className="font-semibold text-white/85">Salaire</span>
          </h1>
        </div>
        <span
          aria-label={part({ weekday: "long", day: "numeric", month: "long" })}
          className="flex w-11 shrink-0 flex-col items-center overflow-hidden rounded-xl bg-white text-center shadow-sm"
        >
          <span className="w-full bg-gradient-to-r from-rose-400 to-pink-500 text-[9px] font-bold uppercase leading-[14px] text-white">
            {part({ month: "short" }).replace(".", "")}
          </span>
          <span className="text-base font-bold leading-[22px] text-slate-900">{part({ day: "numeric" })}</span>
        </span>
        <Link href="/settings" prefetch aria-label="Paramètres" className={HEADER_BUTTON}>
          <Settings className="h-[18px] w-[18px]" />
        </Link>
      </div>
    </header>
  );
}
