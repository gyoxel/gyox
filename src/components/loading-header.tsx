"use client";


/** While a page loads, its header already there (no grey flash). */
export function LoadingHeader() {
  return (
    <div data-tone className="gx-header sticky top-0 z-30 flex h-[72px] items-center gap-3 px-5 pb-2 pt-4 dark:rounded-b-[28px]">
      <div className="h-10 w-10 animate-pulse rounded-full bg-slate-900/[0.06] dark:bg-white/15" />
      <div className="h-5 w-32 flex-1 animate-pulse rounded-md bg-slate-900/[0.06] dark:bg-white/15" />
      <div className="h-10 w-10 animate-pulse rounded-full bg-slate-900/[0.06] dark:bg-white/15" />
    </div>
  );
}
