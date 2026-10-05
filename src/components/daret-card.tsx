"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "@/lib/use-refresh-data";
import { errorMessage } from "@/components/expense-editor";
import type { DaretState } from "@/lib/daret";
import { addMonths, monthKey, monthLabelFr, monthLabelShortFr } from "@/lib/date";
import type { DaretWithExpense, PaymentMethod } from "@/lib/types";
import { METHOD_META } from "@/lib/payment-method";
import { cn, formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const short = (label: string) => label.replace(/ 20(\d\d)$/, " $1");

/**
 * One daret: its contribution and members, the rounds as a strip (paid,
 * this month, my turn), this month's contribution to tick (cash / card),
 * and my turn with its pot — confirmed received in cash or card.
 */
export function DaretCard({
  daret,
  state,
  currency,
  currentMonthKey,
  daysToTurn,
}: {
  daret: DaretWithExpense;
  state: DaretState;
  currency: string;
  currentMonthKey: string;
  /** Days from today until the 1st of the turn month (only when upcoming). */
  daysToTurn: number | null;
}) {
  const [paid, setPaid] = useState(state.paidThisMonth);
  const [paidMonths, setPaidMonths] = useState(() => new Set(state.paidMonths));
  const [busy, setBusy] = useState(false);
  /** Which question shows the 💵 / 💳 choice: this month's contribution or the payout. */
  const [choosing, setChoosing] = useState<"contribution" | "payout" | null>(null);
  const money = (n: number) => formatMoney(n, currency);

  const percent = Math.round((paidMonths.size / daret.members) * 100);
  const rounds = Array.from({ length: daret.members }, (_, i) => monthKey(addMonths(state.start, i)));
  const turnKey = monthKey(state.turn);

  async function togglePaid(method: PaymentMethod | null = null) {
    if (paid == null || busy) return;
    setChoosing(null);
    const next = !paid;
    const flip = (on: boolean) =>
      setPaidMonths((s) => {
        const copy = new Set(s);
        if (on) copy.add(currentMonthKey);
        else copy.delete(currentMonthKey);
        return copy;
      });
    setPaid(next);
    flip(next);
    setBusy(true);
    const res = next
      ? await mutate({
          method: "POST",
          path: `/api/expenses/${daret.expenseId}/payments`,
          body: { monthKey: currentMonthKey, method },
        })
      : await mutate({ method: "DELETE", path: `/api/expenses/${daret.expenseId}/payments?monthKey=${currentMonthKey}` });
    if (!res.ok) {
      setPaid(!next);
      flip(!next);
      toast.error(await errorMessage(res));
    }
    setBusy(false);
  }

  /** The pot collected on the turn, in cash or card (null: undo). */
  async function setPayout(method: PaymentMethod | null) {
    if (busy) return;
    setChoosing(null);
    setBusy(true);
    const res = await mutate({ method: "PATCH", path: `/api/darets/${daret.id}`, body: { payoutMethod: method } });
    setBusy(false);
    if (!res.ok) toast.error(await errorMessage(res));
  }

  const turnReached = state.turnStatus !== "upcoming";
  const payoutReceived = daret.payoutMethod != null;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 text-xl shadow-sm">
          {daret.expense.icon ?? "🤝🏻"}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-slate-900 dark:text-white">{daret.expense.name}</h3>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            <b className="font-semibold text-slate-700 dark:text-slate-200">{money(daret.expense.amount)}</b>/mois · {daret.members} mbr.
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            state.phase === "running"
              ? "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300"
              : state.phase === "finished"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
          )}
        >
          {state.phase === "running" ? `Tour ${state.round}/${daret.members}` : state.phase === "finished" ? "Terminée" : "À venir"}
        </span>
        <Link
          href={`/daret/${daret.id}`}
          aria-label={`Modifier ${daret.expense.name}`}
          className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Pencil className="h-4 w-4" />
        </Link>
      </div>

      {/* Rounds */}
      <div className="px-4 pt-4">
        <div className="flex gap-1" aria-label={`${paidMonths.size} cotisations payées sur ${daret.members}`}>
          {rounds.map((key) => {
            const isPaid = paidMonths.has(key);
            const isNow = key === currentMonthKey;
            const isTurn = key === turnKey;
            return (
              <span key={key} className="relative flex-1">
                {isTurn && <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[11px] leading-none">🎉</span>}
                <span
                  className={cn(
                    "block h-2 rounded-full",
                    isPaid ? "bg-gradient-to-r from-teal-400 to-emerald-500" : "bg-slate-200 dark:bg-slate-700",
                    isNow && !isPaid && "bg-amber-300 dark:bg-amber-500/70",
                    isTurn && "ring-2 ring-emerald-500/40 ring-offset-1 ring-offset-white dark:ring-offset-slate-900",
                  )}
                />
              </span>
            );
          })}
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
          <span>
            {paidMonths.size}/{daret.members} payées · {percent}%
          </span>
          <span>
            {short(monthLabelShortFr(state.start))} → {short(monthLabelShortFr(state.end))}
          </span>
        </div>
      </div>

      {/* This month's contribution */}
      {paid != null && (
        <div className="mx-4 mt-3 flex items-center justify-between gap-2 rounded-2xl bg-slate-50 py-1.5 pl-3.5 pr-1.5 dark:bg-slate-800/60">
          <span className={cn("text-sm font-medium text-slate-800 dark:text-slate-200", paid && "text-slate-400 line-through")}>
            Cotisation de ce mois · {money(daret.expense.amount)}
          </span>
          {choosing === "contribution" ? (
            <MethodChoice label="Payée" onPick={(m) => togglePaid(m)} />
          ) : (
            <button
              type="button"
              onClick={() => (paid ? togglePaid() : setChoosing("contribution"))}
              disabled={busy}
              aria-label={paid ? "Annuler la cotisation de ce mois" : "Marquer la cotisation de ce mois comme payée"}
              className="flex h-9 w-9 shrink-0 items-center justify-center disabled:opacity-60"
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
                  paid ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800",
                )}
              >
                {paid && <Check className="h-3.5 w-3.5 text-white" />}
              </span>
            </button>
          )}
        </div>
      )}

      {/* My turn */}
      <div className="m-4 mt-3 rounded-2xl bg-gradient-to-br from-teal-400/15 to-emerald-500/15 px-4 py-3 dark:from-teal-400/10 dark:to-emerald-500/10">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-[#007261] dark:text-teal-300">
            Mon tour · <span className="capitalize">{monthLabelFr(state.turn)}</span>
          </p>
          <p className="text-xs font-semibold text-[#007261] dark:text-teal-300">
            {payoutReceived
              ? `Reçue ✓ ${METHOD_META[daret.payoutMethod!].emoji}`
              : state.turnStatus === "now"
                ? "C'est ce mois-ci 🎉"
                : state.turnStatus === "received"
                  ? "À confirmer"
                  : daysToTurn != null
                    ? `J-${daysToTurn}`
                    : ""}
          </p>
        </div>
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-[#007261] dark:text-teal-200">
          {payoutReceived ? "" : "+ "}
          {money(state.payout)}
        </p>
        {turnReached &&
          (payoutReceived ? (
            <p className="mt-1 flex items-center justify-between text-[11px] text-[#007261]/80 dark:text-teal-300/80">
              <span>
                Reçue en {METHOD_META[daret.payoutMethod!].label.toLowerCase()}
                {daret.payoutReceivedAt &&
                  ` le ${new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Casablanca", day: "2-digit", month: "2-digit" }).format(new Date(daret.payoutReceivedAt))}`}
              </span>
              <button type="button" onClick={() => setPayout(null)} disabled={busy} className="font-medium underline underline-offset-2">
                Annuler
              </button>
            </p>
          ) : choosing === "payout" ? (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-white/80 py-1 pl-3 pr-1 dark:bg-slate-900/60">
              <span className="text-xs font-medium text-[#007261] dark:text-teal-300">Reçue comment ?</span>
              <MethodChoice label="Reçue" onPick={(m) => setPayout(m)} />
            </div>
          ) : (
            <Button
              type="button"
              className="mt-2 w-full bg-[#019c86] text-white hover:bg-[#007261] dark:bg-[#019c86] dark:text-white"
              onClick={() => setChoosing("payout")}
              disabled={busy}
            >
              <Check className="h-4 w-4" />
              J&apos;ai reçu la daret
            </Button>
          ))}
      </div>
    </div>
  );
}

/** 💵 / 💳: how it was paid / received. */
function MethodChoice({ label, onPick }: { label: string; onPick: (method: PaymentMethod) => void }) {
  return (
    <span className="flex shrink-0 items-center gap-1" aria-label={`${label} comment ?`}>
      {(["cash", "card"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onPick(m)}
          aria-label={`${label} en ${METHOD_META[m].label}`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg shadow-sm transition-transform active:scale-90 dark:border-slate-700 dark:bg-slate-800"
        >
          {METHOD_META[m].emoji}
        </button>
      ))}
    </span>
  );
}
