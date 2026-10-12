import { getSettings } from "@/lib/page-data";
import { PageHeader } from "@/components/page-header";
import { BudgetForm } from "@/components/budget-form";

export const dynamic = "force-dynamic";

export default async function NewBudgetPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Ajouter un budget" back />
      <main className="px-4 py-5">
        <BudgetForm currency={settings.currency} />
      </main>
    </>
  );
}
