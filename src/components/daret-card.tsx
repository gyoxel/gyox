"use client";

import { useState, useTransition } from "react";
import { useRefreshData } from "@/lib/use-refresh-data";
import { Check, Trash2 } from "lucide-react";
import type { DaretState } from "@/lib/daret";
import { monthLabelFr } from "@/lib/date";
import type { DaretWithExpense } from "@/lib/types";
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const percent = Math.round((paidRounds / daret.members) * 100);

  async function togglePaid() {
    if (paid == null || busy) return;
    const next = !paid;
    setPaid(next);
    setPaidRounds((n) => n + (next ? 1 : -1));
    setBusy(true);
    const res = next
      ? await fetch(`/api/expenses/${daret.expenseId}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ monthKey: currentMonthKey }),
        })
      : await fetch(`/api/expenses/${daret.expenseId}/payments?monthKey=${currentMonthKey}`, { method: "DELETE" });
    if (!res.ok) {
      setPaid(!next);
      setPaidRounds((n) => n + (next ? -1 : 1));
    }
    setBusy(false);
    await refreshData();
  }

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
            <span className="text-lg leading-none">{daret.expense.icon ?? "🤝"}</span>
            <span className="truncate">{daret.expense.name}</span>
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            {phaseBadge}
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              aria-label={`Supprimer ${daret.expense.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Cotisation mensuelle</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{formatMoney(daret.expense.amount, currency)}</p>
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
          <button
            type="button"
            onClick={togglePaid}
            disabled={busy}
            className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5 text-left transition-colors active:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:active:bg-slate-800"
          >
            <span className={cn("text-sm font-medium text-slate-800 dark:text-slate-200", paid && "text-slate-400 line-through")}>
              Cotisation de ce mois · {formatMoney(daret.expense.amount, currency)}
            </span>
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                paid ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800",
              )}
            >
              {paid && <Check className="h-3.5 w-3.5 text-white" />}
            </span>
          </button>
        )}

        <div className="rounded-xl bg-[#019c86]/10 px-3.5 py-3 dark:bg-[#019c86]/15">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#007261] dark:text-teal-300">Mon tour · {monthLabelFr(state.turn)}</p>
            <p className="text-xs font-semibold text-[#007261] dark:text-teal-300">
              {state.turnStatus === "now"
                ? "C'est ce mois-ci 🎉"
                : state.turnStatus === "received"
                  ? "Reçu ✓"
                  : daysToTurn != null
                    ? `J-${daysToTurn}`
                    : ""}
            </p>
          </div>
          <p className="mt-0.5 text-lg font-bold text-[#007261] dark:text-teal-200">
            {state.turnStatus === "received" ? "" : "+ "}
            {formatMoney(state.payout, currency)}
          </p>
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
