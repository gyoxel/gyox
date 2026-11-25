import { getActivities } from "@/lib/activity";
import { getSettings } from "@/lib/page-data";
import { getI18n } from "@/lib/i18n/server";
import { PageHeader } from "@/components/page-header";
import { ActivityList } from "@/components/activity-list";

export const dynamic = "force-dynamic";

/**
 * Historique (Menu): everything done in the app — added, changed, deleted,
 * paid… — the newest first, the last 60. A change to something old is a
 * new line at the time it was made; the line of when it was added stays.
 */
export default async function HistoriquePage() {
  const [activities, settings, { t }] = await Promise.all([getActivities(), getSettings(), getI18n()]);
  return (
    <>
      <PageHeader title={t("Historique")} back hideSettings />
      <main className="flex flex-col gap-4 px-4 py-5">
        <p className="px-1 text-xs text-slate-500 dark:text-slate-400">{t("Les 60 dernières choses faites dans l'app, de la plus récente à la plus ancienne.")}</p>
        <ActivityList activities={activities} currency={settings.currency} />
      </main>
    </>
  );
}
