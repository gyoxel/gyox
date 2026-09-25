export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement">
      <div className="sticky top-0 z-30 flex h-[57px] items-center justify-between border-b border-slate-200 bg-white/90 px-4 dark:border-slate-800 dark:bg-slate-950/90">
        <div className="h-4 w-28 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
        <div className="h-5 w-5 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="flex flex-col gap-4 px-4 py-5">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
        <div className="h-20 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
        <div className="h-12 animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/60" />
        <div className="h-12 animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/60" />
        <div className="h-12 animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/60" />
      </div>
    </div>
  );
}
