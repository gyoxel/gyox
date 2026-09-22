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

function computeRemaining(): Remaining {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
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
let cachedRemaining = computeRemaining();

function getSnapshot(): Remaining {
  const next = computeRemaining();
  if (!sameRemaining(cachedRemaining, next)) cachedRemaining = next;
  return cachedRemaining;
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

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-slate-900/80 py-3 text-center text-white shadow-inner dark:bg-black/40">
      <div className="text-2xl font-bold tabular-nums">{String(value).padStart(2, "0")}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-300">{label}</div>
    </div>
  );
}

export function CountdownNextSalary() {
  const remaining = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className="rounded-2xl border border-white/50 bg-white/30 p-4 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
      <div className="grid grid-cols-4 gap-2">
        <Unit value={remaining.days} label="jours" />
        <Unit value={remaining.hours} label="heures" />
        <Unit value={remaining.minutes} label="min" />
        <Unit value={remaining.seconds} label="sec" />
      </div>
    </div>
  );
}
