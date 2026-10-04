import Link from "next/link";
import { SearchX } from "lucide-react";
import { PageHeader } from "@/components/page-header";

/** A page that no longer exists (e.g. something just deleted). */
export default function NotFound() {
  return (
    <>
      <PageHeader title="Introuvable" back />
      <main className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
          <SearchX className="h-7 w-7" />
        </span>
        <p className="text-base font-semibold text-slate-900 dark:text-white">Cette page n&apos;existe plus</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">Elle a peut-être été supprimée.</p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-[#019c86] px-5 py-2.5 text-sm font-semibold text-white active:bg-[#007261]"
        >
          Retour à l&apos;accueil
        </Link>
      </main>
    </>
  );
}
