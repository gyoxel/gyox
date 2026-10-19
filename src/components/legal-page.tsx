import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/i18n/dates";
import { getI18n } from "@/lib/i18n/server";

/** Confidentialité / Conditions: open without signing in (Google links to them). */
export async function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  const { lang, t } = await getI18n();
  const date = formatDate(new Date(`${updated}T12:00:00Z`), lang, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <>
      <PageHeader title={title} back hideSettings />
      <main className="px-4 py-5">
        <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-[15px] leading-relaxed text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 [&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          <p className="text-xs text-slate-400">GX Salaire · gxsalaire.ma · {t("mise à jour le {date}", { date })}</p>
          {children}
        </article>
      </main>
    </>
  );
}

export const CONTACT_EMAIL = "contact@gxsalaire.ma";
