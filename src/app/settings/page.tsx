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
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 px-5 py-4 text-white shadow-lg ring-1 ring-white/5">
          <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/5" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00c3ab] to-[#007261] text-lg font-bold shadow-sm">
              GX
            </span>
            <span>
              <span className="block text-base font-semibold">GX Salaire</span>
              <span className="block text-xs text-white/70">Salaire, dépenses, crédits, darets et objectifs</span>
            </span>
          </div>
        </div>
        <SettingsForm settings={settings} />
      </main>
    </>
  );
}
