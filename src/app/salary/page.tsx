import { getAllSalaryAdvances, getSettings } from "@/lib/repository";
import { PageHeader } from "@/components/page-header";
import { SalaryPanel } from "@/components/countdown-next-salary";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

/** Menu → Salaire: the same panel as tapping the Accueil countdown. */
export default async function SalaryPage() {
  const [settings, advances] = await Promise.all([getSettings(), getAllSalaryAdvances()]);
  return (
    <>
      <PageHeader title="Salaire" back />
      <main className="flex flex-col gap-5 px-4 py-5">
        <Card>
          <CardContent className="pt-4">
            <SalaryPanel settings={settings} advances={advances} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
