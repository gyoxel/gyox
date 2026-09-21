import { getSettings } from "@/lib/repository";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const settings = getSettings();
  return (
    <>
      <PageHeader title="Réglages" />
      <main className="px-4 py-5">
        <SettingsForm settings={settings} />
      </main>
    </>
  );
}
