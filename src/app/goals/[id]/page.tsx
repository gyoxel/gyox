import { notFound } from "next/navigation";
import { getAllDarets, getAllGoals, getSettings } from "@/lib/repository";
import { daretOptions } from "@/lib/goal-options";
import { PageHeader } from "@/components/page-header";
import { GoalForm } from "@/components/goal-form";

export const dynamic = "force-dynamic";

export default async function EditGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [settings, goals, darets] = await Promise.all([getSettings(), getAllGoals(), getAllDarets()]);
  const goal = goals.find((g) => g.id === id);
  if (!goal) notFound();
  return (
    <>
      <PageHeader title={`${goal.emoji} ${goal.name}`} backHref="/goals" />
      <main className="px-4 py-5">
        <GoalForm goal={goal} darets={daretOptions(darets, goals, goal.id)} currency={settings.currency} />
      </main>
    </>
  );
}
