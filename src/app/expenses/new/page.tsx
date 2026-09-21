import { getAllExpenses } from "@/lib/repository";
import { PageHeader } from "@/components/page-header";
import { ExpenseForm } from "@/components/expense-form";

export const dynamic = "force-dynamic";

export default async function NewExpensePage() {
  const allExpenses = await getAllExpenses();
  return (
    <>
      <PageHeader title="Ajouter une dépense" backHref="/" />
      <main className="px-4 py-5">
        <ExpenseForm allExpenses={allExpenses} />
      </main>
    </>
  );
}
