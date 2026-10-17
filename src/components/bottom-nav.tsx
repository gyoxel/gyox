"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DATA_CHANGED_EVENT } from "@/lib/use-refresh-data";
import { ArrowDownToLine, ArrowUpFromLine, House, Landmark, LayoutGrid, Plus, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Accueil", icon: House },
  { href: "/budget", label: "Dépenses", icon: ReceiptText },
  { href: "/credits", label: "Crédits", icon: Landmark },
  { href: "/menu", label: "Menu", icon: LayoutGrid },
];

// Pages opened from the Menu tab keep it highlighted.
const MENU_PATHS = ["/menu", "/budgets", "/daret", "/goals", "/calendar", "/stats", "/categories", "/salary", "/incomes", "/solde", "/epargne", "/prets", "/settings", "/profil", "/admin"];

// The + button's menu: a short list rising above it, each one with its own
// colour of meaning (money in, out, a credit).
const ACTIONS = [
  { href: "/expenses/new?type=credit", label: "Crédit", icon: Landmark, tint: "text-violet-600 dark:text-violet-300" },
  { href: "/incomes/new", label: "Revenu", icon: ArrowDownToLine, tint: "text-emerald-600 dark:text-emerald-300" },
  { href: "/expenses/new", label: "Dépense", icon: ArrowUpFromLine, tint: "text-rose-600 dark:text-rose-300" },
];


/** A tab: its icon and name; the current one's icon on a green pill. */
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
      className="flex flex-1 touch-manipulation select-none flex-col items-center justify-center gap-0.5 active:opacity-70"
    >
      <span
        data-tint
        className={cn(
          "flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300",
          active ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200" : "text-slate-400 dark:text-slate-500",
        )}
      >
        <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.2 : 1.8} />
      </span>
      <span
        data-tint
        className={cn(
          "text-[11px] leading-none transition-colors duration-200",
          active ? "font-bold text-emerald-900 dark:text-white" : "font-medium text-slate-400 dark:text-slate-500",
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
          "fixed inset-0 z-40 bg-[#f3f6f4]/80 transition-opacity duration-300 dark:bg-[#040a08]/75",
          open ? "opacity-100 backdrop-blur-sm" : "pointer-events-none opacity-0",
        )}
      />

      {/* The tabs on a white pill, and the + apart, on its right. */}
      <nav
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]",
          typing && "hidden",
        )}
      >
        <div className="mx-auto flex max-w-md items-end gap-3">
          <div className="pointer-events-auto flex h-16 flex-1 items-stretch rounded-[24px] bg-white px-1.5 shadow-[0_14px_34px_-14px_rgba(15,31,26,0.3)] ring-1 ring-slate-900/[0.05] dark:bg-[#111c18] dark:shadow-[0_18px_40px_-14px_rgba(0,0,0,0.8)] dark:ring-white/10">
            {ITEMS.map((item) => (
              <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={navigateTo} />
            ))}
          </div>

          <div className="pointer-events-auto relative">
            {/* The + button's menu, rising above it. */}
            <div className="absolute bottom-full right-0 mb-3 flex flex-col items-end gap-2.5">
              {ACTIONS.map(({ href, label, icon: Icon, tint }, i) => (
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
                  <span className="rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 shadow-[0_8px_22px_-10px_rgba(15,31,26,0.35)] ring-1 ring-slate-900/[0.05] dark:bg-[#15221d] dark:text-white dark:ring-white/10">
                    {label}
                  </span>
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_8px_22px_-10px_rgba(15,31,26,0.35)] ring-1 ring-slate-900/[0.05] transition-transform active:scale-95 dark:bg-[#15221d] dark:ring-white/10",
                      tint,
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                </Link>
              ))}
            </div>

            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-label={open ? "Fermer le menu d'ajout" : "Ajouter"}
              className="gx-cta relative flex h-16 w-16 items-center justify-center rounded-[22px] transition-transform duration-200 active:scale-95"
            >
              <Plus className={cn("h-7 w-7 transition-transform duration-300", open && "rotate-[135deg]")} strokeWidth={2.2} />
            </button>
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
