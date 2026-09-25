"use server";

import { revalidatePath } from "next/cache";

/**
 * Called by the client after any data change. Invalidating from a Server
 * Function re-renders the current page with fresh data and purges the
 * browser's client cache, so prefetched tabs never show stale numbers.
 */
export async function invalidateAll() {
  revalidatePath("/", "layout");
}
