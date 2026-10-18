import Link from "next/link";
import { GearSix } from "@phosphor-icons/react/ssr";
import { HEADER_BUTTON } from "@/components/header-button";
import { RefreshLogo } from "@/components/refresh-logo";

const TIME_ZONE = "Africa/Casablanca";

/**
 * Accueil's own header, on the page itself (nothing floating over it):
 * today's date (tap: the Calendrier) over Bonjour / Bonsoir and the first
 * name, big; settings and the GX mark (tap: refresh) on the right.
 */
export function HomeHeader({ name }: { name: string }) {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(now));
  const greeting = hour >= 5 && hour < 18 ? "Bonjour" : "Bonsoir";
  const date = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" }).format(now);
  const today = date.charAt(0).toUpperCase() + date.slice(1);
  const firstName = name.split(" ")[0];

  return (
    <header data-tone className="relative z-10 px-5 pb-1 pt-5 text-slate-900 dark:text-white">
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <Link
            href="/calendar"
            prefetch
            aria-label={`Calendrier · ${today}`}
            className="block truncate text-[13px] font-medium text-slate-500 dark:text-white/55"
          >
            {today}
          </Link>
          <h1 className="truncate text-[27px] font-bold leading-tight tracking-[-0.025em]">
            {firstName ? `${greeting}, ${firstName}` : greeting}
          </h1>
        </div>
        <Link href="/settings" prefetch aria-label="Paramètres" className={HEADER_BUTTON}>
          <GearSix weight="bold" className="h-[19px] w-[19px]" />
        </Link>
        <RefreshLogo />
      </div>
    </header>
  );
}
