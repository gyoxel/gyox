"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Check, ChevronRight, Pencil, Plus, Sparkles, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/components/expense-editor";
import type { Goal, PaymentMethod } from "@/lib/types";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { METHOD_META } from "@/lib/payment-method";
import type { GoalProgress } from "@/lib/goals";
import { monthLabelFr, monthLabelShortFr } from "@/lib/date";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput } from "@/lib/utils";
import { mutate } from "@/lib/use-refresh-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Progress ring around the goal's emoji: solid = in hand, light = with darets. */
function GoalRing({
  size,
  stroke,
  now,
  projected,
  emoji,
  light = false,
}: {
  size: number;
  stroke: number;
  now: number;
  projected: number;
  emoji: string;
  /** On a coloured background. */
  light?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className={light ? "stroke-white/20" : "stroke-amber-100 dark:stroke-amber-950"}
        />
        {projected > now && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - projected / 100)}
            className={light ? "stroke-white/40" : "stroke-amber-300/60 dark:stroke-amber-700/60"}
          />
        )}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - now / 100)}
          className={light ? "stroke-white" : "stroke-orange-500"}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center" style={{ fontSize: size * 0.38 }}>
        {emoji}
      </span>
    </div>
  );
}

/**
 * One goal. In the list (`linkToDetail`): a short card with its ring, what's
 * there and the %, opening the detail page. On the detail page: a hero card
 * (ring, in hand / missing, + Versement, Modifier), the steps (savings,
 * deposits, each daret with the % it brings) and what's needed to finish.
 */
export function GoalCard({
  goal,
  progress,
  currency,
  linkToDetail = false,
  depositsPaid,
}: {
  goal: Goal;
  progress: GoalProgress;
  currency: string;
  linkToDetail?: boolean;
  /** Detail page: whether each deposit is paid (ticked in Dépenses). */
  depositsPaid?: Record<string, boolean>;
}) {
  const [adding, setAdding] = useState(false);
  const p = progress;
  const money = (n: number) => formatMoney(n, currency);

  if (linkToDetail) {
    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Link href={`/goals/${goal.id}`} className="flex items-center gap-3.5 p-4 active:bg-slate-50 dark:active:bg-slate-800/60">
          <GoalRing size={60} stroke={5} now={p.percentNow} projected={p.percentProjected} emoji={goal.emoji} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold text-slate-900 dark:text-white">{goal.name}</h3>
              {p.completed && (
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  Atteint 🎉
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <b className="font-semibold text-slate-800 dark:text-slate-100">{money(p.reachedNow)}</b> / {money(p.target)}
            </p>
            {p.percentProjected > p.percentNow ? (
              <p className="mt-0.5 text-[11px] text-orange-600 dark:text-amber-400">Avec tes darets : {p.percentProjected}%</p>
            ) : (
              !p.completed && <p className="mt-0.5 text-[11px] text-slate-400">Il manque {money(p.remainingNow)}</p>
            )}
          </div>
          <span className="shrink-0 text-xl font-bold tabular-nums text-orange-600 dark:text-amber-400">{p.percentNow}%</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
        </Link>
        <div className="grid grid-cols-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-orange-600 active:bg-slate-50 dark:text-amber-400 dark:active:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Versement
          </button>
          <Link
            href={`/goals/${goal.id}/edit`}
            className="flex items-center justify-center gap-1.5 border-l border-slate-100 py-2.5 text-sm font-medium text-slate-600 active:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:active:bg-slate-800"
          >
            <Pencil className="h-4 w-4" />
            Modifier
          </Link>
        </div>
        <DepositDialog goal={goal} currency={currency} open={adding} onOpenChange={setAdding} />
      </div>
    );
  }

  // The deposits step is shown as each deposit (oldest first), with the %
  // the goal reaches after it; not paid ones stay listed but don't count.
  type Row =
    | { kind: "step"; key: string; step: GoalProgress["steps"][number] }
    | { kind: "deposit"; key: string; deposit: Goal["deposits"][number]; paid: boolean; percent: number };
  const stepRow = (step: GoalProgress["steps"][number], i: number): Row => ({ kind: "step", key: `step-${i}`, step });
  const depositRows = [...goal.deposits].reverse().reduce<{ rows: Row[]; reached: number }>(
    (acc, d) => {
      const paid = depositsPaid?.[d.id] ?? true;
      const reached = acc.reached + (paid ? d.amount : 0);
      const percent = p.target > 0 ? Math.min(100, Math.round((reached / p.target) * 100)) : 0;
      return { rows: [...acc.rows, { kind: "deposit", key: `deposit-${d.id}`, deposit: d, paid, percent }], reached };
    },
    { rows: [], reached: goal.savedAmount },
  ).rows;
  const stepRows: Row[] = [
    ...p.steps.map(stepRow).filter((r) => r.kind === "step" && r.step.kind === "saved"),
    ...depositRows,
    ...p.steps.map(stepRow).filter((r) => r.kind === "step" && r.step.kind === "daret"),
  ];

  return (
    <>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-5 text-white shadow-lg shadow-orange-500/20 dark:shadow-none">
        <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4">
          <GoalRing size={88} stroke={7} now={p.percentNow} projected={p.percentProjected} emoji={goal.emoji} light />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
              {p.completed ? "Objectif atteint 🎉" : "Progression"}
            </p>
            <p className="text-4xl font-bold leading-tight tabular-nums">{p.percentNow}%</p>
            <p className="text-sm text-white/85">sur {money(p.target)}</p>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/15 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-white/75">Déjà là</p>
            <p className="text-sm font-bold tabular-nums">{money(p.reachedNow)}</p>
          </div>
          <div className="rounded-2xl bg-white/15 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-white/75">Il manque</p>
            <p className="text-sm font-bold tabular-nums">{money(p.remainingNow)}</p>
          </div>
        </div>
        {p.percentProjected > p.percentNow && (
          <p className="relative mt-2 text-xs text-white/85">
            Avec tes darets : <b>{p.percentProjected}%</b>
          </p>
        )}
        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <Button type="button" onClick={() => setAdding(true)} className="bg-white text-orange-600 hover:bg-white/90 dark:bg-white dark:text-orange-600">
            <Plus className="h-4 w-4" />
            Versement
          </Button>
          <Button asChild className="bg-white/20 text-white hover:bg-white/30 dark:bg-white/20 dark:text-white">
            <Link href={`/goals/${goal.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Modifier
            </Link>
          </Button>
        </div>
      </div>

      {/* Steps and deposits, in one list */}
      {(p.steps.length > 0 || goal.deposits.length > 0) && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Étapes et versements</h2>
          <ol className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {stepRows.map((row) =>
              row.kind === "deposit" ? (
                <li key={row.key} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                  <Link
                    href={`/goals/${goal.id}/deposits/${row.deposit.id}`}
                    className="flex items-center gap-3 px-4 py-3 text-sm active:bg-slate-50 dark:active:bg-slate-800/60"
                  >
                    <StepIcon>💵</StepIcon>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate font-medium text-slate-800 dark:text-slate-100", !row.paid && "text-slate-400")}>
                        {row.deposit.name}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        {DEPOSIT_DATE.format(new Date(`${row.deposit.date}T12:00:00`))}
                        {row.deposit.method && ` · ${METHOD_META[row.deposit.method].emoji}`}
                        {!row.paid && <span className="ml-1 font-semibold text-rose-500">· Non payé</span>}
                      </span>
                    </span>
                    <span className="text-right">
                      <span
                        className={cn(
                          "block font-semibold tabular-nums",
                          row.paid ? "text-slate-900 dark:text-white" : "text-slate-400 line-through",
                        )}
                      >
                        +{money(row.deposit.amount)}
                      </span>
                      {row.paid && (
                        <span className="block text-[11px] font-semibold tabular-nums text-orange-600 dark:text-amber-400">
                          → {row.percent}%
                        </span>
                      )}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </Link>
                </li>
              ) : (
                <li key={row.key} className="flex items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm first:border-t-0 dark:border-slate-800">
                  <StepIcon>{row.step.kind === "saved" ? "💰" : "🤝🏻"}</StepIcon>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-800 dark:text-slate-100">{row.step.label}</span>
                    <span className="block text-[11px] text-slate-400">
                      {row.step.month
                        ? row.step.received
                          ? `Reçue en ${monthLabelFr(row.step.month)}`
                          : `En ${monthLabelFr(row.step.month)}`
                        : "Disponible"}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold tabular-nums text-slate-900 dark:text-white">+{money(row.step.amount)}</span>
                    <span className="block text-[11px] font-semibold tabular-nums text-orange-600 dark:text-amber-400">
                      → {row.step.percent}%
                    </span>
                  </span>
                </li>
              ),
            )}
          </ol>
        </section>
      )}

      {/* What's needed */}
      {!p.completed && (
        <div className="flex flex-col gap-2 rounded-3xl bg-amber-50 px-4 py-3.5 text-sm text-slate-700 dark:bg-amber-950/30 dark:text-slate-200">
          {p.reachedByDaretsIn ? (
            <Insight icon={Sparkles}>
              Tes darets suffisent : objectif atteint en <b>{monthLabelFr(p.reachedByDaretsIn)}</b>.
            </Insight>
          ) : (
            p.remainingAfterDarets < p.remainingNow && (
              <Insight icon={Target}>
                Après tes darets, il manquera <b>{money(p.remainingAfterDarets)}</b>.
              </Insight>
            )
          )}
          {p.deadline && p.monthlyNeeded != null && p.monthsToDeadline != null && (
            <Insight icon={CalendarClock}>
              {p.monthsToDeadline <= 0 ? (
                <>
                  Date limite ({monthLabelShortFr(p.deadline)}) dépassée — il manque <b>{money(p.monthlyNeeded)}</b>.
                </>
              ) : p.monthlyNeeded > 0 ? (
                <>
                  Pour {monthLabelFr(p.deadline)} : mets <b>{money(p.monthlyNeeded)}/mois</b> de côté ({p.monthsToDeadline} mois).
                </>
              ) : (
                <>Atteint avant {monthLabelFr(p.deadline)} avec tes darets 👌</>
              )}
            </Insight>
          )}
          {goal.monthlySaving ? (
            <Insight icon={TrendingUp}>
              {p.estimatedMonth ? (
                <>
                  En mettant {money(goal.monthlySaving)}/mois : atteint en <b>{monthLabelFr(p.estimatedMonth)}</b>.
                </>
              ) : (
                <>En mettant {money(goal.monthlySaving)}/mois, il faudrait plus de 50 ans.</>
              )}
            </Insight>
          ) : (
            !p.deadline &&
            !p.reachedByDaretsIn &&
            p.remainingAfterDarets >= p.remainingNow && (
              <Insight icon={Target}>
                Il manque <b>{money(p.remainingNow)}</b>. Ajoute une épargne par mois ou une date dans « Modifier ».
              </Insight>
            )
          )}
        </div>
      )}

      <DepositDialog goal={goal} currency={currency} open={adding} onOpenChange={setAdding} />
    </>
  );
}

/** "+ Versement": money put aside for the goal, with an optional label. */
function DepositDialog({
  goal,
  currency,
  open,
  onOpenChange,
}: {
  goal: Goal;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [deposit, setDeposit] = useState("");
  const [depositName, setDepositName] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [saving, setSaving] = useState(false);

  async function addDeposit() {
    const value = parseDecimalInput(deposit);
    if (value <= 0) return;
    setSaving(true);
    const res = await mutate({
      method: "POST",
      path: `/api/goals/${goal.id}/deposits`,
      body: { amount: value, name: depositName.trim(), method },
    });
    setSaving(false);
    if (!res.ok) return toast.error(await errorMessage(res));
    toast.success(`+${formatMoney(value, currency)} pour ${goal.name} · ajouté aux dépenses`);
    onOpenChange(false);
    setDeposit("");
    setDepositName("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Versement · {goal.emoji} {goal.name}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`deposit-${goal.id}`}>Montant mis de côté (DH)</Label>
          <Input
            id={`deposit-${goal.id}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={deposit}
            onChange={(e) => setDeposit(cleanDecimalInput(e.target.value))}
            placeholder="Ex : 500"
            className="text-lg font-semibold"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`deposit-name-${goal.id}`}>Nom (optionnel)</Label>
          <Input
            id={`deposit-name-${goal.id}`}
            value={depositName}
            onChange={(e) => setDepositName(e.target.value)}
            placeholder="Ex : Prime, reste du mois…"
            maxLength={60}
          />
        </div>
        <PaymentMethodPicker value={method} onChange={setMethod} label="Pris en" />
        <p className="text-[11px] text-slate-400">Il s&apos;ajoute à l&apos;objectif et à tes dépenses (payé), et sort de ton solde.</p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={addDeposit}
            disabled={saving || parseDecimalInput(deposit) <= 0}
            className="bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-500 dark:text-white"
          >
            <Check className="h-4 w-4" />
            {saving ? "Ajout…" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const DEPOSIT_DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

function StepIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-base dark:bg-amber-950/40">
      {children}
    </span>
  );
}

function Insight({ icon: Icon, children }: { icon: typeof Target; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0 text-orange-500")} />
      <span>{children}</span>
    </p>
  );
}
