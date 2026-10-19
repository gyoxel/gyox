import { PageHeader } from "@/components/page-header";
import { getI18n } from "@/lib/i18n/server";
import { LoanEditor } from "@/components/loan-editor";

export default async function NewLoanPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t("Prêter de l'argent")} back info="pret-new" />
      <main className="px-4 py-5">
        <LoanEditor />
      </main>
    </>
  );
}
