import { CalendarDays, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SignOutButton } from "@/components/sign-out-button";
import { currentAccount } from "@/lib/accounts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profil · GX Salaire" };

const memberSince = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "Africa/Casablanca" }).format(new Date(iso));

/** The signed-in account (from Google) and Déconnexion. */
export default async function ProfilPage() {
  const account = await currentAccount();
  const name = account?.name || account?.email.split("@")[0] || "";
  return (
    <>
      <PageHeader title="Profil" back hideSettings />
      <main className="flex flex-col gap-5 px-4 py-5">
        {account ? (
          <>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 px-5 py-6 text-center text-white shadow-lg ring-1 ring-white/5">
              <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/5" />
              <div className="relative flex flex-col items-center">
                {account.image ? (
                  // Google's photo, as is (no image optimisation needed).
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={account.image}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-20 w-20 rounded-full object-cover shadow-md ring-4 ring-white/15"
                  />
                ) : (
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#00c3ab] to-[#007261] text-3xl font-bold shadow-md ring-4 ring-white/15">
                    {name.charAt(0).toUpperCase()}
                  </span>
                )}
                <p className="mt-3 text-lg font-semibold">{name}</p>
                <p className="text-sm text-white/70">{account.email}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Row icon={Mail} label="Connecté avec Google" value={account.email} />
              <Row icon={CalendarDays} label="Membre depuis" value={memberSince(account.createdAt)} />
              <Row icon={ShieldCheck} label="Sécurité" value="Tes informations sont protégées" />
            </div>

            <SignOutButton />
          </>
        ) : (
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-600 dark:text-slate-300">Ta session a expiré : reconnecte-toi avec Google.</p>
            <SignOutButton />
          </div>
        )}
        <p className="text-center text-xs text-slate-400">
          <Link href="/confidentialite" className="underline underline-offset-2">
            Confidentialité
          </Link>
          {" · "}
          <Link href="/conditions" className="underline underline-offset-2">
            Conditions
          </Link>
        </p>
      </main>
    </>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3.5 border-t border-slate-100 px-4 py-3.5 first:border-t-0 dark:border-slate-800">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-slate-500 dark:text-slate-400">{label}</span>
        <span className="block truncate text-[15px] font-medium text-slate-900 dark:text-white">{value}</span>
      </span>
    </div>
  );
}
