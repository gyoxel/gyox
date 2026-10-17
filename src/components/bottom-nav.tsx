"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DATA_CHANGED_EVENT } from "@/lib/use-refresh-data";
import { ArrowDownToLine, ArrowUpFromLine, House, Landmark, LayoutGrid, Plus, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";

const LEFT_ITEMS = [
  { href: "/", label: "Accueil", icon: House },
  { href: "/budget", label: "Dépenses", icon: ReceiptText },
];

const RIGHT_ITEMS = [
  { href: "/credits", label: "Crédits", icon: Landmark },
  { href: "/menu", label: "Menu", icon: LayoutGrid },
];

// Pages opened from the Menu tab keep it highlighted.
const MENU_PATHS = ["/menu", "/budgets", "/daret", "/goals", "/calendar", "/stats", "/categories", "/salary", "/incomes", "/solde", "/epargne", "/prets", "/settings", "/profil", "/admin"];

// Fan-out positions (px) of each option's circle center relative to the
// + button's center: left, top, right — like a radial speed-dial. Glass
// circles, each with its own colour and glow.
const ACTIONS = [
  {
    href: "/incomes/new",
    label: "Revenu",
    icon: ArrowDownToLine,
    dx: -108,
    dy: -112,
    className: "text-emerald-600 shadow-emerald-500/40 dark:text-emerald-300",
  },
  {
    href: "/expenses/new",
    label: "Dépense",
    icon: ArrowUpFromLine,
    dx: 0,
    dy: -168,
    className: "text-rose-600 shadow-rose-500/40 dark:text-rose-300",
  },
  {
    href: "/expenses/new?type=credit",
    label: "Crédit",
    icon: ArrowDownToLine,
    dx: 108,
    dy: -112,
    className: "text-sky-600 shadow-sky-500/40 dark:text-sky-300",
  },
];

const ACTION_SIZE = 60;

/** A tab: its icon, lit azure on a glass pill when it's the current one. */
function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof House;
  active: boolean;
  onNavigate: (href: string) => void;
}) {
  return (
    <Link
      href={href}
      prefetch
      onClick={() => !active && onNavigate(href)}
      aria-current={active ? "page" : undefined}
      className="flex flex-1 touch-manipulation select-none flex-col items-center gap-0.5 py-1.5 active:opacity-70"
    >
      <span
        data-tint
        className={cn(
          "flex h-9 w-12 items-center justify-center rounded-full transition-all duration-300",
          active
            ? "bg-sky-500/12 text-sky-600 shadow-[0_0_18px_-4px] shadow-sky-400/60 dark:bg-sky-400/15 dark:text-sky-300"
            : "text-slate-400 dark:text-slate-400",
        )}
      >
        <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.2 : 1.8} />
      </span>
      <span
        data-tint
        className={cn(
          "text-[10.5px] tracking-wide transition-colors duration-200",
          active ? "font-semibold text-sky-600 dark:text-sky-300" : "font-medium text-slate-400 dark:text-slate-500",
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
        ? MENU_PATHS.some((p) => current === p || current.startsWith(`${p}/`))
        : current === href || current.startsWith(`${href}/`);

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
          "fixed inset-0 z-40 bg-slate-100/70 transition-opacity duration-300 dark:bg-[#050812]/70",
          open ? "opacity-100 backdrop-blur-md" : "pointer-events-none opacity-0",
        )}
      />

      {/* Floating glass dock, off the bottom edge. */}
      <nav
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)]",
          typing && "hidden",
        )}
      >
        <div className="gx-dock pointer-events-auto mx-auto flex max-w-md items-center justify-between rounded-[30px] px-1.5">
          {LEFT_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={navigateTo} />
          ))}

          <div className="relative flex flex-1 items-center justify-center self-stretch">
            {/* Anchor at the + button's center; options fan out from here. */}
            <div className="absolute left-1/2 top-1/2 h-0 w-0">
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
                      "gx-glass-blur flex items-center justify-center rounded-full bg-white/85 shadow-[0_10px_30px_-8px] ring-1 ring-slate-900/5 transition-transform duration-150 active:scale-95 dark:bg-white/10 dark:ring-white/20",
                      className,
                    )}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <span className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 dark:text-slate-200">
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
              className="gx-cta relative flex h-12 w-12 items-center justify-center rounded-full transition-[transform,box-shadow] duration-200 active:scale-95"
            >
              <span
                aria-hidden
                className={cn(
                  "absolute inset-0 rounded-full bg-slate-500 transition-opacity duration-300 dark:bg-slate-600",
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
