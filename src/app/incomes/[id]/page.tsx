import { notFound } from "next/navigation";
import { getAllExpenses, getIncomeById } from "@/lib/repository";
import { PageHeader } from "@/components/page-header";
import { IncomeEditor } from "@/components/income-editor";

export const dynamic = "force-dynamic";

export default async function EditIncomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [income, expenses] = await Promise.all([getIncomeById(id), getAllExpenses()]);
  if (!income) notFound();
  const credit = income.expenseId ? expenses.find((e) => e.id === income.expenseId) : undefined;
  return (
    <>
      <PageHeader title={income.name} back />
      <main className="px-4 py-5">
        <IncomeEditor
          income={income}
          source={credit ? { label: `crédit « ${credit.name} »`, href: `/expenses/${credit.id}` } : undefined}
        />
      </main>
    </>
  );
}
