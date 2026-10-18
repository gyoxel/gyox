import Link from "next/link";
import { GearSix } from "@phosphor-icons/react/ssr";
import { HEADER_BUTTON } from "@/components/header-button";
import { RefreshLogo } from "@/components/refresh-logo";

const TIME_ZONE = "Africa/Casablanca";

/**
 * Accueil's own header, on the page itself (nothing floating over it): the
 * GX mark (tap: refresh), Bonjour / Bonsoir and the first name, today's date
 * in a round button (tap: the Calendrier), and settings.
 */
export function HomeHeader({ name }: { name: string }) {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(now));
  const greeting = hour >= 5 && hour < 18 ? "Bonjour" : "Bonsoir";
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, ...o }).format(now);
  const firstName = name.split(" ")[0];

  return (
    <header data-tone className="gx-onblue relative z-10 px-5 pb-1 pt-4 text-slate-900 dark:text-white">
      <div className="flex h-12 items-center gap-3">
        <RefreshLogo />
        <div className="min-w-0 flex-1">
          <p className="gx-soft truncate text-[13px] font-medium text-slate-500 dark:text-white/60">{greeting} 👋</p>
          <h1 className="truncate text-[19px] font-bold leading-tight tracking-tight">{firstName || "GX Salaire"}</h1>
        </div>
        <Link
          href="/calendar"
          prefetch
          aria-label={`Calendrier · ${part({ weekday: "long", day: "numeric", month: "long" })}`}
          className={`${HEADER_BUTTON} flex-col gap-0 leading-none`}
        >
          <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-violet-600 dark:text-violet-300">
            {part({ month: "short" }).replace(".", "")}
          </span>
          <span className="text-[15px] font-bold">{part({ day: "numeric" })}</span>
        </Link>
        <Link href="/settings" prefetch aria-label="Paramètres" className={HEADER_BUTTON}>
          <GearSix weight="bold" className="h-[19px] w-[19px]" />
        </Link>
      </div>
    </header>
  );
}
