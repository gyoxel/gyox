import { getAllCategories } from "@/lib/repository";
import { PageHeader } from "@/components/page-header";
import { ExpenseEditor } from "@/components/expense-editor";
import { CreditEditor } from "@/components/credit-editor";

export const dynamic = "force-dynamic";

export default async function NewExpensePage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [{ type }, categories] = await Promise.all([searchParams, getAllCategories()]);
  const isCredit = type === "credit";
  return (
    <>
      <PageHeader title={isCredit ? "Ajouter un crédit" : "Ajouter une dépense"} back />
      <main className="px-4 py-5">
        {isCredit ? <CreditEditor key="credit" /> : <ExpenseEditor key="expense" categories={categories} />}
      </main>
    </>
  );
}
