import { getSettings } from "@/lib/repository";
import { PageHeader } from "@/components/page-header";
import { SalaryForm } from "@/components/salary-form";

export const dynamic = "force-dynamic";

export default async function SalaryPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Salaire" back />
      <main className="flex flex-col gap-5 px-4 py-5">
        <SalaryForm settings={settings} />
      </main>
    </>
  );
}
