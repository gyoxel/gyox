"use client";

import { useState } from "react";
import type { DisplayColor } from "@/lib/engine";
import { COLOR_HEX } from "@/components/color-dot";
import { cn, formatMoney } from "@/lib/utils";

export interface DonutSegment {
  color: DisplayColor;
  label: string;
  amount: number;
  items: { id: string; name: string; icon: string; amount: number }[];
}

const SIZE = 200;
const STROKE = 30;
const RADIUS = (SIZE - STROKE) / 2 - 6; // room for the selected segment to grow
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 2; // px of surface between segments
const REST_COLOR = "#e2e8f0";

/**
 * A month's budget as a full ring: each color's share of the salary, plus
 * what's left (gray). Tap a segment — or its legend row — to see what it's
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
  const [selected, setSelected] = useState<DisplayColor | null>(null);
  const shown = segments.filter((s) => s.amount > 0);
  const total = shown.reduce((s, x) => s + x.amount, 0);
  const rest = salary - total;
  // The ring is the salary; if spending goes over it, the ring is the spending.
  const base = Math.max(salary, total, 1);
  const pct = (amount: number) => (salary > 0 ? Math.round((amount / salary) * 100) : 0);

  let offset = 0;
  const arcs = [
    ...shown.map((s) => ({ key: s.color as string, color: COLOR_HEX[s.color], amount: s.amount, segment: s })),
    ...(rest > 0 ? [{ key: "rest", color: REST_COLOR, amount: rest, segment: null }] : []),
  ].map((arc) => {
    const length = (arc.amount / base) * CIRCUMFERENCE;
    const start = offset;
    offset += length;
    return { ...arc, length, start };
  });
  const single = arcs.length === 1;

  const current = shown.find((s) => s.color === selected) ?? null;
  const toggle = (color: DisplayColor) => setSelected((c) => (c === color ? null : color));

  return (
    <div className="flex flex-col gap-4">
      <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} className="-rotate-90">
          {arcs.map((arc) => {
            const isSelected = arc.segment != null && arc.segment.color === selected;
            const dimmed = selected != null && !isSelected;
            const visible = Math.max(0, arc.length - (single ? 0 : GAP));
            return (
              <circle
                key={arc.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={isSelected ? STROKE + 8 : STROKE}
                strokeDasharray={`${visible} ${CIRCUMFERENCE - visible}`}
                strokeDashoffset={-arc.start}
                className={cn(
                  "transition-[stroke-width,opacity] duration-200",
                  arc.segment && "cursor-pointer",
                  dimmed && "opacity-35",
                )}
                onClick={arc.segment ? () => toggle(arc.segment!.color) : undefined}
              >
                <title>{`${arc.segment ? arc.segment.label : "Reste"} · ${formatMoney(arc.amount, currency)}`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {current ? (
            <>
              <span className="max-w-[120px] text-xs text-slate-500 dark:text-slate-400">{current.label}</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">{formatMoney(current.amount, currency)}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{pct(current.amount)}% du salaire</span>
            </>
          ) : (
            <>
              <span className="text-xs text-slate-500 dark:text-slate-400">Reste</span>
              <span className={cn("text-2xl font-bold", rest < 0 ? "text-rose-600" : "text-emerald-600")}>
                {formatMoney(rest, currency)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">sur {formatMoney(salary, currency)}</span>
            </>
          )}
        </div>
      </div>

      {/* Legend (also the table view): every segment with its amount and share. */}
      <div className="flex flex-col">
        {segments.map((s) => {
          const isSelected = s.color === selected;
          return (
            <div key={s.color} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
              <button
                type="button"
                onClick={() => toggle(s.color)}
                disabled={s.amount <= 0}
                aria-expanded={isSelected}
                className={cn(
                  "flex w-full items-center gap-2.5 py-2.5 text-left text-sm disabled:opacity-50",
                  selected != null && !isSelected && "opacity-60",
                )}
              >
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: COLOR_HEX[s.color] }} />
                <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">{s.label}</span>
                <span className="text-xs text-slate-400">{pct(s.amount)}%</span>
                <span className="w-24 text-right font-semibold text-slate-900 dark:text-white">
                  {formatMoney(s.amount, currency)}
                </span>
              </button>
              {isSelected && s.items.length > 0 && (
                <ul className="mb-2 flex flex-col gap-1.5 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
                  {s.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm">
                      <span className="leading-none">{item.icon}</span>
                      <span className="flex-1 truncate text-slate-700 dark:text-slate-200">{item.name}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{formatMoney(item.amount, currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        <div className="flex items-center gap-2.5 border-t border-dashed border-slate-200 pt-2.5 text-sm dark:border-slate-700">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: REST_COLOR }} />
          <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">Reste</span>
          <span className="text-xs text-slate-400">{pct(Math.max(0, rest))}%</span>
          <span className={cn("w-24 text-right font-bold", rest < 0 ? "text-rose-600" : "text-emerald-600")}>
            {formatMoney(rest, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
