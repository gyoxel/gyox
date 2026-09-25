import { getSettings } from "@/lib/repository";
import { PageHeader } from "@/components/page-header";
import { DaretForm } from "@/components/daret-form";

export const dynamic = "force-dynamic";

export default async function NewDaretPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Ajouter une daret" backHref="/daret" />
      <main className="px-4 py-5">
        <DaretForm currency={settings.currency} />
      </main>
    </>
  );
}
