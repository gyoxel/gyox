"use client";

import { useState } from "react";
import Link from "next/link";
import { CaretRight, Check, ClockCountdown, PencilSimple, Plus, Sparkle, Target, TrendUp } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { errorMessage } from "@/components/expense-editor";
import type { DepositSource, Goal } from "@/lib/types";
import { DepositSourcePicker } from "@/components/payment-method-picker";
import type { GoalProgress } from "@/lib/goals";
import { parseMonthKey, type MonthId } from "@/lib/date";
import type { MonthlyPlan } from "@/lib/monthly-plan";
import { monthLabel, monthLabelShort, whenLabel } from "@/lib/i18n/dates";
import { useI18n } from "@/lib/i18n/client";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput } from "@/lib/utils";
import { mutate } from "@/lib/use-refresh-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MethodIcon } from "@/components/method-icon";
import { MonthlyToggle } from "@/components/monthly-toggle";

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
  depositPlans = {},
  savings,
}: {
  goal: Goal;
  progress: GoalProgress;
  currency: string;
  linkToDetail?: boolean;
  /** Detail page: whether each deposit is paid (ticked in Dépenses). */
  depositsPaid?: Record<string, boolean>;
  /** Detail page: the deposits made every month, what they put aside. */
  depositPlans?: Record<string, MonthlyPlan>;
  /** Detail page: what's in the savings (a deposit can come from there). */
  savings?: number;
}) {
  const [adding, setAdding] = useState(false);
  const { lang, t } = useI18n();
  const monthLabelFr = (m: MonthId) => monthLabel(m, lang);
  const monthLabelShortFr = (m: MonthId) => monthLabelShort(m, lang);
  const p = progress;
  const money = (n: number) => formatMoney(n, currency);
  // When it last moved: its last deposit, else when it was added.
  const lastAt = goal.deposits.map((d) => d.date).reduce((a, b) => (b > a ? b : a), goal.createdAt);

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
                  {t("Atteint 🎉")}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <b className="font-semibold text-slate-800 dark:text-slate-100">{money(p.reachedNow)}</b> / {money(p.target)}
              <span className="text-[11px] tabular-nums text-slate-400"> · {whenLabel(lastAt, lang, t)}</span>
            </p>
            {p.percentProjected > p.percentNow ? (
              <p className="mt-0.5 text-[11px] text-orange-600 dark:text-amber-400">{t("Avec tes darets : {percent}%", { percent: p.percentProjected })}</p>
            ) : (
              !p.completed && <p className="mt-0.5 text-[11px] text-slate-400">{t("Il manque {amount}", { amount: money(p.remainingNow) })}</p>
            )}
          </div>
          <span className="shrink-0 text-xl font-bold tabular-nums text-orange-600 dark:text-amber-400">{p.percentNow}%</span>
          <CaretRight weight="bold" className="h-4 w-4 shrink-0 text-slate-300" />
        </Link>
        <div className="grid grid-cols-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-orange-600 active:bg-slate-50 dark:text-amber-400 dark:active:bg-slate-800"
          >
            <Plus weight="bold" className="h-4 w-4" />
            {t("Versement")}
          </button>
          <Link
            href={`/goals/${goal.id}/edit`}
            className="flex items-center justify-center gap-1.5 border-l border-slate-100 py-2.5 text-sm font-medium text-slate-600 active:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:active:bg-slate-800"
          >
            <PencilSimple weight="bold" className="h-4 w-4" />
            {t("Modifier")}
          </Link>
        </div>
        <DepositDialog goal={goal} currency={currency} savings={savings} open={adding} onOpenChange={setAdding} />
      </div>
    );
  }

  // The deposits step is shown as each deposit (oldest first), with the %
  // the goal reaches after it; not paid ones stay listed but don't count.
  type Row =
    | { kind: "step"; key: string; step: GoalProgress["steps"][number] }
    | { kind: "deposit"; key: string; deposit: Goal["deposits"][number]; paid: boolean; amount: number; plan: MonthlyPlan | null; percent: number };
  const stepRow = (step: GoalProgress["steps"][number], i: number): Row => ({ kind: "step", key: `step-${i}`, step });
  const depositRows = [...goal.deposits].reverse().reduce<{ rows: Row[]; reached: number }>(
    (acc, d) => {
      const paid = depositsPaid?.[d.id] ?? true;
      const plan = depositPlans[d.id] ?? null;
      // Every month: all its months ticked.
      const amount = plan ? plan.total : d.amount;
      const reached = acc.reached + (paid ? amount : 0);
      const percent = p.target > 0 ? Math.min(100, Math.round((reached / p.target) * 100)) : 0;
      return { rows: [...acc.rows, { kind: "deposit", key: `deposit-${d.id}`, deposit: d, paid, amount, plan, percent }], reached };
    },
    { rows: [], reached: goal.savedAmount },
  ).rows.reverse(); // the last one on top
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
              {p.completed ? t("Objectif atteint 🎉") : t("Progression")}
            </p>
            <p className="text-4xl font-bold leading-tight tabular-nums">{p.percentNow}%</p>
            <p className="text-sm text-white/85">{t("sur {amount}", { amount: money(p.target) })}</p>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/15 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-white/75">{t("Déjà là")}</p>
            <p className="text-sm font-bold tabular-nums">{money(p.reachedNow)}</p>
          </div>
          <div className="rounded-2xl bg-white/15 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-white/75">{t("Il manque")}</p>
            <p className="text-sm font-bold tabular-nums">{money(p.remainingNow)}</p>
          </div>
        </div>
        {p.percentProjected > p.percentNow && (
          <p className="relative mt-2 text-xs text-white/85">
            {t("Avec tes darets : {percent}%", { percent: p.percentProjected })}
          </p>
        )}
        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <Button type="button" onClick={() => setAdding(true)} className="bg-white text-orange-600 hover:bg-white/90 dark:bg-white dark:text-orange-600">
            <Plus weight="bold" className="h-4 w-4" />
            {t("Versement")}
          </Button>
          <Button asChild className="bg-white/20 text-white hover:bg-white/30 dark:bg-white/20 dark:text-white">
            <Link href={`/goals/${goal.id}/edit`}>
              <PencilSimple weight="bold" className="h-4 w-4" />
              {t("Modifier")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Steps and deposits, in one list */}
      {(p.steps.length > 0 || goal.deposits.length > 0) && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("Étapes et versements")}</h2>
          <ol className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {stepRows.map((row) =>
              row.kind === "deposit" ? (
                <li key={row.key} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                  <Link
                    href={`/goals/${goal.id}/deposits/${row.deposit.id}`}
                    className="flex items-center gap-3 px-4 py-3 text-sm active:bg-slate-50 dark:active:bg-slate-800/60"
                  >
                    <StepIcon>
                      {row.plan ? "🔁" : row.deposit.method === "savings" ? "🐷" : <MethodIcon method={row.deposit.method ?? "cash"} className="h-3" />}
                    </StepIcon>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate font-medium text-slate-800 dark:text-slate-100", !row.paid && "text-slate-400")}>
                        {row.deposit.name === "Versement" ? t("Versement") : row.deposit.name}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        {row.plan ? (
                          <>
                            {t("{amount}/mois", { amount: money(row.plan.amount) })} ·{" "}
                            {row.plan.running
                              ? t("depuis {month}", { month: monthLabelShortFr(parseMonthKey(row.plan.since)).toLowerCase() })
                              : t("arrêté")}{" "}
                            · {t("{n} mois", { n: row.plan.paid.length })}
                            {row.plan.dueNow && <span className="ml-1 font-semibold text-amber-600">· {t("à cocher ce mois")}</span>}
                          </>
                        ) : (
                          whenLabel(row.deposit.date, lang, t)
                        )}
                        {!row.plan && row.deposit.method && (
                          <>
                            {" "}
                            · <MethodIcon method={row.deposit.method} />
                            {row.deposit.method === "savings" ? ` ${t("Épargne")}` : ""}
                          </>
                        )}
                        {!row.paid && <span className="ml-1 font-semibold text-rose-500">· {t("Non payé")}</span>}
                      </span>
                    </span>
                    <span className="text-right">
                      <span
                        className={cn(
                          "block font-semibold tabular-nums",
                          row.paid ? "text-slate-900 dark:text-white" : "text-slate-400 line-through",
                        )}
                      >
                        +{money(row.amount)}
                      </span>
                      {row.paid && (
                        <span className="block text-[11px] font-semibold tabular-nums text-orange-600 dark:text-amber-400">
                          → {row.percent}%
                        </span>
                      )}
                    </span>
                    <CaretRight weight="bold" className="h-4 w-4 shrink-0 text-slate-300" />
                  </Link>
                </li>
              ) : (
                <li key={row.key} className="flex items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm first:border-t-0 dark:border-slate-800">
                  <StepIcon>{row.step.kind === "saved" ? "💰" : "🤝🏻"}</StepIcon>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-800 dark:text-slate-100">{row.step.kind === "saved" ? t(row.step.label) : row.step.label}</span>
                    <span className="block text-[11px] text-slate-400">
                      {row.step.month
                        ? row.step.received
                          ? t("Reçue en {month}", { month: monthLabelFr(row.step.month) })
                          : t("En {month}", { month: monthLabelFr(row.step.month) })
                        : t("Disponible")}
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
            <Insight icon={Sparkle}>
              {t("Tes darets suffisent : objectif atteint en {month}.", { month: monthLabelFr(p.reachedByDaretsIn) })}
            </Insight>
          ) : (
            p.remainingAfterDarets < p.remainingNow && (
              <Insight icon={Target}>
                {t("Après tes darets, il manquera {amount}.", { amount: money(p.remainingAfterDarets) })}
              </Insight>
            )
          )}
          {p.deadline && p.monthlyNeeded != null && p.monthsToDeadline != null && (
            <Insight icon={ClockCountdown}>
              {p.monthsToDeadline <= 0 ? (
                <>{t("Date limite ({month}) dépassée — il manque {amount}.", { month: monthLabelShortFr(p.deadline), amount: money(p.monthlyNeeded) })}</>
              ) : p.monthlyNeeded > 0 ? (
                <>
                  {t("Pour {month} : mets {amount}/mois de côté ({n} mois).", { month: monthLabelFr(p.deadline), amount: money(p.monthlyNeeded), n: p.monthsToDeadline })}
                </>
              ) : (
                <>{t("Atteint avant {month} avec tes darets 👌", { month: monthLabelFr(p.deadline) })}</>
              )}
            </Insight>
          )}
          {goal.monthlySaving ? (
            <Insight icon={TrendUp}>
              {p.estimatedMonth ? (
                <>
                  {t("En mettant {amount}/mois : atteint en {month}.", { amount: money(goal.monthlySaving), month: monthLabelFr(p.estimatedMonth) })}
                </>
              ) : (
                <>{t("En mettant {amount}/mois, il faudrait plus de 50 ans.", { amount: money(goal.monthlySaving) })}</>
              )}
            </Insight>
          ) : (
            !p.deadline &&
            !p.reachedByDaretsIn &&
            p.remainingAfterDarets >= p.remainingNow && (
              <Insight icon={Target}>
                {t("Il manque {amount}. Ajoute une épargne par mois ou une date dans « Modifier ».", { amount: money(p.remainingNow) })}
              </Insight>
            )
          )}
        </div>
      )}

      <DepositDialog goal={goal} currency={currency} savings={savings} open={adding} onOpenChange={setAdding} />
    </>
  );
}

/** "+ Versement": money put aside for the goal (from cash, the card or the
 *  savings — from cash / the card, maybe every month), with an optional label. */
function DepositDialog({
  goal,
  currency,
  savings,
  open,
  onOpenChange,
}: {
  goal: Goal;
  currency: string;
  savings?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useI18n().t;
  const [deposit, setDeposit] = useState("");
  const [depositName, setDepositName] = useState("");
  const [method, setMethod] = useState<DepositSource>("cash");
  const [monthly, setMonthly] = useState(false);
  const [saving, setSaving] = useState(false);
  const everyMonth = monthly && method !== "savings";

  async function addDeposit() {
    const value = parseDecimalInput(deposit);
    if (value <= 0) return;
    setSaving(true);
    const res = await mutate({
      method: "POST",
      path: `/api/goals/${goal.id}/deposits`,
      body: { amount: value, name: depositName.trim(), method, monthly: everyMonth },
    });
    setSaving(false);
    if (!res.ok) return toast.error(await errorMessage(res));
    toast.success(
      `${t("{amount} pour {goal}", { amount: `+${formatMoney(value, currency)}`, goal: goal.name })} · ${
        method === "savings" ? t("pris de l'épargne") : everyMonth ? t("chaque mois dans les dépenses") : t("ajouté aux dépenses")
      }`,
    );
    onOpenChange(false);
    setDeposit("");
    setDepositName("");
    setMonthly(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("Versement")} · {goal.emoji} {goal.name}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`deposit-${goal.id}`}>{t("Montant mis de côté (DH)")}</Label>
          <Input
            id={`deposit-${goal.id}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={deposit}
            onChange={(e) => setDeposit(cleanDecimalInput(e.target.value))}
            placeholder={t("Ex : 500")}
            className="text-lg font-semibold"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`deposit-name-${goal.id}`}>{t("Nom (optionnel)")}</Label>
          <Input
            id={`deposit-name-${goal.id}`}
            value={depositName}
            onChange={(e) => setDepositName(e.target.value)}
            placeholder={t("Ex : Prime, reste du mois…")}
            maxLength={60}
          />
        </div>
        <DepositSourcePicker value={method} onChange={setMethod} />
        {method !== "savings" && (
          <MonthlyToggle checked={monthly} onChange={setMonthly} hint={t("Revient chaque mois dans tes dépenses")} />
        )}
        <p className="text-[11px] text-slate-400">
          {everyMonth
            ? t("Il s'ajoute à l'objectif et sort de ton solde maintenant, puis revient chaque mois dans tes dépenses : coche-le quand tu le mets de côté.")
            : method === "savings"
            ? savings != null
              ? t("Il s'ajoute à l'objectif et sort de ton épargne ({amount} dedans). Ton solde et tes dépenses ne bougent pas.", { amount: formatMoney(savings, currency) })
              : t("Il s'ajoute à l'objectif et sort de ton épargne. Ton solde et tes dépenses ne bougent pas.")
            : t("Il s'ajoute à l'objectif et à tes dépenses (payé), et sort de ton solde.")}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("Annuler")}
          </Button>
          <Button
            type="button"
            onClick={addDeposit}
            disabled={saving || parseDecimalInput(deposit) <= 0}
            className="gx-cta"
          >
            <Check weight="bold" className="h-4 w-4" />
            {saving ? t("Ajout…") : t("Ajouter")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl gx-tile text-base">
      {children}
    </span>
  );
}

function Insight({ icon: Icon, children }: { icon: typeof Target; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2">
      <Icon weight="duotone" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-orange-500" />
      <span>{children}</span>
    </p>
  );
}
