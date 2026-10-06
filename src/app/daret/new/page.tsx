import { getSettings } from "@/lib/page-data";
import { PageHeader } from "@/components/page-header";
import { DaretForm } from "@/components/daret-form";

export const dynamic = "force-dynamic";

export default async function NewDaretPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Ajouter une daret" back />
      <main className="px-4 py-5">
        <DaretForm currency={settings.currency} />
      </main>
    </>
  );
}
