import { PageHeader } from "@/components/page-header";
import { LoanEditor } from "@/components/loan-editor";

export default function NewLoanPage() {
  return (
    <>
      <PageHeader title="Prêter de l'argent" back />
      <main className="px-4 py-5">
        <LoanEditor />
      </main>
    </>
  );
}
