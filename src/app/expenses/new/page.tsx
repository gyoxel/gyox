import { getAllCategories } from "@/lib/page-data";
import { PageHeader } from "@/components/page-header";
import { ExpenseEditor } from "@/components/expense-editor";
import { CreditEditor } from "@/components/credit-editor";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewExpensePage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [{ type }, categories, { t }] = await Promise.all([searchParams, getAllCategories(), getI18n()]);
  const isCredit = type === "credit";
  return (
    <>
      <PageHeader title={isCredit ? t("Ajouter une dette") : t("Ajouter une dépense")} back info={isCredit ? "credit-new" : "expense-new"} />
      <main className="px-4 py-5">
        {isCredit ? <CreditEditor key="credit" /> : <ExpenseEditor key="expense" categories={categories} />}
      </main>
    </>
  );
}
