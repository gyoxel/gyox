"use client";

import { useState } from "react";
import { CaretDown, ClockCounterClockwise } from "@phosphor-icons/react/ssr";
import type { HistoryRow, HistoryScope, HistoryStep } from "@/lib/history";
import type { PaymentMethod } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";
import { formatDate, whenLabel } from "@/lib/i18n/dates";
import { useI18n } from "@/lib/i18n/client";
import { HEADER_BUTTON } from "@/components/header-button";
import { MethodIcon, MethodLabel } from "@/components/method-icon";
import { entryLabel } from "@/lib/entry-label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const TIME_ZONE = "Africa/Casablanca";

/**
 * The clock at the top of a page: a window with the page's last money
 * movements (all of them on Accueil), newest first, by day — each with its
 * name, time, cash / card and amount. One paid in several times opens with
 * its arrow on each of its steps. Only to look at: nothing opens from here.
 */
export function HistoryButton({ scope = "all" }: { scope?: HistoryScope }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ currency: string; rows: HistoryRow[] } | null>(null);
  const [failed, setFailed] = useState(false);

  function show() {
    setOpen(true);
    setFailed(false);
    fetch(`/api/history?scope=${scope}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setFailed(true));
  }

  return (
    <>
      <button type="button" onClick={show} aria-label={t("Historique")} className={HEADER_BUTTON}>
        <ClockCounterClockwise weight="bold" className="h-[19px] w-[19px]" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[82dvh] flex-col px-0 pb-3">
          <DialogHeader className="px-6">
            <DialogTitle>{t("Dernières opérations")}</DialogTitle>
            <DialogDescription>{scopeHint(scope, t)}</DialogDescription>
          </DialogHeader>
          <div className="-mb-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2">
            {failed ? (
              <Empty text={t("Impossible de charger l'historique.")} />
            ) : data == null ? (
              <Empty text={t("Chargement…")} />
            ) : data.rows.length === 0 ? (
              <Empty text={t("Aucune opération pour l'instant.")} />
            ) : (
              <Days rows={data.rows} currency={data.currency} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function scopeHint(scope: HistoryScope, t: (s: string) => string): string {
  switch (scope) {
    case "expenses":
      return t("Les dépenses payées, de la plus récente à la plus ancienne.");
    case "debts":
      return t("Les mensualités payées et l'argent emprunté.");
    case "loans":
      return t("L'argent prêté et ce qui t'a été rendu.");
    case "savings":
      return t("Ce qui a été mis de côté ou repris.");
    case "incomes":
      return t("Salaires, avances et revenus reçus.");
    case "darets":
      return t("Les versements et les darets reçues.");
    case "salary":
      return t("Salaires et avances reçus.");
    default:
      return t("Tout ce qui est entré et sorti, du plus récent au plus ancien.");
  }
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700">{text}</p>;
}

function Days({ rows, currency }: { rows: HistoryRow[]; currency?: string }) {
  const { lang, t } = useI18n();
  const now = new Date();
  const days: { title: string; rows: HistoryRow[] }[] = [];
  for (const r of rows) {
    const title = whenLabel(r.at, lang, t, now);
    if (days.at(-1)?.title !== title) days.push({ title, rows: [] });
    days.at(-1)!.rows.push(r);
  }
  return (
    <div className="flex flex-col gap-3">
      {days.map((d) => (
        <div key={d.title} className="flex flex-col gap-1.5">
          <h3 className="px-1 text-xs font-medium text-slate-400">{d.title}</h3>
          <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {d.rows.map((r) => (
              <li key={r.id} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                <Row row={r} currency={currency} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const amountOf = (s: Pick<HistoryStep, "kind" | "lines">) => (s.kind === "transfer" ? Math.abs(s.lines[1]?.amount ?? 0) : s.lines[0].amount);

function Row({ row, currency }: { row: HistoryRow; currency?: string }) {
  const { lang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const money = (n: number) => formatMoney(n, currency);
  const time = (at: string) => formatDate(new Date(at), lang, { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
  const split = row.steps.length > 1;
  const accounts: PaymentMethod[] = split ? [...new Set(row.steps.map((s) => s.lines[0].account))] : [];

  const body = (
    <>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg",
          row.kind === "transfer" || row.kind === "adjust" ? "bg-indigo-50 dark:bg-indigo-950/50" : amountOf(row) > 0 ? "bg-emerald-50 dark:bg-emerald-950/50" : "bg-rose-50 dark:bg-rose-950/50",
        )}
      >
        {row.emoji}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">{entryLabel(row, lang, t)}</span>
        <span className="flex items-center gap-1 text-[11px] tabular-nums text-slate-400">
          {time(row.at)} ·{" "}
          {row.kind === "transfer" ? (
            <>
              <MethodIcon method={row.lines[0].account} /> → <MethodIcon method={row.lines[1].account} />
            </>
          ) : split ? (
            <>
              {accounts.map((a) => (
                <MethodIcon key={a} method={a} />
              ))}{" "}
              {t("en {n} fois", { n: row.steps.length })}
            </>
          ) : (
            <MethodLabel method={row.lines[0].account} />
          )}
        </span>
      </span>
      <Amount value={amountOf(row)} transfer={row.kind === "transfer"} money={money} />
    </>
  );

  if (split)
    return (
      <>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 px-3 py-2.5 active:bg-slate-50 dark:active:bg-slate-800/60">
          {body}
          <CaretDown weight="bold" className={cn("h-4 w-4 shrink-0 text-violet-500 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <ol className="mx-3 mb-2.5 flex flex-col gap-0.5 rounded-xl bg-slate-50 px-3 py-1.5 dark:bg-slate-800/60">
            {row.steps.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2 py-1 text-xs">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600/10 text-[10px] font-bold text-violet-700 dark:text-violet-300">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate tabular-nums text-slate-600 dark:text-slate-300">
                  {whenLabel(s.at, lang, t)} · {time(s.at)}
                </span>
                <MethodLabel method={s.lines[0].account} />
                <Amount value={amountOf(s)} money={money} small />
              </li>
            ))}
          </ol>
        )}
      </>
    );
  return <div className="flex items-center gap-3 px-3 py-2.5">{body}</div>;
}

function Amount({ value, transfer = false, money, small = false }: { value: number; transfer?: boolean; money: (n: number) => string; small?: boolean }) {
  return (
    <span className={cn("shrink-0 font-bold tabular-nums", small ? "text-xs" : "text-sm", transfer ? "text-indigo-600 dark:text-indigo-400" : value > 0 ? "text-emerald-600" : "text-rose-600")}>
      {transfer ? "" : value > 0 ? "+" : "−"}
      {money(Math.abs(value))}
    </span>
  );
}
