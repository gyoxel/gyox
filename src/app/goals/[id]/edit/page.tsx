import { getAllDarets, getAllGoalIdeas, getAllGoals, getSettings } from "@/lib/page-data";
import { notFound } from "next/navigation";

import { daretOptions } from "@/lib/goal-options";
import { PageHeader } from "@/components/page-header";
import { GoalForm } from "@/components/goal-form";
import { DeleteButton } from "@/components/delete-button";
import { goalDelete } from "@/lib/delete-specs";

export const dynamic = "force-dynamic";

export default async function EditGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [settings, goals, darets, ideas] = await Promise.all([
    getSettings(),
    getAllGoals(),
    getAllDarets(),
    getAllGoalIdeas(),
  ]);
  const goal = goals.find((g) => g.id === id);
  if (!goal) notFound();
  return (
    <>
      <PageHeader title={`Modifier · ${goal.name}`} back action={<DeleteButton variant="icon" {...goalDelete(goal)} />} />
      <main className="px-4 py-5">
        <GoalForm goal={goal} darets={daretOptions(darets, goals, goal.id)} currency={settings.currency} ideas={ideas} />
      </main>
    </>
  );
}
