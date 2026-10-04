export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement">
      <div className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-slate-50/85 px-4 pb-2 pt-3 dark:bg-slate-950/85">
        <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="h-5 w-32 flex-1 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
        <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
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
