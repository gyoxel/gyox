import { notFound } from "next/navigation";
import { getLoan } from "@/lib/loans-repo";
import { loanDelete } from "@/lib/delete-specs";
import { PageHeader } from "@/components/page-header";
import { LoanEditor } from "@/components/loan-editor";
import { DeleteButton } from "@/components/delete-button";

export const dynamic = "force-dynamic";

export default async function EditLoanPage({ params }: { params: Promise<{ id: string }> }) {
  const loan = await getLoan((await params).id);
  if (!loan) notFound();
  return (
    <>
      <PageHeader title={`Modifier · ${loan.name}`} back action={<DeleteButton variant="icon" {...loanDelete(loan)} />} />
      <main className="px-4 py-5">
        <LoanEditor loan={loan} />
      </main>
    </>
  );
}
