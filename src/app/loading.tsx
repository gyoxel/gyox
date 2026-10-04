import { LoadingHeader } from "@/components/loading-header";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement">
      <LoadingHeader />
      <div className="flex flex-col gap-5 px-4 py-5">
        <div className="h-28 animate-pulse rounded-3xl bg-slate-200/70 dark:bg-slate-800/70" />
        <div className="h-20 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
        <div className="h-12 animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/60" />
        <div className="h-12 animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/60" />
        <div className="h-12 animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/60" />
      </div>
    </div>
  );
}
