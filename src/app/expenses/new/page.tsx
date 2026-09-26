import { getAllCategories } from "@/lib/repository";
import { PageHeader } from "@/components/page-header";
import { NewExpenseForm } from "@/components/new-expense-form";

export const dynamic = "force-dynamic";

export default async function NewExpensePage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [{ type }, categories] = await Promise.all([searchParams, getAllCategories()]);
  const isCredit = type === "credit";
  return (
    <>
      <PageHeader title={isCredit ? "Ajouter un crédit" : "Ajouter une dépense"} backHref="/" />
      <main className="px-4 py-5">
        {/* key: switching between the two presets remounts with fresh defaults */}
        <NewExpenseForm key={isCredit ? "credit" : "expense"} categories={categories} preset={isCredit ? "credit" : undefined} />
      </main>
    </>
  );
}
