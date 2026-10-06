import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { currentAccount } from "@/lib/accounts";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · GX Salaire" };

const when = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Africa/Casablanca",
      }).format(new Date(iso))
    : "—";

/** The accounts: who signed up, when, and their last sign-in. Owner only. */
export default async function AdminPage() {
  const account = await currentAccount();
  if (!isAdmin(account?.email)) notFound();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, image: true, createdAt: true, lastLoginAt: true },
  });

  return (
    <>
      <PageHeader title="Admin" back hideSettings />
      <main className="flex flex-col gap-4 px-4 py-5">
        <div className="rounded-3xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 px-5 py-4 text-white shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Comptes</p>
          <p className="mt-1 text-4xl font-bold tabular-nums">{users.length}</p>
        </div>

        <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {users.map((u) => {
            const name = u.name || u.email.split("@")[0];
            return (
              <li key={u.id} className="flex items-start gap-3 border-t border-slate-100 px-4 py-3.5 first:border-t-0 dark:border-slate-800">
                {u.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.image} alt="" referrerPolicy="no-referrer" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00c3ab] to-[#007261] text-lg font-bold text-white">
                    {name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-slate-900 dark:text-white">{name}</span>
                  <span className="block truncate text-sm text-slate-500 dark:text-slate-400">{u.email}</span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                    Inscrit le {when(u.createdAt)}
                    <br />
                    Dernière connexion : {when(u.lastLoginAt)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
