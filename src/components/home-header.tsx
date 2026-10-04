import Link from "next/link";
import { Settings } from "lucide-react";
import { HEADER_BUTTON } from "@/components/header-button";

const TIME_ZONE = "Africa/Casablanca";

/**
 * Accueil's own header: the app's logo and name with a greeting for the
 * time of day, today's date as a small calendar tile, and settings.
 */
export function HomeHeader() {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(now));
  const greeting = hour < 5 ? "Bonne nuit" : hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, ...o }).format(now);

  return (
    <header className="sticky top-0 z-30 bg-slate-50/85 px-4 pb-2 pt-3 backdrop-blur-xl dark:bg-slate-950/85">
      <div className="flex h-12 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00c3ab] to-[#007261] text-[15px] font-black tracking-tight text-white shadow-md shadow-teal-500/30">
          GX
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{greeting} 👋</p>
          <h1 className="truncate text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            GX <span className="bg-gradient-to-r from-[#00c3ab] to-[#007261] bg-clip-text text-transparent">Salaire</span>
          </h1>
        </div>
        <span
          aria-label={part({ weekday: "long", day: "numeric", month: "long" })}
          className="flex w-11 shrink-0 flex-col items-center overflow-hidden rounded-xl bg-white text-center shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10"
        >
          <span className="w-full bg-gradient-to-r from-rose-400 to-pink-500 text-[9px] font-bold uppercase leading-[14px] text-white">
            {part({ month: "short" }).replace(".", "")}
          </span>
          <span className="text-base font-bold leading-[22px] text-slate-900 dark:text-white">{part({ day: "numeric" })}</span>
        </span>
        <Link href="/settings" prefetch aria-label="Paramètres" className={HEADER_BUTTON}>
          <Settings className="h-[18px] w-[18px]" />
        </Link>
      </div>
    </header>
  );
}
