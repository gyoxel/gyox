"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChartNoAxesCombined, ChevronRight, HandCoins, Handshake, PiggyBank, Target, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; hint: string; icon: LucideIcon; tint: string }[] = [
  { href: "/incomes", label: "Revenus", hint: "Prime, freelance, cadeau…", icon: TrendingUp, tint: "from-emerald-400 to-green-600" },
  { href: "/solde", label: "Solde", hint: "Cash, carte, historique", icon: Wallet, tint: "from-indigo-400 to-violet-600" },
  { href: "/epargne", label: "Épargne", hint: "Argent mis de côté", icon: PiggyBank, tint: "from-lime-400 to-green-600" },
  { href: "/prets", label: "Prêts", hint: "Ce qu'on doit te rendre", icon: Handshake, tint: "from-amber-500 to-orange-700" },
  { href: "/daret", label: "Daret", hint: "Tes darets et ton tour", icon: HandCoins, tint: "from-teal-400 to-emerald-600" },
  { href: "/goals", label: "Objectifs", hint: "Voiture, maison, voyage…", icon: Target, tint: "from-amber-400 to-orange-500" },
  { href: "/stats", label: "Statistiques", hint: "Répartition, prévisions", icon: ChartNoAxesCombined, tint: "from-sky-400 to-blue-600" },
  { href: "/calendar", label: "Calendrier", hint: "Jour par jour", icon: CalendarDays, tint: "from-rose-400 to-pink-600" },
];
const N = ITEMS.length;

const ITEM_PX = 48; // finger travel for one item
const TAU = 325; // ms: how long a fling keeps going (exponential decay)
const MAX_FLING = 3 * N; // items, at most
const FLICK_PX_MS = 0.35; // slower than this on release: no momentum
const HEIGHT = 128;

/** Where the wheel was left, kept while the app stays open. */
let savedPos = 0;

/** Signed distance (in items) of item `i` from the centre, wrapped around. */
function offsetOf(i: number, pos: number): number {
  let d = (i - pos) % N;
  if (d < -N / 2) d += N;
  if (d >= N / 2) d -= N;
  return d;
}

/** Look of a card `d` items away from the centre: closer cards bigger and
 *  sharper, the far ones small, faded and blurred. */
function styleFor(d: number): React.CSSProperties {
  const a = Math.abs(d);
  // Neighbours tucked under the centre card, only their edge showing.
  const y = Math.sign(d) * (a <= 1 ? a * 30 : 30 + (a - 1) * 14);
  const scale = Math.max(0.78, 1 - 0.08 * a);
  const opacity = a <= 1 ? 1 - 0.15 * a : Math.max(0, 0.85 - 0.75 * (a - 1));
  const blur = Math.max(0, a - 0.6) * 1.6;
  return {
    transform: `translate3d(0, calc(-50% + ${y.toFixed(2)}px), 0) scale(${scale.toFixed(4)})`,
    opacity: a > 2.2 ? 0 : Number(opacity.toFixed(3)),
    filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none",
    zIndex: 100 - Math.round(a * 10),
    pointerEvents: a > 1.6 ? "none" : "auto",
  };
}

/**
 * Accueil shortcuts as a wheel of cards: the centre one big, its neighbours
 * smaller above and below, the next ones faded and blurred. Drag it like a
 * game wheel: slowly and it follows, flick it and it spins on, slowing down
 * until it settles on a card. Tap the centre card to open it, a side one
 * to bring it to the centre. It loops around.
 */
export function ShortcutWheel() {
  const router = useRouter();
  const root = useRef<HTMLDivElement | null>(null);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    for (const item of ITEMS) router.prefetch(item.href);

    let pos = savedPos;
    let raf = 0;
    let lastTick = Math.round(pos);
    let anim: { target: number; amplitude: number; start: number } | null = null;

    const render = (fromUser: boolean) => {
      savedPos = pos;
      cards.current.forEach((card, i) => {
        if (!card) return;
        const s = styleFor(offsetOf(i, pos));
        card.style.transform = s.transform as string;
        card.style.opacity = String(s.opacity);
        card.style.filter = s.filter as string;
        card.style.zIndex = String(s.zIndex);
        card.style.pointerEvents = s.pointerEvents as string;
        card.setAttribute("aria-selected", Math.abs(offsetOf(i, pos)) < 0.5 ? "true" : "false");
      });
      const tick = Math.round(pos);
      if (fromUser && tick !== lastTick) navigator.vibrate?.(4); // a click per card, like a wheel
      lastTick = tick;
    };

    const step = (now: number) => {
      if (!anim) return;
      const left = anim.amplitude * Math.exp(-(now - anim.start) / TAU);
      if (Math.abs(left) < 0.002) {
        pos = anim.target;
        anim = null;
        render(true);
        return;
      }
      pos = anim.target - left;
      render(true);
      raf = requestAnimationFrame(step);
    };
    const animateTo = (target: number) => {
      cancelAnimationFrame(raf);
      anim = { target, amplitude: target - pos, start: performance.now() };
      raf = requestAnimationFrame(step);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      anim = null;
    };

    render(false);

    // Drag / flick
    let drag: { id: number; y: number; startPos: number; t: number; moved: number; target: Element | null } | null = null;
    let samples: { t: number; y: number }[] = [];

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      stop();
      drag = { id: e.pointerId, y: e.clientY, startPos: pos, t: performance.now(), moved: 0, target: e.target as Element };
      samples = [{ t: performance.now(), y: e.clientY }];
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dy = e.clientY - drag.y;
      drag.moved = Math.max(drag.moved, Math.abs(dy));
      pos = drag.startPos - dy / ITEM_PX;
      const now = performance.now();
      samples.push({ t: now, y: e.clientY });
      while (samples.length > 2 && now - samples[0].t > 100) samples.shift();
      render(true);
    };
    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      if (d.moved < 8) {
        // A tap: open the centre card, or bring a side one to the centre.
        const card = d.target?.closest<HTMLElement>("[data-index]");
        if (!card) return animateTo(Math.round(pos));
        const off = offsetOf(Number(card.dataset.index), pos);
        if (Math.abs(off) < 0.5) {
          animateTo(Math.round(pos));
          router.push(ITEMS[Number(card.dataset.index)].href);
        } else animateTo(Math.round(pos + off));
        return;
      }
      const first = samples[0];
      const last = samples[samples.length - 1];
      const dt = last.t - first.t;
      const pxPerMs = dt > 0 && performance.now() - last.t < 80 ? (last.y - first.y) / dt : 0;
      // A slow drag settles on the nearest card; a flick spins on.
      const velocity = Math.abs(pxPerMs) < FLICK_PX_MS ? 0 : -pxPerMs / ITEM_PX; // items per ms
      const fling = Math.max(-MAX_FLING, Math.min(MAX_FLING, velocity * TAU));
      animateTo(Math.round(pos + fling));
    };

    // Mouse wheel / trackpad: one notch, one card.
    let wheelTimer = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      stop();
      pos += e.deltaY / (ITEM_PX * 2);
      render(true);
      clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => animateTo(Math.round(pos)), 120);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") animateTo(Math.round(pos) + 1);
      else if (e.key === "ArrowUp") animateTo(Math.round(pos) - 1);
      else if (e.key === "Enter") router.push(ITEMS[((Math.round(pos) % N) + N) % N].href);
      else return;
      e.preventDefault();
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("keydown", onKey);
    return () => {
      stop();
      clearTimeout(wheelTimer);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("keydown", onKey);
    };
  }, [router]);

  return (
    <div
      ref={root}
      data-no-tab-swipe
      role="listbox"
      aria-label="Raccourcis"
      tabIndex={0}
      className="relative touch-none select-none outline-none"
      style={{
        height: HEIGHT,
        maskImage: "linear-gradient(to bottom, transparent, black 5%, black 95%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent, black 5%, black 95%, transparent)",
      }}
    >
      {ITEMS.map(({ href, label, hint, icon: Icon, tint }, i) => (
        <button
          key={href}
          ref={(node) => {
            cards.current[i] = node;
          }}
          type="button"
          data-index={i}
          role="option"
          aria-selected={false}
          aria-label={label}
          tabIndex={-1}
          // Same look as the first frame drawn by the effect (centre: Revenus).
          style={styleFor(offsetOf(i, 0))}
          className={cn(
            "absolute inset-x-0 top-1/2 flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3 text-left will-change-transform",
            "shadow-[0_10px_30px_-8px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10",
          )}
        >
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
              tint,
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold text-slate-900 dark:text-white">{label}</span>
            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{hint}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
        </button>
      ))}
    </div>
  );
}
