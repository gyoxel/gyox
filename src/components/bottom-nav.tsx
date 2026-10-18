"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DATA_CHANGED_EVENT } from "@/lib/use-refresh-data";
import { Bank, HandArrowDown, HandArrowUp, House, Plus, Receipt, SquaresFour } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Accueil", icon: House },
  { href: "/budget", label: "Dépenses", icon: Receipt },
  { href: "/credits", label: "Crédits", icon: Bank },
  { href: "/menu", label: "Menu", icon: SquaresFour },
];

// Pages opened from the Menu tab keep it highlighted.
const MENU_PATHS = ["/menu", "/budgets", "/daret", "/goals", "/calendar", "/stats", "/categories", "/salary", "/incomes", "/solde", "/epargne", "/prets", "/settings", "/profil", "/admin"];

// The + button's menu: a short list rising above it, each one in its own
// pastel colour of meaning (a credit, money in, money out).
const ACTIONS = [
  { href: "/expenses/new?type=credit", label: "Crédit", icon: Bank, tone: "blue" },
  { href: "/incomes/new", label: "Revenu", icon: HandArrowDown, tone: "green" },
  { href: "/expenses/new", label: "Dépense", icon: HandArrowUp, tone: "rose" },
];


/** A tab: its icon and name — the current one filled, in ink, over the
 *  bar's lime lens. */
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
      className="relative z-10 flex flex-1 touch-manipulation select-none flex-col items-center justify-center gap-1 transition-transform active:scale-95"
    >
      <Icon
        data-tint
        weight={active ? "fill" : "regular"}
        className={cn(
          "h-6 w-6 transition-colors duration-200",
          active ? "gx-on-lens" : "text-slate-500 dark:text-slate-400",
        )}
      />
      <span
        data-tint
        className={cn(
          "text-[11px] leading-none transition-colors duration-200",
          active ? "gx-on-lens font-bold" : "font-semibold text-slate-500 dark:text-slate-400",
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
  ...ITEMS.map((i) => i.href),
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

  const activeIndex = ITEMS.findIndex((item) => isActive(item.href));

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
          "fixed inset-0 z-40 bg-[#f3f4f0]/60 transition-opacity duration-300 dark:bg-[#050604]/60",
          open ? "opacity-100 backdrop-blur-md" : "pointer-events-none opacity-0",
        )}
      />

      {/* The tabs on a capsule of frosted glass, a lime lens sliding under
          the current one; floating above them on the right, the + — a lime
          orb, its menu rising above it. Both stay put while the page
          scrolls. */}
      <nav
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]",
          typing && "hidden",
        )}
      >
        <div className="mx-auto flex max-w-md flex-col items-end gap-3">
          <div className="pointer-events-auto relative">
            {/* The + button's menu, rising above it — closed, it lets taps
                through to the page under it. */}
            <div className="pointer-events-none absolute bottom-full right-0 mb-3 flex flex-col items-end gap-2.5">
              {ACTIONS.map(({ href, label, icon: Icon, tone }, i) => (
                <Link
                  key={label}
                  href={href}
                  prefetch
                  onClick={() => setOpen(false)}
                  tabIndex={open ? 0 : -1}
                  aria-hidden={!open}
                  style={{ transitionDelay: `${(open ? ACTIONS.length - 1 - i : i) * 35}ms` }}
                  className={cn(
                    "flex items-center gap-3 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)]",
                    open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
                  )}
                >
                  <span className="gx-float rounded-full px-4 py-2 text-sm font-bold text-slate-900 dark:text-white">{label}</span>
                  <span
                    className={`gx-tile gx-tone-${tone} flex h-[52px] w-[52px] items-center justify-center rounded-full transition-transform active:scale-95`}
                  >
                    <Icon weight="duotone" className="h-6 w-6" />
                  </span>
                </Link>
              ))}
            </div>

            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-label={open ? "Fermer le menu d'ajout" : "Ajouter"}
              className="gx-fab relative flex h-[60px] w-[60px] items-center justify-center rounded-full transition-transform duration-200 active:scale-95"
            >
              <Plus weight="bold" className={cn("h-7 w-7 transition-transform duration-300", open && "rotate-[135deg]")} />
            </button>
          </div>

          <div className="gx-float pointer-events-auto relative flex h-[66px] w-full items-stretch rounded-full p-1.5">
            <span
              aria-hidden
              className={cn(
                "gx-lens absolute inset-y-1.5 left-1.5 rounded-full transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.3,1.25,0.5,1)]",
                activeIndex < 0 && "opacity-0",
              )}
              style={{ width: "calc((100% - 12px) / 4)", transform: `translateX(${Math.max(0, activeIndex) * 100}%)` }}
            />
            {ITEMS.map((item) => (
              <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={navigateTo} />
            ))}
          </div>
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
