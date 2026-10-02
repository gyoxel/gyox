"use client";

import { useState, useTransition } from "react";
import { useRefreshData } from "@/lib/use-refresh-data";
import { Check, Trash2 } from "lucide-react";
import type { DaretState } from "@/lib/daret";
import { monthLabelFr } from "@/lib/date";
import type { DaretWithExpense, PaymentMethod } from "@/lib/types";
import { METHOD_META } from "@/lib/payment-method";
import { cn, formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ColorDot } from "@/components/color-dot";
import type { DisplayColor } from "@/lib/engine";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DaretCard({
  daret,
  state,
  currency,
  currentMonthKey,
  daysToTurn,
  color,
}: {
  daret: DaretWithExpense;
  color: DisplayColor;
  state: DaretState;
  currency: string;
  currentMonthKey: string;
  /** Days from today until the 1st of the turn month (only when upcoming). */
  daysToTurn: number | null;
}) {
  const refreshData = useRefreshData();
  const [paid, setPaid] = useState(state.paidThisMonth);
  const [paidRounds, setPaidRounds] = useState(state.paidRounds);
  const [busy, setBusy] = useState(false);
  /** Which question shows the 💵 / 💳 choice: this month's contribution or the payout. */
  const [choosing, setChoosing] = useState<"contribution" | "payout" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const percent = Math.round((paidRounds / daret.members) * 100);

  async function togglePaid(method: PaymentMethod | null = null) {
    if (paid == null || busy) return;
    setChoosing(null);
    const next = !paid;
    setPaid(next);
    setPaidRounds((n) => n + (next ? 1 : -1));
    setBusy(true);
    const res = next
      ? await fetch(`/api/expenses/${daret.expenseId}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ monthKey: currentMonthKey, method }),
        })
      : await fetch(`/api/expenses/${daret.expenseId}/payments?monthKey=${currentMonthKey}`, { method: "DELETE" });
    if (!res.ok) {
      setPaid(!next);
      setPaidRounds((n) => n + (next ? -1 : 1));
    }
    setBusy(false);
    await refreshData();
  }

  /** The pot collected on the turn, in cash or card (null: undo). */
  async function setPayout(method: PaymentMethod | null) {
    if (busy) return;
    setChoosing(null);
    setBusy(true);
    const res = await fetch(`/api/darets/${daret.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payoutMethod: method }),
    });
    setBusy(false);
    if (!res.ok) return;
    await refreshData();
  }

  const turnReached = state.turnStatus !== "upcoming";
  const payoutReceived = daret.payoutMethod != null;

  function handleDelete() {
    startDelete(async () => {
      const res = await fetch(`/api/darets/${daret.id}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmOpen(false);
        await refreshData();
      }
    });
  }

  const phaseBadge =
    state.phase === "upcoming" ? (
      <Badge variant="neutral">À venir</Badge>
    ) : state.phase === "finished" ? (
      <Badge variant="green">Terminée</Badge>
    ) : (
      <Badge variant="blue">
        Tour {state.round}/{daret.members}
      </Badge>
    );

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
            <ColorDot color={color} />
            <span className="text-lg leading-none">{daret.expense.icon ?? "🤝🏻"}</span>
            <span className="truncate">{daret.expense.name}</span>
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            {phaseBadge}
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              aria-label={`Supprimer ${daret.expense.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Cotisation mensuelle</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {formatMoney(daret.expense.amount, currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">Membres</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{daret.members}</p>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              {paidRounds} / {daret.members} cotisations payées
            </span>
            <span>{percent}%</span>
          </div>
          <Progress value={percent} indicatorClassName="bg-[#019c86]" />
          <p className="mt-1 text-xs text-slate-400">
            {monthLabelFr(state.start)} → {monthLabelFr(state.end)}
          </p>
        </div>

        {paid != null && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 py-1.5 pl-3.5 pr-1.5 dark:border-slate-800">
            <span
              className={cn(
                "text-sm font-medium text-slate-800 dark:text-slate-200",
                paid && "text-slate-400 line-through",
              )}
            >
              Cotisation de ce mois · {formatMoney(daret.expense.amount, currency)}
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
                    paid
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800",
                  )}
                >
                  {paid && <Check className="h-3.5 w-3.5 text-white" />}
                </span>
              </button>
            )}
          </div>
        )}

        <div className="rounded-xl bg-[#019c86]/10 px-3.5 py-3 dark:bg-[#019c86]/15">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#007261] dark:text-teal-300">
              Mon tour · {monthLabelFr(state.turn)}
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
          <p className="mt-0.5 text-lg font-bold text-[#007261] dark:text-teal-200">
            {payoutReceived ? "" : "+ "}
            {formatMoney(state.payout, currency)}
          </p>
          {turnReached &&
            (payoutReceived ? (
              <p className="mt-1 flex items-center justify-between text-[11px] text-[#007261]/80 dark:text-teal-300/80">
                <span>
                  Reçue en {METHOD_META[daret.payoutMethod!].label.toLowerCase()}
                  {daret.payoutReceivedAt &&
                    ` le ${new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Casablanca", day: "2-digit", month: "2-digit" }).format(new Date(daret.payoutReceivedAt))}`}
                </span>
                <button
                  type="button"
                  onClick={() => setPayout(null)}
                  disabled={busy}
                  className="font-medium underline underline-offset-2"
                >
                  Annuler
                </button>
              </p>
            ) : choosing === "payout" ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-white/70 py-1 pl-3 pr-1 dark:bg-slate-900/60">
                <span className="text-xs font-medium text-[#007261] dark:text-teal-300">Reçue comment ?</span>
                <MethodChoice label="Reçue" onPick={(m) => setPayout(m)} />
              </div>
            ) : (
              <Button
                type="button"
                className="mt-2 w-full bg-[#019c86] text-white hover:bg-[#007261]"
                onClick={() => setChoosing("payout")}
                disabled={busy}
              >
                <Check className="h-4 w-4" />
                J&apos;ai reçu la daret
              </Button>
            ))}
        </div>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette daret ?</DialogTitle>
            <DialogDescription>
              « {daret.expense.name} » et ses cotisations enregistrées seront définitivement supprimées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={isDeleting}>
              Annuler
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
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
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg shadow-sm transition-transform active:scale-90 dark:border-slate-700 dark:bg-slate-800"
        >
          {METHOD_META[m].emoji}
        </button>
      ))}
    </span>
  );
}
