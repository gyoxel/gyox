import { getAllDarets, getAllGoalIdeas, getAllGoals, getSettings } from "@/lib/page-data";
import { daretOptions } from "@/lib/goal-options";
import { PageHeader } from "@/components/page-header";
import { getI18n } from "@/lib/i18n/server";
import { GoalForm } from "@/components/goal-form";

export const dynamic = "force-dynamic";

export default async function NewGoalPage() {
  const [settings, goals, darets, ideas, { t }] = await Promise.all([
    getSettings(),
    getAllGoals(),
    getAllDarets(),
    getAllGoalIdeas(),
    getI18n(),
  ]);
  return (
    <>
      <PageHeader title={t("Ajouter un objectif")} back info="goal-new" />
      <main className="px-4 py-5">
        <GoalForm darets={daretOptions(darets, goals)} currency={settings.currency} ideas={ideas} />
      </main>
    </>
  );
}
