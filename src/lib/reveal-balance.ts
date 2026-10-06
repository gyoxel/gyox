"use client";

import { useSyncExternalStore } from "react";

// Accueil's eye: the amounts stay shown while moving around the app, and
// hide again on a reload or as soon as the app leaves the screen (another
// app, the home screen, the phone locked).
let revealed = false;
const listeners = new Set<() => void>();

function setRevealed(value: boolean) {
  if (revealed === value) return;
  revealed = value;
  listeners.forEach((l) => l());
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") setRevealed(false);
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRevealedBalance(): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(subscribe, () => revealed, () => false);
  return [value, setRevealed];
}
