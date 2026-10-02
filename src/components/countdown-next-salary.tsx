"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import type { Settings } from "@/lib/types";
import { useRefreshData } from "@/lib/use-refresh-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
 * Tapping the countdown also opens the salary settings (amount, pay day).
 */
type Phase = "counting" | "ask" | "late";

interface CountdownState {
  phase: Phase;
  /** "YYYY-MM" of the last pay day reached (the salary in question). */
  period: string;
  /** The last and next pay days, e.g. "jeudi 1 octobre". */
  lastLabel: string;
  nextLabel: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
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
  const { last, next } = payDays(now, payDay);
  const period = periodKey(last);
  const received = receivedMonth != null && receivedMonth >= period;
  const phase: Phase = received ? "counting" : readLate() === period ? "late" : "ask";
  const diff = Math.abs(phase === "counting" ? next.getTime() - now.getTime() : now.getTime() - last.getTime());
  return {
    phase,
    period,
    lastLabel: DAY.format(last),
    nextLabel: DAY.format(next),
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1_000) % 60),
  };
}

// useSyncExternalStore needs a referentially stable snapshot while nothing
// changes: keep the last one and only replace it when a field moves.
const cache = new Map<string, CountdownState>();
const sameState = (a: CountdownState, b: CountdownState) =>
  a.phase === b.phase &&
  a.period === b.period &&
  a.lastLabel === b.lastLabel &&
  a.nextLabel === b.nextLabel &&
  a.days === b.days &&
  a.hours === b.hours &&
  a.minutes === b.minutes &&
  a.seconds === b.seconds;

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
  lastLabel: "",
  nextLabel: "",
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
};
const getServerSnapshot = () => SERVER_SNAPSHOT;

const MONTH = new Intl.DateTimeFormat("fr-FR", { month: "long" });

/** "d'octobre", "de novembre". */
function ofMonth(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const name = MONTH.format(new Date(y, m - 1, 1));
  return /^[aeiouéèh]/i.test(name) ? `d'${name}` : `de ${name}`;
}

function Unit({ value, label, late }: { value: number; label: string; late: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl py-3 text-center text-white shadow-inner",
        late ? "bg-rose-600/90 dark:bg-rose-700/70" : "bg-slate-900/80 dark:bg-black/40",
      )}
    >
      <div className="text-2xl font-bold tabular-nums">
        {late && "−"}
        {String(value).padStart(2, "0")}
      </div>
      <div className={cn("text-[10px] uppercase tracking-wide", late ? "text-rose-100" : "text-slate-300")}>{label}</div>
    </div>
  );
}

export function CountdownNextSalary({ settings }: { settings: Settings }) {
  const { payDay, salaryReceivedMonth } = settings;
  const refreshData = useRefreshData();
  const [editing, setEditing] = useState(false);
  const [saving, startSaving] = useTransition();
  const state = useSyncExternalStore(subscribe, () => getSnapshotFor(payDay, salaryReceivedMonth), getServerSnapshot);
  const late = state.phase === "late";

  function confirmReceived() {
    const period = state.period;
    startSaving(async () => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salaryReceivedMonth: period }),
      });
      if (!res.ok) {
        toast.error("Impossible d'enregistrer.");
        return;
      }
      writeLate(null);
      setEditing(false);
      toast.success("Salaire reçu ✅ Le compte à rebours repart pour le mois prochain.");
      await refreshData();
    });
  }

  const caption = state.period ? (late ? `Prévu le ${state.lastLabel} · touche pour confirmer` : state.nextLabel) : "";

  const shell =
    "rounded-2xl border border-white/50 bg-white/30 p-4 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5";

  return (
    <>
      {state.phase === "ask" ? (
        <div className={cn(shell, "flex flex-col items-center gap-3 text-center")}>
          <p className="text-2xl">💰</p>
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            As-tu reçu ton salaire {ofMonth(state.period)} ?
          </p>
          <div className="grid w-full grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => writeLate(state.period)} disabled={saving}>
              <X className="h-4 w-4" />
              Non, pas encore
            </Button>
            <Button type="button" onClick={confirmReceived} disabled={saving}>
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
          className={cn(shell, "text-left transition-transform active:scale-[0.98]")}
        >
          {late && (
            <p className="mb-2 text-center text-xs font-semibold text-rose-600 dark:text-rose-400">
              Salaire {ofMonth(state.period)} en retard
            </p>
          )}
          <div className="grid grid-cols-4 gap-2">
            <Unit value={state.days} label="jours" late={late} />
            <Unit value={state.hours} label="heures" late={late} />
            <Unit value={state.minutes} label="min" late={late} />
            <Unit value={state.seconds} label="sec" late={late} />
          </div>
          <p
            className={cn(
              "mt-2 h-4 text-center text-[11px] first-letter:uppercase",
              late ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400",
            )}
          >
            {caption}
          </p>
        </button>
      )}

      <Dialog open={editing} onOpenChange={setEditing}>
        {/* No autofocus: the keyboard opens only when a field is tapped. */}
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Salaire</DialogTitle>
          </DialogHeader>
          {late && (
            <Button
              type="button"
              className="mb-4 w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={confirmReceived}
              disabled={saving}
            >
              <Check className="h-4 w-4" />
              {saving ? "Enregistrement…" : `Oui, j'ai reçu mon salaire ${ofMonth(state.period)}`}
            </Button>
          )}
          <SalaryForm key={`${settings.salary}-${payDay}`} settings={settings} plain onSaved={() => setEditing(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
