import { getSettings } from "@/lib/repository";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Paramètres" back hideSettings />
      <main className="flex flex-col gap-5 px-4 py-5">
        <SettingsForm settings={settings} />
      </main>
    </>
  );
}
