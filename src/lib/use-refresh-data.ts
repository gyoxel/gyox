"use client";

import { invalidateAll } from "@/app/actions";

export const DATA_CHANGED_EVENT = "gx:data-changed";

async function refreshNow() {
  await invalidateAll();
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}

/**
 * Use after any mutation instead of router.refresh(): refreshes the current
 * page AND drops every cached/prefetched page, then lets the bottom bar
 * re-prefetch its tabs so the next tab switch is still instant.
 */
export function useRefreshData() {
  return refreshNow;
}

// Coalesced refresh for bursts of quick mutations (e.g. ticking several
// expenses in a row). A full refresh re-renders the page and re-prefetches
// every tab — several database round-trips — so running one per tap
// overloads the database. Instead, wait until every tracked request has
// finished and nothing new happened for a moment, then refresh once.
const QUIET_DELAY_MS = 1200;
let inFlight = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;
// Bumped by every tracked mutation; `refreshedGeneration` is its value when
// the last refresh started. If they differ, a refresh that lands now was
// computed before the latest taps and must not overwrite them.
let generation = 0;
let refreshedGeneration = 0;

function flush() {
  timer = null;
  if (inFlight > 0 || !dirty) return;
  dirty = false;
  refreshedGeneration = generation;
  void refreshNow().catch(() => {
    dirty = true;
  });
}

if (typeof window !== "undefined") {
  // Leaving or backgrounding the app: don't keep a pending refresh waiting.
  window.addEventListener("pagehide", () => {
    if (timer) clearTimeout(timer);
    flush();
  });
}

/** Runs a mutation request and schedules one shared refresh after the
 *  whole burst of mutations has settled. */
export function trackMutation<T>(request: Promise<T>): Promise<T> {
  inFlight++;
  generation++;
  if (timer) clearTimeout(timer);
  timer = null;
  return request.finally(() => {
    inFlight--;
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, QUIET_DELAY_MS);
  });
}

/** Runs any refresh still waiting for the quiet delay right away (e.g. when
 *  leaving the page, so the next page shows up-to-date data). */
export function flushPendingRefresh() {
  if (!timer) return;
  clearTimeout(timer);
  flush();
}

/** True when no tracked mutation is running or waiting to be refreshed, i.e.
 *  fresh server data already includes every change made on this device. */
export function mutationsSettled(): boolean {
  return inFlight === 0 && timer === null && refreshedGeneration === generation;
}
