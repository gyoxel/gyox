import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getSettings } from "@/lib/repository";
import { currentAccount } from "@/lib/accounts";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, account] = await Promise.all([getSettings(), currentAccount()]);
  const name = account?.name || account?.email.split("@")[0] || "Mon compte";
  return (
    <>
      <PageHeader title="Paramètres" back hideSettings />
      <main className="flex flex-col gap-5 px-4 py-5">
        {/* The account: opens Profil (Déconnexion there). */}
        <Link
          href="/profil"
          prefetch
          className="relative block overflow-hidden rounded-3xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 px-5 py-4 text-white shadow-lg ring-1 ring-white/5 transition-transform active:scale-[0.98]"
        >
          <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/5" />
          <div className="relative flex items-center gap-3">
            {account?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.image} alt="" referrerPolicy="no-referrer" className="h-12 w-12 rounded-2xl object-cover shadow-sm" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00c3ab] to-[#007261] text-lg font-bold shadow-sm">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-semibold">{name}</span>
              <span className="block truncate text-xs text-white/70">{account?.email ?? "Profil, déconnexion"}</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-white/60" />
          </div>
        </Link>
        <SettingsForm settings={settings} />
      </main>
    </>
  );
}
