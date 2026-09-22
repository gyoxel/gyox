"use client";

import { useSyncExternalStore } from "react";
import { Card, CardContent } from "@/components/ui/card";

const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  label: string;
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
    label: `1er ${MONTHS_FR[target.getMonth()]} ${target.getFullYear()}`,
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

const SERVER_SNAPSHOT: Remaining = { days: 0, hours: 0, minutes: 0, seconds: 0, label: " " };

function getServerSnapshot(): Remaining {
  return SERVER_SNAPSHOT;
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-slate-900 py-2 text-center text-white dark:bg-slate-800">
      <div className="text-lg font-bold tabular-nums">{String(value).padStart(2, "0")}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-300">{label}</div>
    </div>
  );
}

export function CountdownNextSalary() {
  const remaining = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prochain salaire</p>
        <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">{remaining.label}</p>
        <div className="grid grid-cols-4 gap-2">
          <Unit value={remaining.days} label="jours" />
          <Unit value={remaining.hours} label="heures" />
          <Unit value={remaining.minutes} label="min" />
          <Unit value={remaining.seconds} label="sec" />
        </div>
      </CardContent>
    </Card>
  );
}
