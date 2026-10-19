"use client";

// The phone's back button (Android) closes what's open on the page — a
// dialog, a sheet, the + menu — instead of leaving the page: each one holds
// a CloseWatcher while it's open (Chrome; elsewhere Esc and the close
// buttons stay the ways to close, as before).
import { useEffect, useRef } from "react";

interface Watcher {
  onclose: (() => void) | null;
  destroy(): void;
}

type WatcherClass = new () => Watcher;

/** A watcher calling `onBack` on the next back press (or Esc); null where
 *  the browser has none. */
export function watchBack(onBack: () => void): Watcher | null {
  const Ctor = typeof window === "undefined" ? undefined : (window as unknown as { CloseWatcher?: WatcherClass }).CloseWatcher;
  if (!Ctor) return null;
  try {
    const watcher = new Ctor();
    watcher.onclose = onBack;
    return watcher;
  } catch {
    return null; // e.g. the page is going away
  }
}

/** While `open`, the phone's back calls `close` — and does only that. */
export function useCloseOnBack(open: boolean, close: () => void) {
  const latest = useRef(close);
  useEffect(() => {
    latest.current = close;
  });
  useEffect(() => {
    if (!open) return;
    const watcher = watchBack(() => latest.current());
    return () => watcher?.destroy();
  }, [open]);
}
