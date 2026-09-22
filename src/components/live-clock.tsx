"use client";

import { useSyncExternalStore } from "react";

const DAYS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
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

function subscribe(callback: () => void) {
  const id = setInterval(callback, 1000);
  return () => clearInterval(id);
}

// Rounded to the second: useSyncExternalStore compares this value between
// render and an immediate post-render check, and Date.now() never returns
// the same millisecond twice — that constant "change" would make React
// re-render in a busy loop. Flooring to the second gives a value that's
// genuinely stable between those two reads, while still ticking for real
// once a second via the subscribe interval.
function getSnapshot() {
  return Math.floor(Date.now() / 1000) * 1000;
}

// The server has no "real" clock to render, so it renders nothing;
// useSyncExternalStore forces a client re-render right after hydration to
// pick up the real value, with no mismatch warning.
function getServerSnapshot() {
  return 0;
}

export function LiveClock() {
  const nowMs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (nowMs === 0) return <div className="h-4" />;

  const now = new Date(nowMs);
  const dateLabel = `${DAYS_FR[now.getDay()]} ${now.getDate()} ${MONTHS_FR[now.getMonth()]} ${now.getFullYear()}`;
  const timeLabel = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
      <span className="capitalize">{dateLabel}</span>
      <span className="font-mono tabular-nums">{timeLabel}</span>
    </div>
  );
}
