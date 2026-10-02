import Link from "next/link";
import { Banknote, CalendarDays, ChartNoAxesCombined, ChevronRight, HandCoins, Settings, Tags, Target, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";

const GROUPS: { href: string; label: string; hint: string; icon: LucideIcon; tint: string }[][] = [
  [
    { href: "/salary", label: "Salaire", hint: "Montant, jour de paie, avances", icon: Banknote, tint: "from-emerald-400 to-teal-600" },
    { href: "/incomes", label: "Revenus", hint: "Prime, freelance, cadeau, vente…", icon: TrendingUp, tint: "from-lime-400 to-green-600" },
    { href: "/solde", label: "Solde", hint: "Cash et carte, transferts, historique", icon: Wallet, tint: "from-indigo-400 to-violet-600" },
  ],
  [
    { href: "/daret", label: "Daret", hint: "Tes darets et ton tour", icon: HandCoins, tint: "from-teal-400 to-emerald-600" },
    { href: "/goals", label: "Objectifs", hint: "Voiture, maison, voyage…", icon: Target, tint: "from-amber-400 to-orange-500" },
    { href: "/calendar", label: "Calendrier", hint: "Jour par jour : entrées, sorties, rappels et notes", icon: CalendarDays, tint: "from-rose-400 to-pink-600" },
    {
      href: "/stats",
      label: "Statistiques",
      hint: "Répartition, prévisions",
      icon: ChartNoAxesCombined,
      tint: "from-sky-400 to-blue-600",
    },
    { href: "/categories", label: "Catégories", hint: "Ajouter, renommer, ordonner", icon: Tags, tint: "from-violet-400 to-purple-600" },
  ],
  [{ href: "/settings", label: "Paramètres", hint: "Thème, sauvegarde", icon: Settings, tint: "from-slate-400 to-slate-600" }],
];

/** Menu tab: everything that isn't a daily screen. */
export default function MenuPage() {
  return (
    <>
      <PageHeader title="Menu" hideSettings />
      <main className="flex flex-col gap-4 px-4 py-5">
        {GROUPS.map((group, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            {group.map(({ href, label, hint, icon: Icon, tint }) => (
              <Link
                key={href}
                href={href}
                prefetch
                className="flex items-center gap-3.5 border-t border-slate-100 px-4 py-3.5 first:border-t-0 active:bg-slate-50 dark:border-slate-800 dark:active:bg-slate-800"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${tint}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-slate-900 dark:text-white">{label}</span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{hint}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            ))}
          </div>
        ))}
      </main>
    </>
  );
}
