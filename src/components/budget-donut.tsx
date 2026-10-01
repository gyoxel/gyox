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
  yellow: ["#fde047", "#eab308"],
  red: ["#fb7185", "#be123c"],
};

const SIZE = 248;
const C = SIZE / 2;
const OUTER = 112; // leaves room for the selected slice to zoom
const INNER = 68;
const LABEL_RADIUS = (OUTER + INNER) / 2;
const MIN_LABEL_PCT = 7; // smaller slices don't get a % label

const polar = (r: number, a: number): [number, number] => [C + r * Math.cos(a), C + r * Math.sin(a)];

/** Ring slice between angles a0 and a1 (radians, clockwise from 3 o'clock). */
function slicePath(a0: number, a1: number): string {
  // A full ring can't be one arc: split it in two halves.
  if (a1 - a0 >= 2 * Math.PI - 1e-6) {
    const mid = a0 + Math.PI;
    return `${slicePath(a0, mid)} ${slicePath(mid, a0 + 2 * Math.PI - 1e-4)}`;
  }
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [ox0, oy0] = polar(OUTER, a0);
  const [ox1, oy1] = polar(OUTER, a1);
  const [ix1, iy1] = polar(INNER, a1);
  const [ix0, iy0] = polar(INNER, a0);
  return `M ${ox0} ${oy0} A ${OUTER} ${OUTER} 0 ${large} 1 ${ox1} ${oy1} L ${ix1} ${iy1} A ${INNER} ${INNER} 0 ${large} 0 ${ix0} ${iy0} Z`;
}

/**
 * A month's budget as a big ring (each group's share of the salary, what's
 * left in white) with its legend underneath. Tapping a slice zooms it and fades
 * the others; the legend then shows only that group, with what it's made of
 * under its name. Tapping another slice switches; tapping it again closes.
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
  // The ring spins in once, right after the first paint.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const filled = segments.filter((s) => s.amount > 0);
  const total = filled.reduce((s, x) => s + x.amount, 0);
  const rest = salary - total;
  // The ring is the salary; if spending goes over it, the ring is the spending.
  const base = Math.max(salary, total, 1);
  const pct = (amount: number) => (salary > 0 ? Math.round((amount / salary) * 100) : 0);

  const parts = [
    ...filled.map((s) => ({ key: s.color as string, amount: s.amount, segment: s as DonutSegment | null })),
    ...(rest > 0 ? [{ key: "rest", amount: rest, segment: null }] : []),
  ];
  const sweeps = parts.map((p) => (p.amount / base) * 2 * Math.PI);
  const slices = parts.map((p, i) => {
    const a0 = -Math.PI / 2 + sweeps.slice(0, i).reduce((sum, x) => sum + x, 0);
    const a1 = a0 + sweeps[i];
    return { ...p, a0, a1, mid: (a0 + a1) / 2, from: polar(OUTER, a0), to: polar(OUTER, a1) };
  });

  const current = filled.find((s) => s.color === selected) ?? null;
  const toggle = (color: DisplayColor) => setSelected((c) => (c === color ? null : color));

  return (
    <div className="flex flex-col gap-5">
      {/* Ring */}
      <div
        className={cn(
          "relative mx-auto shrink-0 transition-[transform,opacity] duration-700 ease-out",
          shown ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-75 opacity-0",
        )}
        style={{ width: SIZE, height: SIZE }}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} className="overflow-visible">
          <defs>
            {slices.map(
              (s) =>
                s.segment && (
                  <linearGradient
                    key={s.key}
                    id={`${uid}-${s.key}`}
                    gradientUnits="userSpaceOnUse"
                    x1={s.from[0]}
                    y1={s.from[1]}
                    x2={s.to[0]}
                    y2={s.to[1]}
                  >
                    <stop offset="0%" stopColor={GRADIENT[s.segment.color][0]} />
                    <stop offset="100%" stopColor={GRADIENT[s.segment.color][1]} />
                  </linearGradient>
                ),
            )}
            <filter id={`${uid}-hole`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="1" stdDeviation="2.5" floodColor="#0f172a" floodOpacity="0.14" />
            </filter>
          </defs>

          {slices.map((s) => {
            const color = s.segment?.color ?? null;
            const isSelected = color != null && color === selected;
            const dimmed = selected != null && !isSelected;
            return (
              <path
                key={s.key}
                d={slicePath(s.a0, s.a1)}
                fill={s.segment ? `url(#${uid}-${s.key})` : "#ffffff"}
                stroke={s.segment ? "none" : "#e2e8f0"}
                strokeWidth={s.segment ? 0 : 1}
                onClick={color ? () => toggle(color) : undefined}
                className={cn("transition-[transform,opacity] duration-300 ease-out", color && "cursor-pointer")}
                style={{
                  transformOrigin: `${C}px ${C}px`,
                  transform: isSelected ? "scale(1.1)" : "scale(1)",
                  opacity: dimmed ? 0.3 : 1,
                  filter: isSelected && color ? `drop-shadow(0 3px 6px ${GRADIENT[color][1]}55)` : undefined,
                }}
              >
                <title>{`${s.segment ? s.segment.label : "Reste"} · ${formatMoney(s.amount, currency)}`}</title>
              </path>
            );
          })}

          {/* % on the slices big enough to hold it */}
          {slices.map((s) => {
            if (!s.segment || pct(s.amount) < MIN_LABEL_PCT) return null;
            const [x, y] = polar(LABEL_RADIUS, s.mid);
            const dimmed = selected != null && s.segment.color !== selected;
            return (
              <text
                key={`label-${s.key}`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                className="pointer-events-none fill-white text-[13px] font-bold transition-opacity duration-300"
                style={{ opacity: dimmed ? 0 : 1, textShadow: "0 1px 2px rgba(15,23,42,0.35)" }}
              >
                {pct(s.amount)}%
              </text>
            );
          })}

          {/* Raised center */}
          <circle cx={C} cy={C} r={INNER - 3} fill="#ffffff" filter={`url(#${uid}-hole)`} />
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="max-w-[100px] text-[10px] font-semibold uppercase leading-tight tracking-wider text-slate-400">
            Total des dépenses
          </span>
          <span className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-900">
            {formatMoney(total, currency)}
          </span>
        </div>
      </div>

      {/* Legend: all groups, or only the selected one with its details */}
      <div>
        {current ? (
          <div key={current.color} className="flex flex-col gap-2">
            <LegendRow
              color={current.color}
              label={current.label}
              amount={current.amount}
              percent={pct(current.amount)}
              currency={currency}
              onClick={() => toggle(current.color)}
              active
            />
            <ul className="mx-2 flex flex-col gap-2 border-l-2 pl-3" style={{ borderColor: GRADIENT[current.color][1] }}>
              {current.items.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <span className="leading-none">{item.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{item.name}</span>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                    {formatMoney(item.amount, currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {segments.map((s) => (
              <LegendRow
                key={s.color}
                color={s.color}
                label={s.label}
                amount={s.amount}
                percent={pct(s.amount)}
                currency={currency}
                onClick={s.amount > 0 ? () => toggle(s.color) : undefined}
              />
            ))}
            <div className="mt-1 flex items-center gap-2.5 border-t border-dashed border-slate-200 px-2 pt-3 text-[13px] dark:border-slate-700">
              <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-slate-300 bg-white" />
              <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">Reste</span>
              <span className="w-8 text-right text-xs tabular-nums text-slate-400">{pct(Math.max(0, rest))}%</span>
              <span className={cn("w-[4.75rem] text-right font-bold tabular-nums", rest < 0 ? "text-rose-600" : "text-emerald-600")}>
                {formatMoney(rest, currency)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LegendRow({
  color,
  label,
  amount,
  percent,
  currency,
  onClick,
  active = false,
}: {
  color: DisplayColor;
  label: string;
  amount: number;
  percent: number;
  currency: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const [light, deep] = GRADIENT[color];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-expanded={active}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-left text-[13px] transition-colors disabled:opacity-40",
        active ? "bg-slate-50 dark:bg-slate-800/60" : "active:bg-slate-50 dark:active:bg-slate-800/60",
      )}
    >
      <span
        className="h-3.5 w-3.5 shrink-0 rounded-full shadow-sm"
        style={{ background: `linear-gradient(135deg, ${light}, ${deep})` }}
      />
      <span className="min-w-0 flex-1 truncate font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <span className="w-8 text-right text-xs tabular-nums text-slate-400">{percent}%</span>
      <span className="w-[4.75rem] text-right font-bold tabular-nums text-slate-900 dark:text-white">
        {formatMoney(amount, currency)}
      </span>
    </button>
  );
}
