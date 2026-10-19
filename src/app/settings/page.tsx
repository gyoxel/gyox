import { getSettings } from "@/lib/page-data";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/ssr";

import { currentAccount } from "@/lib/accounts";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, account, { t }] = await Promise.all([getSettings(), currentAccount(), getI18n()]);
  const name = account?.name || account?.email.split("@")[0] || t("Mon compte");
  return (
    <>
      <PageHeader title={t("Paramètres")} back hideSettings info="settings" />
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
              <span className="gx-avatar flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-extrabold">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-semibold">{name}</span>
              <span className="block truncate text-xs text-white/70">{account?.email ?? t("Profil, déconnexion")}</span>
            </span>
            <CaretRight weight="bold" className="h-5 w-5 shrink-0 text-white/60" />
          </div>
        </Link>
        <SettingsForm settings={settings} account={account && { id: account.id, email: account.email, name: account.name }} />
      </main>
    </>
  );
}
