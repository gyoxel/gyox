"use client";

import { useSyncExternalStore } from "react";

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function subscribe(callback: () => void) {
  const id = setInterval(callback, 1000);
  return () => clearInterval(id);
}

/** Next salary day at midnight: this month's pay day if still ahead, else
 *  next month's. A pay day past the end of a short month (e.g. 31 in
 *  February) falls on that month's last day. */
function nextPayday(now: Date, payDay: number): Date {
  const at = (year: number, month: number) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(payDay, lastDay), 0, 0, 0, 0);
  };
  const thisMonth = at(now.getFullYear(), now.getMonth());
  return now < thisMonth ? thisMonth : at(now.getFullYear(), now.getMonth() + 1);
}

function computeRemaining(payDay: number): Remaining {
  const now = new Date();
  const target = nextPayday(now, payDay);
  const diff = Math.max(0, target.getTime() - now.getTime());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1_000) % 60),
  };
}

function sameRemaining(a: Remaining, b: Remaining): boolean {
  return a.days === b.days && a.hours === b.hours && a.minutes === b.minutes && a.seconds === b.seconds;
}

// useSyncExternalStore requires getSnapshot to return a referentially
// stable value when nothing has actually changed — returning a fresh object
// literal every call (even with identical field values) makes React think
// the store changed on every render check and re-render forever. Caching
// the last snapshot and only replacing it when the seconds actually tick
// keeps the reference stable in between, while still being always derived
// from the real clock (never a hardcoded date) and self-correcting across
// month/year boundaries since it's recomputed from scratch each tick.
const cache = new Map<number, Remaining>();

function getSnapshotFor(payDay: number): Remaining {
  const next = computeRemaining(payDay);
  const cached = cache.get(payDay);
  if (cached && sameRemaining(cached, next)) return cached;
  cache.set(payDay, next);
  return next;
}

// The server and the client's pre-hydration pass would each compute their
// own "now", almost never landing on the same second — a text mismatch
// React would flag as a hydration error. A fixed placeholder for both of
// those passes avoids that; useSyncExternalStore then re-renders with the
// real value immediately after hydration, with no visible flash.
const SERVER_SNAPSHOT: Remaining = { days: 0, hours: 0, minutes: 0, seconds: 0 };

function getServerSnapshot(): Remaining {
  return SERVER_SNAPSHOT;
}

// The pay date under the countdown ("jeudi 1 novembre"). A string snapshot is
// stable by value; empty on the server for the same hydration reason.
const PAY_DATE = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const getServerDate = () => "";

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-slate-900/80 py-3 text-center text-white shadow-inner dark:bg-black/40">
      <div className="text-2xl font-bold tabular-nums">{String(value).padStart(2, "0")}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-300">{label}</div>
    </div>
  );
}

/** Countdown to the next salary day (set in Menu → Salaire). */
export function CountdownNextSalary({ payDay = 1 }: { payDay?: number }) {
  const remaining = useSyncExternalStore(subscribe, () => getSnapshotFor(payDay), getServerSnapshot);
  const payDate = useSyncExternalStore(subscribe, () => PAY_DATE.format(nextPayday(new Date(), payDay)), getServerDate);

  return (
    <div className="rounded-2xl border border-white/50 bg-white/30 p-4 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
      <div className="grid grid-cols-4 gap-2">
        <Unit value={remaining.days} label="jours" />
        <Unit value={remaining.hours} label="heures" />
        <Unit value={remaining.minutes} label="min" />
        <Unit value={remaining.seconds} label="sec" />
      </div>
      <p className="mt-2 h-4 text-center text-[11px] text-slate-500 dark:text-slate-400">{payDate && `Salaire le ${payDate}`}</p>
    </div>
  );
}
