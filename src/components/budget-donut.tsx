"use client";

import { useEffect, useId, useState } from "react";
import type { DisplayColor } from "@/lib/engine";
import { cn, formatMoney } from "@/lib/utils";

export interface DonutSegment {
  color: DisplayColor;
  label: string;
  amount: number;
  items: { id: string; name: string; icon: string; amount: number }[];
}

/** Light → deep stops of each color's gradient (🟠 🔵 🟡 🔴). */
const GRADIENT: Record<DisplayColor, [string, string]> = {
  orange: ["#fdba74", "#ea580c"],
  blue: ["#60a5fa", "#1d4ed8"],
  yellow: ["#fef08a", "#eab308"],
  red: ["#fb7185", "#be123c"],
};

const SIZE = 232;
const CENTER = SIZE / 2;
const STROKE = 26;
const RADIUS = CENTER - STROKE / 2 - 10; // room for the selected arc to grow
const GAP_PX = 4; // surface between two arcs

function point(angle: number): [number, number] {
  return [CENTER + RADIUS * Math.cos(angle), CENTER + RADIUS * Math.sin(angle)];
}

/** SVG arc from angle a0 to a1 (radians, 0 = 3 o'clock, clockwise). */
function arcPath(a0: number, a1: number): string {
  const [x0, y0] = point(a0);
  const [x1, y1] = point(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${x1} ${y1}`;
}

/**
 * A month's budget as a full ring: each group's share of the salary, and
 * what's left (white ⚪). Tap an arc — or its legend row — to see what it's
 * made of; tap again to close.
 */
export function BudgetDonut({
  segments,
  salary,
  currency,
}: {
  segments: DonutSegment[];
  salary: number;
  currency: string;
}) {
  const uid = useId().replace(/:/g, "");
  const [selected, setSelected] = useState<DisplayColor | null>(null);
  // Arcs sweep in once, right after the first paint.
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const shown = segments.filter((s) => s.amount > 0);
  const total = shown.reduce((s, x) => s + x.amount, 0);
  const rest = salary - total;
  // The ring is the salary; if spending goes over it, the ring is the spending.
  const base = Math.max(salary, total, 1);
  const pct = (amount: number) => (salary > 0 ? Math.round((amount / salary) * 100) : 0);

  // Angles, starting at 12 o'clock; each arc is trimmed by half a gap on both
  // ends, plus its rounded caps' radius when it's long enough to have them.
  const gapAngle = GAP_PX / RADIUS;
  const capAngle = STROKE / 2 / RADIUS;
  const multiple = shown.length + (rest > 0 ? 1 : 0) > 1;
  const sweeps = shown.map((s) => (s.amount / base) * 2 * Math.PI);
  const arcs = shown.map((s, i) => {
    const sweep = sweeps[i];
    const a0 = -Math.PI / 2 + sweeps.slice(0, i).reduce((sum, x) => sum + x, 0);
    const trim = multiple ? gapAngle / 2 : 0;
    const round = sweep - 2 * trim > 4 * capAngle;
    const inset = trim + (round ? capAngle : 0);
    const full = !multiple && sweep >= 2 * Math.PI - 1e-6;
    return {
      segment: s,
      d: full ? arcPath(a0, a0 + 2 * Math.PI - 0.0001) : arcPath(a0 + inset, a0 + sweep - inset),
      round: round || full,
      from: point(a0),
      to: point(a0 + sweep),
    };
  });

  const current = shown.find((s) => s.color === selected) ?? null;
  const toggle = (color: DisplayColor) => setSelected((c) => (c === color ? null : color));

  return (
    <div className="flex flex-col gap-5">
      <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          className="drop-shadow-[0_10px_18px_rgba(15,23,42,0.10)]"
        >
          <defs>
            {arcs.map(({ segment, from, to }) => (
              <linearGradient
                key={segment.color}
                id={`${uid}-${segment.color}`}
                gradientUnits="userSpaceOnUse"
                x1={from[0]}
                y1={from[1]}
                x2={to[0]}
                y2={to[1]}
              >
                <stop offset="0%" stopColor={GRADIENT[segment.color][0]} />
                <stop offset="100%" stopColor={GRADIENT[segment.color][1]} />
              </linearGradient>
            ))}
          </defs>

          {/* Track: what's left shows as white (⚪) with a soft edge. */}
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#e2e8f0" strokeWidth={STROKE + 2} />
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#ffffff" strokeWidth={STROKE - 2} />

          {arcs.map(({ segment, d, round }, i) => {
            const isSelected = segment.color === selected;
            const dimmed = selected != null && !isSelected;
            return (
              <path
                key={segment.color}
                d={d}
                pathLength={1}
                fill="none"
                stroke={`url(#${uid}-${segment.color})`}
                strokeWidth={isSelected ? STROKE + 8 : STROKE}
                strokeLinecap={round ? "round" : "butt"}
                strokeDasharray="1 1"
                strokeDashoffset={drawn ? 0 : 1}
                onClick={() => toggle(segment.color)}
                className={cn(
                  "cursor-pointer transition-[stroke-dashoffset,stroke-width,opacity] ease-out",
                  dimmed && "opacity-30",
                )}
                style={{
                  transitionDuration: drawn ? "700ms, 200ms, 200ms" : "0ms",
                  transitionDelay: `${i * 90}ms, 0ms, 0ms`,
                  filter: isSelected ? `drop-shadow(0 0 6px ${GRADIENT[segment.color][1]}66)` : undefined,
                }}
              >
                <title>{`${segment.label} · ${formatMoney(segment.amount, currency)}`}</title>
              </path>
            );
          })}
        </svg>

        {/* Center */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {current ? (
            <>
              <span className="max-w-[130px] text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {current.label}
              </span>
              <span className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {formatMoney(current.amount, currency)}
              </span>
              <span
                className="mt-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                style={{ background: `linear-gradient(135deg, ${GRADIENT[current.color][0]}, ${GRADIENT[current.color][1]})` }}
              >
                {pct(current.amount)}% du salaire
              </span>
            </>
          ) : (
            <>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Reste</span>
              <span
                className={cn(
                  "mt-0.5 text-3xl font-bold tabular-nums",
                  rest < 0 ? "text-rose-600" : "text-emerald-600",
                )}
              >
                {formatMoney(rest, currency)}
              </span>
              <span className="mt-1 text-xs text-slate-400">sur {formatMoney(salary, currency)}</span>
            </>
          )}
        </div>
      </div>

      {/* Legend (also the table view): every group with its share and amount. */}
      <div className="flex flex-col gap-1.5">
        {segments.map((s) => {
          const isSelected = s.color === selected;
          const [light, deep] = GRADIENT[s.color];
          return (
            <div key={s.color}>
              <button
                type="button"
                onClick={() => toggle(s.color)}
                disabled={s.amount <= 0}
                aria-expanded={isSelected}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-left text-sm transition-colors disabled:opacity-40",
                  isSelected ? "bg-slate-50 dark:bg-slate-800/60" : "active:bg-slate-50 dark:active:bg-slate-800/60",
                  selected != null && !isSelected && "opacity-55",
                )}
              >
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${light}, ${deep})` }}
                />
                <span className="min-w-0 flex-1 truncate font-medium text-slate-700 dark:text-slate-200">{s.label}</span>
                <span className="w-8 text-right text-xs font-medium tabular-nums text-slate-400">{pct(s.amount)}%</span>
                <span className="w-[4.75rem] text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                  {formatMoney(s.amount, currency)}
                </span>
              </button>
              {isSelected && s.items.length > 0 && (
                <ul className="mx-2 mb-1 mt-1 flex flex-col gap-2 border-l-2 pl-3" style={{ borderColor: deep }}>
                  {s.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm">
                      <span className="leading-none">{item.icon}</span>
                      <span className="flex-1 truncate text-slate-600 dark:text-slate-300">{item.name}</span>
                      <span className="font-medium tabular-nums text-slate-900 dark:text-white">
                        {formatMoney(item.amount, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        <div className="mt-1 flex items-center gap-2.5 border-t border-dashed border-slate-200 px-2 pt-3 text-sm dark:border-slate-700">
          <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-slate-300 bg-white shadow-sm" />
          <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">Reste</span>
          <span className="w-8 text-right text-xs font-medium tabular-nums text-slate-400">{pct(Math.max(0, rest))}%</span>
          <span className={cn("w-[4.75rem] text-right font-bold tabular-nums", rest < 0 ? "text-rose-600" : "text-emerald-600")}>
            {formatMoney(rest, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
