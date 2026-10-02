import { PageHeader } from "@/components/page-header";
import { IncomeEditor } from "@/components/income-editor";

export default function NewIncomePage() {
  return (
    <>
      <PageHeader title="Ajouter un revenu" back />
      <main className="px-4 py-5">
        <IncomeEditor />
      </main>
    </>
  );
}
