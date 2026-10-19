import { notFound } from "next/navigation";
import { getBudgetById, getSettings } from "@/lib/page-data";
import { budgetDelete } from "@/lib/delete-specs";
import { PageHeader } from "@/components/page-header";
import { BudgetForm } from "@/components/budget-form";
import { DeleteButton } from "@/components/delete-button";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function EditBudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [settings, budget, { t }] = await Promise.all([getSettings(), getBudgetById(id), getI18n()]);
  if (!budget) notFound();
  return (
    <>
      <PageHeader title={`${t("Modifier")} · ${budget.expense.name}`} back info="budget-edit" action={<DeleteButton variant="icon" {...budgetDelete(budget, t)} />} />
      <main className="px-4 py-5">
        <BudgetForm currency={settings.currency} budget={budget} />
      </main>
    </>
  );
}
