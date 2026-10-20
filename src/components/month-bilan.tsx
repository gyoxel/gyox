"use client";

import { useState } from "react";
import Link from "next/link";
import { CaretRight, ChartBar, X } from "@phosphor-icons/react/ssr";
import { BILAN_COOKIE, type MonthBilanData } from "@/lib/month-bilan";
import { SliceChange, sliceLabel } from "@/components/category-bars";
import { useT } from "@/lib/i18n/client";
import { cn, formatMoney } from "@/lib/utils";

/**
 * Accueil, the first days of a month: the month just over — what came in,
 * what went out, what's left, what was put aside, its biggest categories.
 * Amounts follow Disponible's eye; × closes it until next month.
 */
export function MonthBilan({ data, currency, revealed }: { data: MonthBilanData; currency: string; revealed: boolean }) {
  const t = useT();
  const [closed, setClosed] = useState(false);
  if (closed) return null;
  const show = (n: number) => (revealed ? formatMoney(n, currency) : "•••• DH");
  const left = Math.round((data.moneyIn - data.moneyOut) * 100) / 100;

  function close() {
    document.cookie = `${BILAN_COOKIE}=${data.monthKey}; path=/; max-age=${60 * 60 * 24 * 45}; samesite=lax`;
    setClosed(true);
  }

  return (
    <section className="gx-glass flex flex-col gap-3 rounded-[22px] border p-3.5" aria-label={t("Bilan de {month}", { month: data.monthLabel })}>
      <div className="flex items-center gap-2.5">
        <span className="gx-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--gx-tile-ink)]">
          <ChartBar weight="duotone" className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
            {t("Bilan de {month}", { month: data.monthLabel })}
          </span>
          <span className="block truncate text-[11.5px] text-slate-500 dark:text-slate-400">{t("Le mois qui vient de finir")}</span>
        </span>
        <button type="button" onClick={close} aria-label={t("Fermer")} className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-400">
          <X weight="bold" className="h-3.5 w-3.5" />
        </button>
      </div>

      {(data.moneyIn > 0 || data.moneyOut > 0) && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <Figure label={t("Entrées")} value={show(data.moneyIn)} className="text-emerald-600 dark:text-emerald-400" />
          <Figure label={t("Sorties")} value={show(data.moneyOut)} className="text-rose-600 dark:text-rose-400" />
          <Figure
            label={t("Reste")}
            value={revealed ? `${left < 0 ? "−" : ""}${formatMoney(Math.abs(left), currency)}` : "•••• DH"}
            className="text-slate-900 dark:text-white"
          />
        </div>
      )}
      {data.putAside > 0 && (
        <p className="-mt-1 text-center text-[11.5px] text-slate-500 dark:text-slate-400">
          🐷 {t("Dont {amount} mis de côté", { amount: show(data.putAside) })}
        </p>
      )}

      {data.top.length > 0 && (
        <ul className="flex flex-col gap-1.5 border-t border-slate-200/70 pt-2.5 dark:border-slate-700/60">
          {data.top.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-[13px]">
              <span className="leading-none">{s.emoji}</span>
              <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{sliceLabel(s, t)}</span>
              <SliceChange amount={s.amount} previous={s.previous} />
              <span data-private className="tabular-nums font-semibold text-slate-900 dark:text-white">
                {show(s.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={`/bilan?month=${data.monthKey}`}
        className="flex items-center justify-center gap-1 text-xs font-semibold text-violet-700 active:opacity-70 dark:text-violet-300"
      >
        {t("Voir le détail")}
        <CaretRight weight="bold" className="h-3 w-3" />
      </Link>
    </section>
  );
}

function Figure({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className="rounded-2xl bg-white/60 px-1.5 py-2 dark:bg-slate-900/40">
      <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p data-private className={cn("truncate text-[13px] font-bold tabular-nums", className)}>
        {value}
      </p>
    </div>
  );
}
