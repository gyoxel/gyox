"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { Banknote, Check, ChevronRight, HandCoins, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/components/expense-editor";
import type { PaymentMethod, SalaryAdvance, Settings } from "@/lib/types";
import { METHOD_META } from "@/lib/payment-method";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { mutate } from "@/lib/use-refresh-data";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SalaryForm } from "@/components/salary-form";

/**
 * Countdown to the next salary, with a check that it actually arrived:
 * - "counting": the last pay day's salary is confirmed → count down to the
 *   next pay day;
 * - "ask": the pay day has come and nothing is confirmed → "Salaire reçu ?"
 *   Oui confirms it (the countdown moves to the next month), Non switches to
 * - "late": counting up (−) since the pay day, in red, until it's confirmed
 *   (tap the countdown → "Oui, j'ai reçu mon salaire").
 * Tapping the countdown opens the salary panel: paid early (last 7 days
 * before the pay day), paid now (when late), an advance on the salary (it
 * adds to this month and comes off that salary), and amount / pay day.
 */
type Phase = "counting" | "ask" | "late";

interface CountdownState {
  phase: Phase;
  /** "YYYY-MM" of the last pay day reached (the salary in question). */
  period: string;
  /** "YYYY-MM" of the pay day counted down to (can be marked paid early). */
  nextPeriod: string;
  /** The last and next pay days, e.g. "jeudi 1 octobre". */
  lastLabel: string;
  nextLabel: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Share of the pay period gone by (0–1), for the ring; 1 when late. */
  progress: number;
}

const LATE_KEY = "gx-salary-late";
const LATE_EVENT = "gx:salary-late";

function subscribe(callback: () => void) {
  const id = setInterval(callback, 1000);
  window.addEventListener(LATE_EVENT, callback);
  return () => {
    clearInterval(id);
    window.removeEventListener(LATE_EVENT, callback);
  };
}

/** Pay day of a month at midnight; past a short month's end, its last day. */
function payDateIn(year: number, month: number, payDay: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(payDay, lastDay));
}

const periodKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** The last pay day reached (this month's or last month's) and the next one. */
function payDays(now: Date, payDay: number) {
  const thisMonth = payDateIn(now.getFullYear(), now.getMonth(), payDay);
  return now >= thisMonth
    ? { last: thisMonth, next: payDateIn(now.getFullYear(), now.getMonth() + 1, payDay) }
    : { last: payDateIn(now.getFullYear(), now.getMonth() - 1, payDay), next: thisMonth };
}

function readLate(): string | null {
  try {
    return localStorage.getItem(LATE_KEY);
  } catch {
    return null;
  }
}

function writeLate(period: string | null) {
  try {
    if (period) localStorage.setItem(LATE_KEY, period);
    else localStorage.removeItem(LATE_KEY);
  } catch {
    // Storage blocked: the question simply comes back.
  }
  window.dispatchEvent(new Event(LATE_EVENT));
}

const DAY = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

function compute(payDay: number, receivedMonth: string | null): CountdownState {
  const now = new Date();
  const { last, next: upcoming } = payDays(now, payDay);
  const period = periodKey(last);
  const received = receivedMonth != null && receivedMonth >= period;
  // Paid early ("tkhlsst bkri"): the upcoming salary is already in, so count
  // down to the one after it.
  const next =
    receivedMonth != null && receivedMonth >= periodKey(upcoming)
      ? payDateIn(upcoming.getFullYear(), upcoming.getMonth() + 1, payDay)
      : upcoming;
  const phase: Phase = received ? "counting" : readLate() === period ? "late" : "ask";
  const diff = Math.abs(phase === "counting" ? next.getTime() - now.getTime() : now.getTime() - last.getTime());
  const periodStart = payDateIn(next.getFullYear(), next.getMonth() - 1, payDay);
  const span = next.getTime() - periodStart.getTime();
  const progress =
    phase === "counting" && span > 0 ? Math.min(1, Math.max(0, (now.getTime() - periodStart.getTime()) / span)) : 1;
  return {
    phase,
    period,
    nextPeriod: periodKey(next),
    lastLabel: DAY.format(last),
    nextLabel: DAY.format(next),
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1_000) % 60),
    progress: Math.round(progress * 1000) / 1000,
  };
}

// useSyncExternalStore needs a referentially stable snapshot while nothing
// changes: keep the last one and only replace it when a field moves.
const cache = new Map<string, CountdownState>();
const sameState = (a: CountdownState, b: CountdownState) =>
  a.phase === b.phase &&
  a.period === b.period &&
  a.nextPeriod === b.nextPeriod &&
  a.lastLabel === b.lastLabel &&
  a.nextLabel === b.nextLabel &&
  a.days === b.days &&
  a.hours === b.hours &&
  a.minutes === b.minutes &&
  a.seconds === b.seconds &&
  a.progress === b.progress;

function getSnapshotFor(payDay: number, receivedMonth: string | null): CountdownState {
  const key = `${payDay} ${receivedMonth}`;
  const next = compute(payDay, receivedMonth);
  const cached = cache.get(key);
  if (cached && sameState(cached, next)) return cached;
  cache.set(key, next);
  return next;
}

// Server and pre-hydration render: a fixed placeholder (each side would see
// a different "now"); the real value follows right after hydration.
const SERVER_SNAPSHOT: CountdownState = {
  phase: "counting",
  period: "",
  nextPeriod: "",
  lastLabel: "",
  nextLabel: "",
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  progress: 0,
};
const getServerSnapshot = () => SERVER_SNAPSHOT;

const MONTH = new Intl.DateTimeFormat("fr-FR", { month: "long" });

/** "d'octobre", "de novembre". */
function ofMonth(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const name = MONTH.format(new Date(y, m - 1, 1));
  return /^[aeiouéèh]/i.test(name) ? `d'${name}` : `de ${name}`;
}

const RING = 60;
const RING_STROKE = 6;

/** The pay period as a ring filling up, with the days left inside. */
function Ring({ progress, days, late }: { progress: number; days: number; late: boolean }) {
  const r = (RING - RING_STROKE) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: RING, height: RING }}>
      <svg width={RING} height={RING} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id="salary-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={late ? "#fb7185" : "#34d399"} />
            <stop offset="100%" stopColor={late ? "#e11d48" : "#22d3ee"} />
          </linearGradient>
        </defs>
        <circle cx={RING / 2} cy={RING / 2} r={r} fill="none" strokeWidth={RING_STROKE} className="stroke-white/10" />
        <circle
          cx={RING / 2}
          cy={RING / 2}
          r={r}
          fill="none"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          stroke="url(#salary-ring)"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-xl font-bold leading-none tabular-nums", late && "text-rose-300")}>
          {late && "−"}
          {days}
        </span>
        <span className="mt-0.5 text-[8px] font-medium uppercase tracking-wider text-white/60">
          {days > 1 ? "jours" : "jour"}
        </span>
      </div>
    </div>
  );
}

/** Today as "YYYY-MM-DD" (local time). */
function todayStr(): string {
  const d = new Date();
  return `${periodKey(d)}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Records the salary of `period` ("YYYY-MM") as received. */
async function markReceived(period: string): Promise<boolean> {
  const res = await mutate({ method: "PATCH", path: "/api/settings", body: { salaryReceivedMonth: period } });
  if (!res.ok) {
    toast.error("Impossible d'enregistrer.");
    return false;
  }
  writeLate(null);
  return true;
}

function useSalaryState(settings: Settings) {
  const { payDay, salaryReceivedMonth } = settings;
  return useSyncExternalStore(subscribe, () => getSnapshotFor(payDay, salaryReceivedMonth), getServerSnapshot);
}

export function CountdownNextSalary({ settings, advances }: { settings: Settings; advances: SalaryAdvance[] }) {
  const [editing, setEditing] = useState(false);
  const [saving, startSaving] = useTransition();
  const state = useSalaryState(settings);
  const late = state.phase === "late";

  function confirmReceived() {
    startSaving(async () => {
      if (!(await markReceived(state.period))) return;
      toast.success("Salaire reçu ✅ Le compte à rebours repart pour le mois prochain.");
    });
  }

  const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const caption = state.period ? (late ? `prévu le ${state.lastLabel}` : capitalize(state.nextLabel)) : "";

  const shell =
    "relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-lg ring-1 ring-white/5 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/80 dark:ring-white/10";
  const glow = (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-2xl",
        late ? "bg-rose-500/25" : "bg-indigo-500/25",
      )}
    />
  );

  // A new account: no salary yet. First its amount, pay day and account;
  // the countdown (and "As-tu reçu ton salaire ?") only come after.
  if (settings.salary <= 0) {
    return (
      <>
        <div className={cn(shell, "flex flex-col items-center gap-3 p-4 text-center")}>
          {glow}
          <p className="relative text-3xl">👋</p>
          <div className="relative">
            <p className="text-base font-semibold">Commence par ton salaire</p>
            <p className="mt-1 text-sm text-white/70">
              Son montant, le jour où tu le reçois et où il arrive (cash ou carte) : le compte à rebours et tes calculs
              partent de là.
            </p>
          </div>
          <Button
            type="button"
            className="relative w-full bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:text-white"
            onClick={() => setEditing(true)}
          >
            <Banknote className="h-4 w-4" />
            Ajouter mon salaire
          </Button>
        </div>
        <Dialog open={editing} onOpenChange={setEditing}>
          <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-h-[88dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ton salaire</DialogTitle>
            </DialogHeader>
            <SalaryForm settings={settings} plain onSaved={() => setEditing(false)} />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      {state.phase === "ask" ? (
        <div className={cn(shell, "flex flex-col items-center gap-3 p-4 text-center")}>
          {glow}
          <p className="relative text-3xl">💰</p>
          <p className="relative text-base font-semibold">As-tu reçu ton salaire {ofMonth(state.period)} ?</p>
          <div className="relative grid w-full grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 dark:border-white/20 dark:bg-white/10 dark:text-white"
              onClick={() => writeLate(state.period)}
              disabled={saving}
            >
              <X className="h-4 w-4" />
              Non, pas encore
            </Button>
            <Button
              type="button"
              className="bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:text-white"
              onClick={confirmReceived}
              disabled={saving}
            >
              <Check className="h-4 w-4" />
              Oui
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={late ? "Confirmer le salaire" : "Modifier le salaire"}
          className={cn(shell, "block px-3.5 py-3 text-left transition-transform active:scale-[0.98]")}
        >
          {glow}
          <div className="relative flex items-center gap-3">
            <Ring progress={state.progress} days={state.days} late={late} />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.16em]",
                  late ? "text-rose-300" : "text-indigo-200/80",
                )}
              >
                {late ? "Salaire en retard" : "Prochain salaire"}
              </p>
              <p className="mt-0.5 h-5 truncate text-sm font-semibold">{caption}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-white/40" />
          </div>
        </button>
      )}

      <Dialog open={editing} onOpenChange={setEditing}>
        {/* No autofocus: the keyboard opens only when a field is tapped. */}
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-h-[88dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Salaire</DialogTitle>
          </DialogHeader>
          <SalaryPanel settings={settings} advances={advances} onDone={() => setEditing(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Everything about the salary (the countdown's dialog and Menu → Salaire):
 * paid early / paid now (green when they apply, grey otherwise), undo,
 * advances on the salary, and the amount / pay day form.
 */
export function SalaryPanel({
  settings,
  advances,
  onDone,
}: {
  settings: Settings;
  advances: SalaryAdvance[];
  /** Called after an action that should close the dialog. */
  onDone?: () => void;
}) {
  const { payDay, salaryReceivedMonth } = settings;
  const [advanceInput, setAdvanceInput] = useState("");
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceMethod, setAdvanceMethod] = useState<PaymentMethod>(settings.salaryMethod);
  const [toDelete, setToDelete] = useState<SalaryAdvance | null>(null);
  const [saving, startSaving] = useTransition();
  const state = useSalaryState(settings);
  const late = state.phase === "late";

  // In the last week before the pay day, the salary can be marked paid early.
  const canPayEarly = state.phase === "counting" && state.period !== "" && state.days < 7;

  function confirmReceived(period: string, early = false) {
    startSaving(async () => {
      if (!(await markReceived(period))) return;
      onDone?.();
      toast.success(
        early ? "Salaire reçu en avance ✅" : "Salaire reçu ✅ Le compte à rebours repart pour le mois prochain.",
      );
    });
  }

  /** Undo the last "salaire reçu" (a wrong tap): that salary is asked again. */
  function undoReceived() {
    if (!salaryReceivedMonth) return;
    const [y, m] = salaryReceivedMonth.split("-").map(Number);
    const previous = periodKey(new Date(y, m - 2, 1));
    startSaving(async () => {
      const res = await mutate({ method: "PATCH", path: "/api/settings", body: { salaryReceivedMonth: previous } });
      if (!res.ok) {
        toast.error(await errorMessage(res));
        return;
      }
      writeLate(null);
      onDone?.();
      toast.success(`Annulé : salaire ${ofMonth(salaryReceivedMonth)} pas encore reçu.`);
    });
  }

  // The next salary not received yet: an advance comes off that one.
  const advancePeriod = state.phase === "counting" ? state.nextPeriod : state.period;
  const periodAdvances = advances.filter((a) => a.period === advancePeriod);
  const advancedTotal = periodAdvances.reduce((s, a) => s + a.amount, 0);
  const money = (n: number) => formatMoney(n, settings.currency);

  function addAdvance() {
    const amount = parseDecimalInput(advanceInput);
    if (!(amount > 0) || !advancePeriod) return;
    startSaving(async () => {
      const res = await mutate({
        method: "POST",
        path: "/api/salary-advances",
        body: { amount, date: todayStr(), period: advancePeriod, method: advanceMethod },
      });
      if (!res.ok) {
        toast.error("Avance non enregistrée.");
        return;
      }
      setAdvanceInput("");
      setAdvanceOpen(false);
      toast.success(`Avance de ${money(amount)} ajoutée au solde.`);
    });
  }

  function deleteAdvance(advance: SalaryAdvance) {
    startSaving(async () => {
      const res = await mutate({ method: "DELETE", path: `/api/salary-advances/${advance.id}` });
      if (!res.ok) {
        toast.error(await errorMessage(res));
        return;
      }
      setToDelete(null);
      toast.success("Avance supprimée.");
    });
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3">
        <ActionButton
          enabled={canPayEarly}
          pending={saving}
          onClick={() => confirmReceived(state.nextPeriod, true)}
          label={canPayEarly ? `J'ai reçu mon salaire ${ofMonth(state.nextPeriod)} en avance` : "J'ai reçu mon salaire en avance"}
          note="Possible pendant les 7 jours avant le jour du salaire."
        />
        <ActionButton
          enabled={late}
          pending={saving}
          onClick={() => confirmReceived(state.period)}
          label={late ? `Oui, j'ai reçu mon salaire ${ofMonth(state.period)}` : "Oui, j'ai reçu mon salaire"}
          note="Possible une fois le jour du salaire passé, si tu as répondu « Non » à « As-tu reçu ton salaire ? »."
        />
        {state.phase === "counting" && salaryReceivedMonth && salaryReceivedMonth >= state.period && (
          <button
            type="button"
            onClick={undoReceived}
            disabled={saving}
            className="self-center text-xs font-medium text-slate-500 underline underline-offset-2 dark:text-slate-400"
          >
            Annuler « salaire {ofMonth(salaryReceivedMonth)} reçu »
          </button>
        )}

        {/* Advance on the next salary not received yet */}
        <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
          {advanceOpen ? (
            <>
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="Montant (DH)"
                  aria-label="Montant de l'avance"
                  value={advanceInput}
                  onChange={(e) => setAdvanceInput(cleanDecimalInput(e.target.value))}
                />
                <Button
                  type="button"
                  className="shrink-0 bg-amber-500 text-white hover:bg-amber-600"
                  onClick={addAdvance}
                  disabled={saving || !(parseDecimalInput(advanceInput) > 0)}
                >
                  <Check className="h-4 w-4" />
                  Ajouter
                </Button>
              </div>
              <PaymentMethodPicker value={advanceMethod} onChange={setAdvanceMethod} label="Reçue en" />
            </>
          ) : (
            <Button
              type="button"
              className="w-full bg-amber-500 text-white hover:bg-amber-600"
              onClick={() => setAdvanceOpen(true)}
              disabled={!advancePeriod}
            >
              <HandCoins className="h-4 w-4" />
              Avance sur salaire
            </Button>
          )}
          <p className="text-[11px] leading-snug text-amber-800/80 dark:text-amber-200/70">
            * Ajoutée au solde maintenant, puis déduite de ton salaire{" "}
            {advancePeriod ? ofMonth(advancePeriod) : ""}.
          </p>
          {periodAdvances.length > 0 && (
            <ul className="flex flex-col gap-1 border-t border-amber-200/70 pt-2 text-sm dark:border-amber-900/60">
              {periodAdvances.map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  <span className="flex-1 text-slate-700 dark:text-slate-200">
                    {money(a.amount)}
                    <span className="ml-1.5 text-[11px] text-slate-400">
                      le {a.date.slice(8, 10)}/{a.date.slice(5, 7)} · {METHOD_META[a.method].emoji}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setToDelete(a)}
                    aria-label="Supprimer l'avance"
                    className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
              <li className="text-[11px] text-slate-500 dark:text-slate-400">
                Salaire {ofMonth(advancePeriod)} restant :{" "}
                <b className="text-slate-700 dark:text-slate-200">{money(Math.max(0, settings.salary - advancedTotal))}</b>
              </li>
            </ul>
          )}
        </div>
      </div>
      <h3 className="mb-3 border-t border-slate-100 pt-4 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200">
        Réglages du salaire
      </h3>
      <SalaryForm key={`${settings.salary}-${payDay}`} settings={settings} plain onSaved={onDone} />
      <ConfirmDialog
        open={toDelete != null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Supprimer cette avance ?"
        description={toDelete ? <>L&apos;avance de {money(toDelete.amount)} sera supprimée.</> : null}
        pending={saving}
        onConfirm={() => toDelete && deleteAdvance(toDelete)}
      />
    </>
  );
}

/** Salary action: green when it applies, grey (and inert) otherwise, with
 *  its condition in small print. */
function ActionButton({
  enabled,
  pending,
  onClick,
  label,
  note,
}: {
  enabled: boolean;
  pending: boolean;
  onClick: () => void;
  label: string;
  note: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        className={cn(
          "h-auto min-h-11 w-full whitespace-normal py-2.5 text-center leading-snug",
          enabled
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "bg-slate-200 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500",
        )}
        onClick={onClick}
        disabled={!enabled || pending}
      >
        <Check className="h-4 w-4" />
        {label}
      </Button>
      <p className="px-1 text-[11px] leading-snug text-slate-400">* {note}</p>
    </div>
  );
}
