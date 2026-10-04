import { getAllDarets, getAllGoalIdeas, getAllGoals, getSettings } from "@/lib/repository";
import { daretOptions } from "@/lib/goal-options";
import { PageHeader } from "@/components/page-header";
import { GoalForm } from "@/components/goal-form";

export const dynamic = "force-dynamic";

export default async function NewGoalPage() {
  const [settings, goals, darets, ideas] = await Promise.all([
    getSettings(),
    getAllGoals(),
    getAllDarets(),
    getAllGoalIdeas(),
  ]);
  return (
    <>
      <PageHeader title="Ajouter un objectif" back />
      <main className="px-4 py-5">
        <GoalForm darets={daretOptions(darets, goals)} currency={settings.currency} ideas={ideas} />
      </main>
    </>
  );
}
