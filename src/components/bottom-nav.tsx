"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, CalendarRange, CreditCard, Home, LineChart, Plus, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const LEFT_ITEMS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/budget", label: "Dépenses", icon: CalendarRange },
];

const RIGHT_ITEMS = [
  { href: "/credits", label: "Crédits", icon: Wallet },
  { href: "/timeline", label: "Timeline", icon: LineChart },
];

// Fan-out positions (px) of each option's circle center relative to the
// + button's center: left, top, right — like a radial speed-dial.
const ACTIONS = [
  {
    href: "/settings#salary",
    label: "Revenu",
    icon: ArrowDownToLine,
    dx: -112,
    dy: -118,
    className: "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-400/35",
  },
  {
    href: "/expenses/new",
    label: "Dépense",
    icon: ArrowUpFromLine,
    dx: 0,
    dy: -178,
    className: "bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-400/35",
  },
  {
    href: "/expenses/new?type=credit",
    label: "Crédit",
    icon: CreditCard,
    dx: 112,
    dy: -118,
    className: "bg-gradient-to-br from-sky-400 to-blue-600 shadow-sky-400/35",
  },
];

const ACTION_SIZE = 60;

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
        "flex flex-1 touch-manipulation select-none flex-col items-center gap-1 pb-2.5 pt-3 text-[11px] font-medium transition-colors duration-150 active:opacity-70",
        active ? "text-[#019c86]" : "text-[#b3b3b3] dark:text-slate-500",
      )}
    >
      <Icon
        className={cn("h-6 w-6 transition-transform duration-200", active && "scale-110")}
        strokeWidth={1.5}
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
          "fixed inset-0 z-40 bg-slate-50/85 transition-opacity duration-300 dark:bg-slate-950/85",
          open ? "opacity-100 backdrop-blur-sm" : "pointer-events-none opacity-0",
        )}
      />

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

          <div className="relative flex flex-1 items-start justify-center">
            {/* Anchor at the + button's center; options fan out from here. */}
            <div className="absolute left-1/2 top-2 h-0 w-0">
              {ACTIONS.map(({ href, label, icon: Icon, dx, dy, className }, i) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setOpen(false)}
                  tabIndex={open ? 0 : -1}
                  aria-hidden={!open}
                  style={{
                    width: ACTION_SIZE + 40,
                    transform: open
                      ? `translate(calc(-50% + ${dx}px), ${dy - ACTION_SIZE / 2}px) scale(1)`
                      : `translate(-50%, ${-ACTION_SIZE / 2}px) scale(0.3)`,
                    transitionDelay: `${(open ? i : ACTIONS.length - 1 - i) * 40}ms`,
                  }}
                  className={cn(
                    "absolute left-0 top-0 flex flex-col items-center gap-2 transition-[transform,opacity] duration-[380ms] ease-[cubic-bezier(0.34,1.4,0.64,1)]",
                    open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
                  )}
                >
                  <span
                    style={{ width: ACTION_SIZE, height: ACTION_SIZE }}
                    className={cn(
                      "flex items-center justify-center rounded-full text-white shadow-lg transition-transform duration-150 active:scale-95",
                      className,
                    )}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <span className="text-center text-xs font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-100">
                    {label}
                  </span>
                </Link>
              ))}
            </div>

            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-label={open ? "Fermer le menu d'ajout" : "Ajouter"}
              className="relative -mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-[#00c3ab] to-[#007261] text-white ring-[6px] ring-white transition-[transform,box-shadow] duration-200 active:scale-95 active:shadow-[0_4px_16px_rgba(0,195,171,0.28)] dark:ring-slate-900"
            >
              <span
                aria-hidden
                className={cn(
                  "absolute inset-0 rounded-full bg-slate-400 transition-opacity duration-300 dark:bg-slate-600",
                  open ? "opacity-100" : "opacity-0",
                )}
              />
              <Plus
                className={cn("relative h-8 w-8 transition-transform duration-300", open && "rotate-[135deg]")}
                strokeWidth={2}
              />
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
