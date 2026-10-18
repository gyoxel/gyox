"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CalendarDots, Cardholder, CaretRight, ChartLineUp, HandCoins, Handshake, Target, TrendUp } from "@phosphor-icons/react/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

// Every page worth a shortcut — not the ones the bar, the + menu or
// Accueil itself already open (Dépenses, Crédits, Solde, Épargne, Salaire),
// nor Profil / Paramètres / Catégories.
const ITEMS: { href: string; label: string; hint: string; icon: PhosphorIcon }[] = [
  { href: "/incomes", label: "Revenus", hint: "Prime, freelance, cadeau…", icon: TrendUp },
  { href: "/budgets", label: "Budgets", hint: "Transport, courses…", icon: Cardholder },
  { href: "/daret", label: "Daret", hint: "Tes darets et ton tour", icon: Handshake },
  { href: "/prets", label: "Argent prêté", hint: "Ce qu'on doit te rendre", icon: HandCoins },
  { href: "/goals", label: "Objectifs", hint: "Voiture, maison, voyage…", icon: Target },
  { href: "/calendar", label: "Calendrier", hint: "Jour par jour", icon: CalendarDots },
  { href: "/stats", label: "Statistiques", hint: "Répartition, prévisions", icon: ChartLineUp },
];
const N = ITEMS.length;

const ITEM_PX = 48; // finger travel for one item
const TAU = 325; // ms: how long a fling keeps going (exponential decay)
const MAX_FLING = 3 * N; // items, at most
const FLICK_PX_MS = 0.35; // slower than this on release: no momentum
// The wheel is as tall as the countdown tile beside it on Accueil: the
// centre card, one neighbour tucked under it on each side, and a second,
// fainter one under that, its far edge on the wheel's top / bottom.
const HEIGHT = 136;
const CARD_PX = 60; // a card's height
const SCALE = [1, 0.93, 0.86];
const OFFSET = [0, 24, (HEIGHT - CARD_PX * SCALE[2]) / 2]; // centre to centre, px
const OPACITY = [1, 0.85, 0.5];

/** Where the wheel was left, kept while the app stays open. */
let savedPos = 0;

/** Signed distance (in items) of item `i` from the centre, wrapped around. */
function offsetOf(i: number, pos: number): number {
  let d = (i - pos) % N;
  if (d < -N / 2) d += N;
  if (d >= N / 2) d -= N;
  return d;
}

/** `steps[0]` at 0, `steps[1]` at 1, `steps[2]` at 2, in between linearly. */
function along(steps: number[], a: number): number {
  const i = Math.min(1, Math.floor(a));
  return steps[i] + (steps[i + 1] - steps[i]) * Math.min(1, a - i);
}

/** Look of a card `d` items away from the centre: the closer, the bigger
 *  and clearer; two each side show as the edges of a stack (their content
 *  fades out first), the next ones fade away. */
function styleFor(d: number): React.CSSProperties & { "--wheel-content": string } {
  const a = Math.abs(d);
  const beyond = Math.max(0, a - 2); // past the second neighbour: going away
  const y = Math.sign(d) * (along(OFFSET, Math.min(a, 2)) + beyond * 6);
  const scale = along(SCALE, Math.min(a, 2)) - beyond * 0.04;
  const opacity = a <= 2 ? along(OPACITY, a) : Math.max(0, OPACITY[2] * (1 - beyond / 0.6));
  const content = Math.min(1, Math.max(0, 1 - (a - 0.3) / 0.45));
  return {
    "--wheel-content": content.toFixed(3),
    transform: `translate3d(0, calc(-50% + ${y.toFixed(2)}px), 0) scale(${scale.toFixed(4)})`,
    opacity: Number(opacity.toFixed(3)),
    zIndex: 100 - Math.round(a * 10),
    pointerEvents: a > 2.4 ? "none" : "auto",
  };
}

/**
 * Accueil shortcuts as a wheel of cards: the centre one big, two
 * neighbours each side stacked under it, smaller and fainter. Drag it like a
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
        card.style.zIndex = String(s.zIndex);
        card.style.pointerEvents = s.pointerEvents as string;
        card.style.setProperty("--wheel-content", s["--wheel-content"]);
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
      // isolate: the cards' z-index stays inside the wheel (it would put
      // them over the bar's + menu).
      className="@container relative isolate touch-none select-none outline-none"
      style={{ height: HEIGHT }}
    >
      {ITEMS.map(({ href, label, hint, icon: Icon }, i) => (
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
          style={{ ...styleFor(offsetOf(i, 0)), height: CARD_PX }}
          className="gx-wheel-card absolute inset-x-0 top-1/2 flex items-center gap-2.5 rounded-[22px] px-3 text-left will-change-transform @min-[16rem]:gap-3 @min-[16rem]:px-3.5"
        >
          <span className="gx-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-xl opacity-[var(--wheel-content)] @min-[16rem]:h-10 @min-[16rem]:w-10 @min-[16rem]:rounded-2xl">
            <Icon weight="duotone" className="h-5 w-5 @min-[16rem]:h-[22px] @min-[16rem]:w-[22px]" />
          </span>
          <span className="min-w-0 flex-1 opacity-[var(--wheel-content)]">
            <span className="block truncate text-[15px] font-semibold text-slate-900 @min-[16rem]:text-base dark:text-white">{label}</span>
            <span className="block truncate text-[11.5px] text-slate-500 @min-[16rem]:text-xs dark:text-slate-400">{hint}</span>
          </span>
          {/* Narrow (beside the countdown): no room for the arrow. */}
          <CaretRight weight="bold" className="hidden h-4 w-4 shrink-0 text-slate-300 opacity-[var(--wheel-content)] @min-[16rem]:block" />
        </button>
      ))}
    </div>
  );
}
