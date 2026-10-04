import { PageHeader } from "@/components/page-header";
import { LoanEditor } from "@/components/loan-editor";

export default function NewLoanPage() {
  return (
    <>
      <PageHeader title="Ajouter un prêt" back />
      <main className="px-4 py-5">
        <LoanEditor />
      </main>
    </>
  );
}
