"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Check, Pencil, Plus, Sparkles, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { Goal } from "@/lib/types";
import type { GoalProgress } from "@/lib/goals";
import { monthLabelFr, monthLabelShortFr } from "@/lib/date";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput } from "@/lib/utils";
import { useRefreshData } from "@/lib/use-refresh-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * One goal: progress today and once its darets have paid out, every step
 * (savings, each daret with its month and the % it brings the goal to), and
 * what's needed to finish (per month before the deadline, or the month the
 * planned saving gets there).
 */
export function GoalCard({
  goal,
  progress,
  currency,
  linkToDetail = false,
}: {
  goal: Goal;
  progress: GoalProgress;
  currency: string;
  /** In the list: a short card (no steps / insights); tapping it opens the
   *  goal's detail page. */
  linkToDetail?: boolean;
}) {
  const refreshData = useRefreshData();
  const [adding, setAdding] = useState(false);
  const [deposit, setDeposit] = useState("");
  const [depositName, setDepositName] = useState("");
  const [saving, setSaving] = useState(false);
  const p = progress;

  async function addDeposit() {
    const value = parseDecimalInput(deposit);
    if (value <= 0) return;
    setSaving(true);
    const res = await fetch(`/api/goals/${goal.id}/deposits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: value, name: depositName.trim() }),
    });
    setSaving(false);
    if (!res.ok) return toast.error("Versement impossible.");
    toast.success(`+${formatMoney(value, currency)} pour ${goal.name}`);
    setAdding(false);
    setDeposit("");
    setDepositName("");
    await refreshData();
  }

  const body = (
    <div className="flex flex-col gap-3.5 p-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-100 text-2xl dark:from-teal-950 dark:to-emerald-900">
            {goal.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-slate-900 dark:text-white">{goal.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Objectif {formatMoney(p.target, currency)}</p>
          </div>
          {p.completed ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              Atteint 🎉
            </span>
          ) : (
            <span className="text-2xl font-bold tabular-nums text-[#007261] dark:text-teal-300">{p.percentNow}%</span>
          )}
        </div>

        {/* Progress: solid = in hand today, light = once the darets have paid out */}
        <div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            {p.percentProjected > p.percentNow && (
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[repeating-linear-gradient(135deg,#99f6e4_0_6px,#ccfbf1_6px_12px)] dark:bg-[repeating-linear-gradient(135deg,#115e59_0_6px,#134e4a_6px_12px)]"
                style={{ width: `${p.percentProjected}%` }}
              />
            )}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#00c3ab] to-[#007261]"
              style={{ width: `${p.percentNow}%` }}
            />
          </div>
          {p.percentProjected > p.percentNow && (
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              Avec tes darets : <span className="font-semibold text-[#007261] dark:text-teal-300">{p.percentProjected}%</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Déjà là</p>
            <p className="font-bold tabular-nums text-slate-900 dark:text-white">{formatMoney(p.reachedNow, currency)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">Il manque</p>
            <p className={cn("font-bold tabular-nums", p.remainingNow > 0 ? "text-rose-600" : "text-emerald-600")}>
              {formatMoney(p.remainingNow, currency)}
            </p>
          </div>
        </div>

        {/* Steps and insights: on the detail page only, the list stays short */}
        {!linkToDetail && p.steps.length > 0 && (
          <ol className="flex flex-col gap-2 border-l-2 border-teal-200 pl-3 dark:border-teal-900">
            {p.steps.map((step, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="leading-none">{step.kind === "saved" ? "💰" : step.kind === "deposits" ? "💵" : "🤝🏻"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-700 dark:text-slate-200">{step.label}</span>
                  <span className="block text-[11px] text-slate-400">
                    {step.month ? (step.received ? `Reçue en ${monthLabelFr(step.month)}` : `En ${monthLabelFr(step.month)}`) : "Disponible"}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums text-slate-900 dark:text-white">
                    +{formatMoney(step.amount, currency)}
                  </span>
                  <span className="block text-[11px] font-medium tabular-nums text-[#007261] dark:text-teal-300">
                    → {step.percent}%
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}

        {!linkToDetail && !p.completed && (
          <div className="flex flex-col gap-1.5 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            {p.reachedByDaretsIn ? (
              <Insight icon={Sparkles}>
                Tes darets suffisent : objectif atteint en <b>{monthLabelFr(p.reachedByDaretsIn)}</b>.
              </Insight>
            ) : (
              p.remainingAfterDarets < p.remainingNow && (
                <Insight icon={Target}>
                  Après tes darets, il manquera <b>{formatMoney(p.remainingAfterDarets, currency)}</b>.
                </Insight>
              )
            )}
            {p.deadline && p.monthlyNeeded != null && p.monthsToDeadline != null && (
              <Insight icon={CalendarClock}>
                {p.monthsToDeadline <= 0 ? (
                  <>
                    Date limite ({monthLabelShortFr(p.deadline)}) dépassée — il manque{" "}
                    <b>{formatMoney(p.monthlyNeeded, currency)}</b>.
                  </>
                ) : p.monthlyNeeded > 0 ? (
                  <>
                    Pour {monthLabelFr(p.deadline)} : mets <b>{formatMoney(p.monthlyNeeded, currency)}/mois</b> de côté (
                    {p.monthsToDeadline} mois).
                  </>
                ) : (
                  <>Atteint avant {monthLabelFr(p.deadline)} avec tes darets 👌</>
                )}
              </Insight>
            )}
            {goal.monthlySaving && (
              <Insight icon={TrendingUp}>
                {p.estimatedMonth ? (
                  <>
                    En mettant {formatMoney(goal.monthlySaving, currency)}/mois : atteint en{" "}
                    <b>{monthLabelFr(p.estimatedMonth)}</b>.
                  </>
                ) : (
                  <>En mettant {formatMoney(goal.monthlySaving, currency)}/mois, il faudrait plus de 50 ans.</>
                )}
              </Insight>
            )}
          </div>
        )}
    </div>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {linkToDetail ? (
        <Link href={`/goals/${goal.id}`} className="block active:bg-slate-50 dark:active:bg-slate-800/60">
          {body}
        </Link>
      ) : (
        body
      )}

      <div className="grid grid-cols-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-[#007261] active:bg-slate-50 dark:text-teal-300 dark:active:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Versement
        </button>
        <Link
          href={`/goals/${goal.id}/edit`}
          className="flex items-center justify-center gap-1.5 border-l border-slate-100 py-3 text-sm font-medium text-slate-600 active:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:active:bg-slate-800"
        >
          <Pencil className="h-4 w-4" />
          Modifier
        </Link>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Versement · {goal.emoji} {goal.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`deposit-name-${goal.id}`}>Nom</Label>
            <Input
              id={`deposit-name-${goal.id}`}
              value={depositName}
              onChange={(e) => setDepositName(e.target.value)}
              placeholder="Ex: Prime, reste du mois…"
              maxLength={60}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`deposit-${goal.id}`}>Montant mis de côté (DH)</Label>
            <Input
              id={`deposit-${goal.id}`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={deposit}
              onChange={(e) => setDeposit(cleanDecimalInput(e.target.value))}
              placeholder="Ex: 500"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAdding(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="button" onClick={addDeposit} disabled={saving || parseDecimalInput(deposit) <= 0}>
              <Check className="h-4 w-4" />
              {saving ? "Ajout…" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Insight({ icon: Icon, children }: { icon: typeof Target; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#019c86]" />
      <span>{children}</span>
    </p>
  );
}
