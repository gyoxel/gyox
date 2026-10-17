"use client";


/** While a page loads, its header already there (no grey flash). */
export function LoadingHeader() {
  return (
    <div data-tone className="gx-header sticky top-0 z-30 flex h-[68px] items-center gap-3 rounded-b-[28px] px-4 pb-3 pt-3">
      <div className="h-10 w-10 animate-pulse rounded-full bg-slate-900/[0.06] dark:bg-white/15" />
      <div className="h-5 w-32 flex-1 animate-pulse rounded-md bg-slate-900/[0.06] dark:bg-white/15" />
      <div className="h-10 w-10 animate-pulse rounded-full bg-slate-900/[0.06] dark:bg-white/15" />
    </div>
  );
}
