"use client";

import { useCallback } from "react";
import { invalidateAll } from "@/app/actions";

export const DATA_CHANGED_EVENT = "gx:data-changed";

/**
 * Use after any mutation instead of router.refresh(): refreshes the current
 * page AND drops every cached/prefetched page, then lets the bottom bar
 * re-prefetch its tabs so the next tab switch is still instant.
 */
export function useRefreshData() {
  return useCallback(async () => {
    await invalidateAll();
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  }, []);
}
