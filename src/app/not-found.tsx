import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/ssr";
import { PageHeader } from "@/components/page-header";
import { getI18n } from "@/lib/i18n/server";

/** A page that no longer exists (e.g. something just deleted). */
export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t("Introuvable")} back />
      <main className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
          <MagnifyingGlass weight="duotone" className="h-7 w-7" />
        </span>
        <p className="text-base font-semibold text-slate-900 dark:text-white">{t("Cette page n'existe plus")}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("Elle a peut-être été supprimée.")}</p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white active:bg-emerald-700"
        >
          {t("Retour à l'accueil")}
        </Link>
      </main>
    </>
  );
}
