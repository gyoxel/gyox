import { getIncomeCategories } from "@/lib/page-data";
import { PageHeader } from "@/components/page-header";
import { IncomeEditor } from "@/components/income-editor";

export const dynamic = "force-dynamic";

export default async function NewIncomePage() {
  const categories = await getIncomeCategories();
  return (
    <>
      <PageHeader title="Ajouter un revenu" back />
      <main className="px-4 py-5">
        <IncomeEditor categories={categories} />
      </main>
    </>
  );
}
