import { getIncomeCategories } from "@/lib/page-data";
import { PageHeader } from "@/components/page-header";
import { getI18n } from "@/lib/i18n/server";
import { IncomeEditor } from "@/components/income-editor";

export const dynamic = "force-dynamic";

export default async function NewIncomePage() {
  const [categories, { t }] = await Promise.all([getIncomeCategories(), getI18n()]);
  return (
    <>
      <PageHeader title={t("Ajouter un revenu")} back info="income-new" />
      <main className="px-4 py-5">
        <IncomeEditor categories={categories} />
      </main>
    </>
  );
}
