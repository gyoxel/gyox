import { PageHeader } from "@/components/page-header";
import { getI18n } from "@/lib/i18n/server";
import { LoanEditor } from "@/components/loan-editor";
import { getPeople } from "@/lib/people-repo";

export const dynamic = "force-dynamic";

export default async function NewLoanPage() {
  const [{ t }, people] = await Promise.all([getI18n(), getPeople()]);
  return (
    <>
      <PageHeader title={t("Prêter de l'argent")} back info="pret-new" />
      <main className="px-4 py-5">
        <LoanEditor people={people.map((p) => p.name)} />
      </main>
    </>
  );
}
