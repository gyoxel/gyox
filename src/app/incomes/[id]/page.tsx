import { notFound } from "next/navigation";
import { getIncomeById } from "@/lib/repository";
import { PageHeader } from "@/components/page-header";
import { IncomeEditor } from "@/components/income-editor";

export const dynamic = "force-dynamic";

export default async function EditIncomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const income = await getIncomeById(id);
  if (!income) notFound();
  return (
    <>
      <PageHeader title={income.name} back />
      <main className="px-4 py-5">
        <IncomeEditor income={income} />
      </main>
    </>
  );
}
