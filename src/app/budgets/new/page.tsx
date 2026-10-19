import { getSettings } from "@/lib/page-data";
import { PageHeader } from "@/components/page-header";
import { getI18n } from "@/lib/i18n/server";
import { BudgetForm } from "@/components/budget-form";

export const dynamic = "force-dynamic";

export default async function NewBudgetPage() {
  const [settings, { t }] = await Promise.all([getSettings(), getI18n()]);
  return (
    <>
      <PageHeader title={t("Ajouter un budget")} back info="budget-new" />
      <main className="px-4 py-5">
        <BudgetForm currency={settings.currency} />
      </main>
    </>
  );
}
