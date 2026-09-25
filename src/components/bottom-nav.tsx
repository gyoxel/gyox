"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, CreditCard, Home, LineChart, Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const LEFT_ITEMS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/budget", label: "Dépenses", icon: CalendarRange },
];

const RIGHT_ITEMS = [
  { href: "/credits", label: "Crédits", icon: Wallet },
  { href: "/timeline", label: "Timeline", icon: LineChart },
];

const ACTIONS = [
  { href: "/settings#salary", label: "Revenu", icon: TrendingUp, className: "bg-emerald-500 text-white shadow-emerald-500/30" },
  { href: "/expenses/new", label: "Dépense", icon: TrendingDown, className: "bg-rose-500 text-white shadow-rose-500/30" },
  { href: "/expenses/new?type=credit", label: "Crédit", icon: CreditCard, className: "bg-sky-500 text-white shadow-sky-500/30" },
];

const TEAL = "#019c86";
const GRADIENT_ID = "nav-active-gradient";

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
  onNavigate: (href: string) => void;
}) {
  return (
    <Link
      href={href}
      onClick={() => !active && onNavigate(href)}
      className={cn(
        "flex flex-1 touch-manipulation select-none flex-col items-center gap-1 pb-2.5 pt-3 text-[11px] font-semibold transition-colors duration-150 active:opacity-70",
        active ? "text-[#019c86]" : "text-[#b3b3b3] dark:text-slate-500",
      )}
    >
      <Icon
        className={cn("h-6 w-6 transition-transform duration-200", active && "scale-110")}
        strokeWidth={2.2}
        stroke={active ? `url(#${GRADIENT_ID})` : "currentColor"}
        fill={active ? TEAL : "none"}
        fillOpacity={active ? 0.15 : 0}
      />
      {label}
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);

  // Close the menu whenever the route changes (e.g. after picking an action).
  if (open && pathname !== openedAt) setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Highlight the tapped tab immediately instead of waiting for the new
  // route to finish rendering on the server.
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [pendingFrom, setPendingFrom] = useState(pathname);
  if (pendingHref && pathname !== pendingFrom) setPendingHref(null);

  function navigateTo(href: string) {
    setPendingFrom(pathname);
    setPendingHref(href);
  }

  const current = pendingHref ?? pathname;
  const isActive = (href: string) => (href === "/" ? current === "/" : current.startsWith(href));

  function toggle() {
    setOpenedAt(pathname);
    setOpen((v) => !v);
  }

  return (
    <>
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/30 transition-opacity duration-300",
          open ? "opacity-100 backdrop-blur-[2px]" : "pointer-events-none opacity-0",
        )}
      />

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-3">
        {ACTIONS.map(({ href, label, icon: Icon, className }, i) => {
          // Stagger: nearest to the + button appears first, closes last.
          const order = ACTIONS.length - 1 - i;
          return (
            <Link
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              style={{ transitionDelay: `${(open ? order : i) * 45}ms` }}
              className={cn(
                "flex w-44 items-center gap-3 rounded-2xl py-2.5 pl-2.5 pr-4 text-sm font-semibold shadow-lg transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                className,
                open ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "translate-y-6 scale-75 opacity-0",
              )}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
                <Icon className="h-4 w-4" />
              </span>
              {label}
            </Link>
          );
        })}
      </div>

      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <linearGradient id={GRADIENT_ID} gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="22">
            <stop offset="0%" stopColor="#00c3ab" />
            <stop offset="100%" stopColor="#007261" />
          </linearGradient>
        </defs>
      </svg>

      <nav className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_30px_rgba(15,23,42,0.08)] dark:bg-slate-900">
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-2">
          {LEFT_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={navigateTo} />
          ))}

          <div className="flex flex-1 items-start justify-center">
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-label={open ? "Fermer le menu d'ajout" : "Ajouter"}
              className="-mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-[#00c3ab] to-[#007261] text-white shadow-[0_6px_22px_rgba(0,195,171,0.45)] ring-[6px] ring-white transition-transform duration-300 active:scale-95 dark:ring-slate-900"
            >
              <Plus className={cn("h-8 w-8 transition-transform duration-300", open && "rotate-[135deg]")} strokeWidth={2.6} />
            </button>
          </div>

          {RIGHT_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={navigateTo} />
          ))}
        </div>
      </nav>
    </>
  );
}
