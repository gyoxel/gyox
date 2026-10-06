"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Expense, Payment } from "@/lib/types";
import { addMonths, compareMonths, monthKey, monthLabelFr, monthOfDateStr, parseMonthKey, type MonthId } from "@/lib/date";
import { getCreditRealState, getEffectiveEndMonth, getMonthLedgerItems, projectCreditInstallment } from "@/lib/engine";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput } from "@/lib/utils";
import { mutate } from "@/lib/use-refresh-data";
import { errorMessage, keepAboveKeyboard } from "@/components/expense-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** How far ahead a never-ending expense can be given a month's own amount. */
const MONTHS_AHEAD = 24;

/** The expense with month `key` set to `amount` (null: its usual amount). */
function withMonthAmount(expense: Expense, key: string, amount: number | null): Expense {
  const next = { ...(expense.monthAmounts ?? {}) };
  if (amount == null) delete next[key];
  else next[key] = amount;
  return { ...expense, monthAmounts: Object.keys(next).length > 0 ? next : null };
}

/** What month `m` asks for, as the Accueil shows it (0: nothing). */
function amountIn(expense: Expense, payments: Payment[], m: MonthId, current: MonthId): number {
  return getMonthLedgerItems([expense], payments, m, current)[0]?.amount ?? 0;
}

/** A credit's last installment and its month, as things stand. */
function lastInstallment(expense: Expense, payments: Payment[], current: MonthId) {
  const state = getCreditRealState(expense, payments, current);
  if (state.status === "completed" || !state.projectedEndMonth) return null;
  const amount = projectCreditInstallment(expense, payments, state.projectedEndMonth, current);
  return amount == null ? null : { month: state.projectedEndMonth, amount };
}

/**
 * "Montant d'un mois": one month gets its own amount, that month only.
 * A recurring expense goes back to its usual amount the month after; a
 * credit carries the difference over to its last installment (400 instead
 * of 500 → the last one is 100 more).
 */
export function MonthAmountCard({
  expense,
  payments,
  currentMonthKey,
  currency,
}: {
  expense: Expense;
  /** This expense's payments. */
  payments: Payment[];
  currentMonthKey: string;
  currency: string;
}) {
  const isCredit = expense.type === "credit";
  const current = parseMonthKey(currentMonthKey);
  const money = (n: number) => formatMoney(n, currency);

  // From this month (or the expense's first) to its last one.
  const first = useMemo(() => {
    const start = monthOfDateStr(expense.startDate);
    return compareMonths(start, current) > 0 ? start : current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expense.startDate, currentMonthKey]);
  const last = useMemo(() => {
    if (isCredit) return getCreditRealState(expense, payments, current).projectedEndMonth ?? first;
    return getEffectiveEndMonth(expense, new Map()) ?? addMonths(first, MONTHS_AHEAD - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expense, payments, currentMonthKey, first, isCredit]);

  const [month, setMonth] = useState<MonthId>(first);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Keep the chosen month in range when the plan changes (e.g. after a save).
  const shown = compareMonths(month, last) > 0 ? last : compareMonths(month, first) < 0 ? first : month;
  const key = monthKey(shown);
  const label = monthLabelFr(shown);
  const custom = expense.monthAmounts?.[key] ?? null;
  const paidThisMonth = payments.some((p) => p.monthKey === key);
  const amountNow = amountIn(expense, payments, shown, current);
  const usual = amountIn(withMonthAmount(expense, key, null), payments, shown, current);

  const typed = value.trim() === "" ? null : parseDecimalInput(value);
  const typedValid = typed != null && Number.isFinite(typed) && (isCredit ? typed > 0 : typed >= 0);

  // A credit: what the change does to the end of it.
  const lastNow = isCredit ? lastInstallment(expense, payments, current) : null;
  const lastAfter =
    isCredit && typedValid ? lastInstallment(withMonthAmount(expense, key, typed), payments, current) : null;

  function go(step: number) {
    setMonth(addMonths(shown, step));
    setValue("");
    setError(null);
  }

  function save(amount: number | null) {
    setError(null);
    startTransition(async () => {
      const res = await mutate({
        method: "PUT",
        path: `/api/expenses/${expense.id}/month-amount`,
        body: { monthKey: key, amount },
      });
      if (!res.ok) return setError(await errorMessage(res));
      setValue("");
      toast.success(amount == null ? `${label} : retour au montant normal.` : `Montant de ${label} enregistré.`);
    });
  }

  const canPrev = compareMonths(shown, first) > 0;
  const canNext = compareMonths(shown, last) < 0;
  const accent = isCredit ? "text-blue-600 dark:text-sky-400" : "text-rose-600 dark:text-rose-400";

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            isCredit ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-sky-400" : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
          )}
        >
          <CalendarDays className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Montant d&apos;un mois</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isCredit
              ? "Paye plus ou moins un mois : la différence passe sur la dernière mensualité."
              : "Change le montant d'un seul mois : les autres mois ne bougent pas."}
          </p>
        </div>
      </div>

      {/* ‹ month › */}
      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-1 py-1 dark:bg-slate-800/60">
        <button
          type="button"
          aria-label="Mois précédent"
          disabled={!canPrev}
          onClick={() => go(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 active:bg-slate-200 disabled:opacity-30 dark:text-slate-400 dark:active:bg-slate-700"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold capitalize text-slate-900 dark:text-white">{label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span className={cn("font-semibold tabular-nums", custom != null ? accent : "text-slate-700 dark:text-slate-200")}>
              {amountNow > 0 ? money(amountNow) : "Rien ce mois-ci"}
            </span>
            {custom != null && <> · normalement {money(usual)}</>}
          </p>
        </div>
        <button
          type="button"
          aria-label="Mois suivant"
          disabled={!canNext}
          onClick={() => go(1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 active:bg-slate-200 disabled:opacity-30 dark:text-slate-400 dark:active:bg-slate-700"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {paidThisMonth ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          ✓ Ce mois est déjà payé. Pour changer son montant, décoche-le d&apos;abord.
        </p>
      ) : (
        <>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (typedValid) save(typed);
            }}
          >
            <Input
              aria-label={`Montant pour ${label} (DH)`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={value}
              onChange={(e) => {
                setValue(cleanDecimalInput(e.target.value));
                setError(null);
              }}
              placeholder={`Ce mois-là, ex : ${money(Math.max(0, Math.round(usual * 0.6)))}`}
              onFocus={(e) => keepAboveKeyboard(e.currentTarget)}
            />
            <Button type="submit" disabled={!typedValid || isPending} className="shrink-0">
              {isPending ? "…" : "Enregistrer"}
            </Button>
          </form>

          {typedValid ? (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              {isCredit ? (
                lastAfter ? (
                  <>
                    {label} : <b>{money(typed)}</b>. La dernière mensualité devient <b>{money(lastAfter.amount)}</b> en{" "}
                    {monthLabelFr(lastAfter.month).toLowerCase()}
                    {lastNow && (lastNow.amount !== lastAfter.amount || compareMonths(lastNow.month, lastAfter.month) !== 0) && (
                      <span className="text-slate-400">
                        {" "}
                        (au lieu de {money(lastNow.amount)} en {monthLabelFr(lastNow.month).toLowerCase()})
                      </span>
                    )}
                    .
                  </>
                ) : (
                  <>
                    {label} : <b>{money(typed)}</b> — le crédit est soldé ce mois-là 🎉
                  </>
                )
              ) : (
                <>
                  Juste pour {label.toLowerCase()} : <b>{typed > 0 ? money(typed) : "rien à payer"}</b>. Le mois d&apos;après revient à{" "}
                  {money(expense.amount)}.
                </>
              )}
            </p>
          ) : (
            !isCredit && <p className="text-[11px] text-slate-400">Mets 0 s&apos;il n&apos;y a rien à payer ce mois-là.</p>
          )}

          {custom != null && (
            <Button type="button" variant="outline" disabled={isPending} onClick={() => save(null)}>
              <RotateCcw className="h-4 w-4" />
              Revenir au montant normal ({money(usual)})
            </Button>
          )}
        </>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </section>
  );
}
