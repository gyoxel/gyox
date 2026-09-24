import { getAllExpenses } from "@/lib/repository";
import { PageHeader } from "@/components/page-header";
import { ExpenseForm } from "@/components/expense-form";

export const dynamic = "force-dynamic";

export default async function NewExpensePage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const isCredit = type === "credit";
  const allExpenses = await getAllExpenses();
  return (
    <>
      <PageHeader title={isCredit ? "Ajouter un crédit" : "Ajouter une dépense"} backHref="/" />
      <main className="px-4 py-5">
        <ExpenseForm allExpenses={allExpenses} initialType={isCredit ? "credit" : undefined} />
      </main>
    </>
  );
}
