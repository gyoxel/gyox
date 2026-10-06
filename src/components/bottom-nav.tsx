"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DATA_CHANGED_EVENT } from "@/lib/use-refresh-data";
import { ArrowDownToLine, ArrowUpFromLine, House, Landmark, LayoutGrid, Plus, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";

// Each tab in its section's colour (the active one on a gradient tile).
const LEFT_ITEMS = [
  {
    href: "/",
    label: "Accueil",
    icon: House,
    gradient: "from-emerald-400 to-teal-600 shadow-teal-500/30",
    tint: "text-teal-600 dark:text-teal-400",
  },
  {
    href: "/budget",
    label: "Dépenses",
    icon: ReceiptText,
    gradient: "from-rose-400 to-pink-600 shadow-rose-500/30",
    tint: "text-rose-600 dark:text-rose-400",
  },
];

const RIGHT_ITEMS = [
  {
    href: "/credits",
    label: "Crédits",
    icon: Landmark,
    gradient: "from-sky-400 to-blue-600 shadow-blue-500/30",
    tint: "text-blue-600 dark:text-sky-400",
  },
  {
    href: "/menu",
    label: "Menu",
    icon: LayoutGrid,
    gradient: "from-violet-400 to-purple-600 shadow-violet-500/30",
    tint: "text-violet-600 dark:text-violet-400",
  },
];

// Pages opened from the Menu tab keep it highlighted.
const MENU_PATHS = ["/menu", "/daret", "/goals", "/calendar", "/stats", "/categories", "/salary", "/incomes", "/solde", "/epargne", "/prets", "/settings", "/profil", "/admin"];

// Fan-out positions (px) of each option's circle center relative to the
// + button's center: left, top, right — like a radial speed-dial.
const ACTIONS = [
  {
    href: "/incomes/new",
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
    icon: ArrowDownToLine,
    dx: 112,
    dy: -118,
    className: "bg-gradient-to-br from-sky-400 to-blue-600 shadow-sky-400/35",
  },
];

const ACTION_SIZE = 60;

function NavLink({
  href,
  label,
  icon: Icon,
  gradient,
  tint,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof House;
  gradient: string;
  tint: string;
  active: boolean;
  onNavigate: (href: string) => void;
}) {
  return (
    <Link
      href={href}
      prefetch
      onClick={() => !active && onNavigate(href)}
      aria-current={active ? "page" : undefined}
      className="flex flex-1 touch-manipulation select-none flex-col items-center gap-0.5 pb-2 pt-2 active:opacity-70"
    >
      <span
        data-tint
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200",
          active ? cn("-translate-y-1 bg-gradient-to-br text-white shadow-md", gradient) : cn(tint, "opacity-70"),
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
      </span>
      <span
        data-tint
        className={cn(
          "text-[11px] transition-colors duration-200",
          active ? cn("font-bold", tint) : "font-medium text-slate-400 dark:text-slate-500",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

// Everything reachable from the bar, kept fully prefetched so it opens
// instantly (re-prefetched after every data change, which purges the cache).
const PREFETCH_HREFS = [
  ...[...LEFT_ITEMS, ...RIGHT_ITEMS].map((i) => i.href),
  "/settings",
  "/stats",
  "/daret",
  "/goals",
  "/calendar",
  "/salary",
  "/incomes",
  "/incomes/new",
  "/categories",
  "/expenses/new",
  "/expenses/new?type=credit",
  "/daret/new",
];

/** Pages open before signing in: no app bar there. */
export const SIGNED_OUT_PAGES = ["/connexion", "/confidentialite", "/conditions"];

export function BottomNav() {
  const pathname = usePathname();
  return SIGNED_OUT_PAGES.includes(pathname) ? null : <AppBar pathname={pathname} />;
}

function AppBar({ pathname }: { pathname: string }) {
  const router = useRouter();

  useEffect(() => {
    // On load the bar's own <Link prefetch>es cover their routes; only
    // /daret/new has no link here. After a data change the whole client
    // cache is purged, so everything is re-prefetched.
    router.prefetch("/daret/new");
    // Staggered so they don't all hit the database at the same instant,
    // and restarted (not stacked) when several data changes come in a row.
    let timers: ReturnType<typeof setTimeout>[] = [];
    const cancel = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };
    const prefetchAll = () => {
      cancel();
      timers = PREFETCH_HREFS.map((href, i) => setTimeout(() => router.prefetch(href), 400 + i * 250));
    };
    window.addEventListener(DATA_CHANGED_EVENT, prefetchAll);
    return () => {
      cancel();
      window.removeEventListener(DATA_CHANGED_EVENT, prefetchAll);
    };
  }, [router]);
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);

  // Hidden while typing on a phone: the keyboard is open, and the bar would
  // otherwise sit between the field and the keyboard (on browsers that shrink
  // the page for the keyboard).
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const touch = window.matchMedia("(pointer: coarse)");
    const update = () => setTyping(touch.matches && isTextField(document.activeElement));
    const onFocusOut = () => setTimeout(update, 0); // activeElement is updated after focusout
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

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
  const isActive = (href: string) =>
    href === "/"
      ? current === "/"
      : href === "/menu"
        ? MENU_PATHS.some((p) => current.startsWith(p))
        : current.startsWith(href);

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

      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_30px_rgba(15,23,42,0.08)] dark:bg-slate-900",
          typing && "hidden",
        )}
      >
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
                  prefetch
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
              className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00c3ab] to-[#007261] text-white shadow-lg shadow-teal-500/30 ring-4 ring-white transition-[transform,box-shadow] duration-200 active:scale-95 dark:ring-slate-900"
            >
              <span
                aria-hidden
                className={cn(
                  "absolute inset-0 rounded-2xl bg-slate-400 transition-opacity duration-300 dark:bg-slate-600",
                  open ? "opacity-100" : "opacity-0",
                )}
              />
              <Plus
                className={cn("relative h-7 w-7 transition-transform duration-300", open && "rotate-[135deg]")}
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

const NON_TEXT_INPUTS = new Set(["checkbox", "radio", "button", "submit", "reset", "range", "color", "file", "image"]);

/** Whether focusing this element opens the on-screen keyboard. */
function isTextField(el: Element | null): boolean {
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(el.type);
  return el instanceof HTMLElement && el.isContentEditable;
}
