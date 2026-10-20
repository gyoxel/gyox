import { getSettings } from "@/lib/page-data";
import { PageHeader } from "@/components/page-header";
import { getI18n } from "@/lib/i18n/server";
import { DaretForm } from "@/components/daret-form";

export const dynamic = "force-dynamic";

export default async function NewDaretPage() {
  const [settings, { t }] = await Promise.all([getSettings(), getI18n()]);
  return (
    <>
      <PageHeader title={t("Ajouter une daret")} back info="daret-new" />
      <main className="px-4 py-5">
        <DaretForm currency={settings.currency} />
      </main>
    </>
  );
}
