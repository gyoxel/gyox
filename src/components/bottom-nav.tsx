"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DATA_CHANGED_EVENT } from "@/lib/use-refresh-data";
import { Bank, HandArrowDown, HandArrowUp, HandCoins, Handshake, House, Lightning, PiggyBank, Plus, Receipt, SquaresFour, Target, Wallet } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { useCloseOnBack } from "@/lib/close-on-back";
import { msg } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { SIGNED_OUT_PAGES } from "@/lib/signed-out-pages";
import { QUICK_HREF } from "@/lib/quick-expense";

const ITEMS = [
  { href: "/", label: msg("Accueil"), icon: House },
  { href: "/budget", label: msg("Dépenses"), icon: Receipt },
  { href: "/credits", label: msg("Dettes"), icon: Bank },
  { href: "/menu", label: msg("Menu"), icon: SquaresFour },
];

// Pages opened from the Menu tab keep it highlighted.
const MENU_PATHS = ["/menu", "/budgets", "/daret", "/goals", "/calendar", "/stats", "/categories", "/salary", "/incomes", "/solde", "/epargne", "/prets", "/settings", "/profil", "/admin"];

// The + button's menu: everything that can be added, in one panel of
// glass just above it — each in its colour of meaning. The everyday ones
// on the bottom row, Dépense in the corner next to the + itself.
const ACTIONS = [
  { href: "/daret/new", label: msg("Daret"), icon: Handshake, tint: "text-amber-600 dark:text-amber-300" },
  { href: "/prets/new", label: msg("Argent prêté"), icon: HandCoins, tint: "text-rose-600 dark:text-rose-300" },
  { href: "/goals/new", label: msg("Objectif"), icon: Target, tint: "text-amber-600 dark:text-amber-300" },
  { href: "/epargne?ajouter=1", label: msg("Épargne"), icon: PiggyBank, tint: "text-emerald-600 dark:text-emerald-300" },
  { href: "/budgets/new", label: msg("Budget"), icon: Wallet, tint: "text-violet-600 dark:text-violet-300" },
  { href: "/expenses/new?type=credit", label: msg("Dette"), icon: Bank, tint: "text-violet-600 dark:text-violet-300" },
  { href: "/incomes/new", label: msg("Revenu"), icon: HandArrowDown, tint: "text-emerald-600 dark:text-emerald-300" },
  { href: "/expenses/new", label: msg("Dépense"), icon: HandArrowUp, tint: "text-rose-600 dark:text-rose-300" },
];

/** Holding the + this long opens Dépense rapide (a ring fills around it). */
const HOLD_MS = 550;
// The ring around the + (an SVG circle, its stroke drawn as it fills).
const RING_R = 34;
const RING_C = 2 * Math.PI * RING_R;

/** A tab: its icon and name — the current one filled, in violet, over the
 *  bar's glass lens. Tapped again on its own page scrolled down, it goes
 *  back to the top (like other apps); at the top, it opens afresh. */
function NavLink({
  href,
  label,
  icon: Icon,
  active,
  here,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof House;
  active: boolean;
  /** On this tab's own page (not one opened from it). */
  here: boolean;
  onNavigate: (href: string) => void;
}) {
  const t = useT();
  return (
    <Link
      href={href}
      prefetch
      data-nav="section"
      onClick={(e) => {
        if (!active) return onNavigate(href);
        if (!here || window.scrollY < 1) return;
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }}
      aria-current={active ? "page" : undefined}
      className="relative z-10 flex flex-1 touch-manipulation select-none flex-col items-center justify-center gap-1 transition-transform active:scale-95"
    >
      <Icon
        data-tint
        weight={active ? "fill" : "regular"}
        className={cn(
          "h-6 w-6 transition-colors duration-200",
          active ? "text-violet-700 dark:text-violet-200" : "text-slate-500 dark:text-slate-400",
        )}
      />
      <span
        data-tint
        className={cn(
          "text-[11px] leading-none transition-colors duration-200",
          active ? "font-bold text-violet-800 dark:text-white" : "font-semibold text-slate-500 dark:text-slate-400",
        )}
      >
        {t(label)}
      </span>
    </Link>
  );
}

// Everything reachable from the bar, kept prefetched so it opens at once
// (re-prefetched after every data change, which purges the cache). Down to
// their loading screen only: no database read until a page is opened — only
// the bar's own tabs (their <Link prefetch>) are prefetched with their data.
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
  QUICK_HREF,
  "/expenses/new?type=credit",
  "/daret/new",
  "/budgets/new",
  "/goals/new",
  "/prets/new",
  "/epargne",
];


export function BottomNav() {
  const pathname = usePathname();
  return SIGNED_OUT_PAGES.includes(pathname) ? null : <AppBar pathname={pathname} />;
}

function AppBar({ pathname }: { pathname: string }) {
  const router = useRouter();
  const t = useT();

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
  // The phone's back closes the menu, the page stays.
  useCloseOnBack(open, () => setOpen(false));

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

  // A tap on + opens the menu; holding it (the ring fills) opens Dépense
  // rapide. The click that follows a completed hold is ignored.
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  function startHold(e: React.PointerEvent) {
    if (open || (e.pointerType === "mouse" && e.button !== 0)) return;
    held.current = false;
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      held.current = true;
      setHolding(false);
      navigator.vibrate?.(15);
      router.push(QUICK_HREF);
    }, HOLD_MS);
  }
  function endHold() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHolding(false);
  }
  function tapPlus() {
    if (held.current) {
      held.current = false;
      return;
    }
    toggle();
  }

  return (
    <>
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-[#efeafc]/55 transition-opacity duration-300 dark:bg-[#05040f]/60",
          open ? "opacity-100 backdrop-blur-md" : "pointer-events-none opacity-0",
        )}
      />

      {/* The tabs on a capsule of glass, a lens sliding under the current
          one; floating above them on the right, the + — an orb of glass, its
          menu opening above it. Both stay put while the page scrolls. */}
      <nav
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]",
          typing && "hidden",
        )}
      >
        <div className="mx-auto flex max-w-md flex-col items-end gap-3">
          <div className="pointer-events-auto relative">
            {/* The + button's menu: a panel of glass just above it, all the
                things to add in a grid — big targets, near the thumb.
                Closed, it lets taps through to the page under it. */}
            <div
              role="menu"
              aria-label={t("Ajouter")}
              aria-hidden={!open}
              className={cn(
                "gx-float absolute bottom-full right-0 mb-3 w-[min(calc(100vw-2rem),28rem)] origin-bottom-right rounded-[28px] px-2.5 pb-2 pt-3.5 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.34,1.25,0.64,1)]",
                open ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none translate-y-3 scale-95 opacity-0",
              )}
            >
              <p className="px-2 pb-1.5 text-[13px] font-bold text-slate-500 dark:text-slate-400">{t("Ajouter")}</p>
              <div className="grid grid-cols-4">
                {ACTIONS.map(({ href, label, icon: Icon, tint }) => (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    tabIndex={open ? 0 : -1}
                    onClick={() => setOpen(false)}
                    className="flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 transition-[transform,background-color] active:scale-95 active:bg-violet-500/10"
                  >
                    <span className={cn("gx-pill flex h-[50px] w-[50px] items-center justify-center rounded-full", tint)}>
                      <Icon weight="duotone" className="h-6 w-6" />
                    </span>
                    <span className="whitespace-nowrap text-[12px] font-semibold text-slate-800 dark:text-slate-100">{t(label)}</span>
                  </Link>
                ))}
              </div>
              <Link
                href={QUICK_HREF}
                role="menuitem"
                tabIndex={open ? 0 : -1}
                onClick={() => setOpen(false)}
                className="mx-1 mt-1 flex items-center gap-2 rounded-2xl px-2.5 py-2 text-[12px] text-slate-500 active:bg-violet-500/10 dark:text-slate-400"
              >
                <Lightning weight="fill" className="h-4 w-4 shrink-0 text-rose-500" />
                <span>
                  <b className="font-semibold text-slate-800 dark:text-slate-100">{t("Dépense rapide")}</b> · {t("garde le doigt sur +")}
                </span>
              </Link>
            </div>

            {/* While the + is held: what it opens, above it. */}
            <span
              aria-hidden
              className={cn(
                "gx-float pointer-events-none absolute bottom-full right-0 mb-3 flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold text-slate-800 transition-[transform,opacity] dark:text-white",
                holding ? "translate-y-0 opacity-100 delay-150 duration-200" : "translate-y-1 opacity-0 duration-100",
              )}
            >
              <Lightning weight="fill" className="h-4 w-4 text-rose-500" />
              {t("Dépense rapide")}
            </span>

            <button
              type="button"
              onClick={tapPlus}
              onPointerDown={startHold}
              onPointerUp={endHold}
              onPointerLeave={endHold}
              onPointerCancel={endHold}
              onContextMenu={(e) => e.preventDefault()}
              aria-expanded={open}
              aria-label={open ? t("Fermer le menu d'ajout") : t("Ajouter")}
              className="gx-fab relative flex h-[60px] w-[60px] touch-manipulation select-none items-center justify-center rounded-full text-violet-700 transition-transform duration-200 [-webkit-touch-callout:none] active:scale-95 dark:text-violet-100"
            >
              <Plus weight="bold" className={cn("h-7 w-7 transition-transform duration-300", open && "rotate-[135deg]")} />
              {/* Fills while the + is held; full: Dépense rapide. */}
              <svg aria-hidden viewBox="0 0 76 76" className="pointer-events-none absolute -inset-2 h-[76px] w-[76px] -rotate-90">
                <circle
                  cx="38"
                  cy="38"
                  r={RING_R}
                  fill="none"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="stroke-rose-500"
                  style={{
                    strokeDasharray: RING_C,
                    strokeDashoffset: holding ? 0 : RING_C,
                    opacity: holding ? 1 : 0,
                    transition: holding ? `stroke-dashoffset ${HOLD_MS}ms linear, opacity 80ms` : "stroke-dashoffset 150ms ease-out, opacity 150ms",
                  }}
                />
              </svg>
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
              <NavLink key={item.href} {...item} active={isActive(item.href)} here={pathname === item.href} onNavigate={navigateTo} />
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
