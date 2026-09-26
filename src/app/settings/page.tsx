import { getAllCategories, getSettings } from "@/lib/repository";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { CategoryManager } from "@/components/category-manager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, categories] = await Promise.all([getSettings(), getAllCategories()]);
  return (
    <>
      <PageHeader title="Réglages" backHref="/" hideSettings />
      <main className="flex flex-col gap-5 px-4 py-5">
        <SettingsForm settings={settings} />
        <CategoryManager categories={categories} />
      </main>
    </>
  );
}
