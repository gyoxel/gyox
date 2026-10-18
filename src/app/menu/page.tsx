import Link from "next/link";
import { Bank, CalendarDots, Cardholder, CaretRight, ChartLineUp, GearSix, HandCoins, Handshake, Money, PiggyBank, Receipt, Tag, Target, TrendUp, UserCircle, Wallet } from "@phosphor-icons/react/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { PageHeader } from "@/components/page-header";

const GROUPS: { title: string; items: { href: string; label: string; hint: string; icon: PhosphorIcon }[] }[] = [
  { title: "Mon compte", items: [
    { href: "/profil", label: "Profil", hint: "Ton compte Google, déconnexion", icon: UserCircle },
    { href: "/settings", label: "Paramètres", hint: "Thème, sauvegarde", icon: GearSix },
  ] },
  { title: "Mon argent", items: [
    { href: "/salary", label: "Salaire", hint: "Montant, jour de paie, avances", icon: Money },
    { href: "/incomes", label: "Revenus", hint: "Prime, freelance, cadeau, vente…", icon: TrendUp },
    { href: "/budget", label: "Dépenses", hint: "Ce que tu paies ce mois-ci", icon: Receipt },
    { href: "/credits", label: "Dettes", hint: "Ce que tu rembourses chaque mois", icon: Bank },
    { href: "/solde", label: "Solde", hint: "Espèces et carte, transferts, historique", icon: Wallet },
    { href: "/epargne", label: "Épargne", hint: "Argent mis de côté, avec tes notes", icon: PiggyBank },
  ] },
  { title: "Organiser", items: [
    { href: "/budgets", label: "Budgets", hint: "Transport, courses… : note ce que tu dépenses chaque jour", icon: Cardholder },
    { href: "/daret", label: "Daret", hint: "Tes darets et ton tour", icon: Handshake },
    { href: "/prets", label: "Argent prêté", hint: "L'argent que tu as prêté, et ce qu'on te rend", icon: HandCoins },
    { href: "/goals", label: "Objectifs", hint: "Voiture, maison, voyage…", icon: Target },
    { href: "/calendar", label: "Calendrier", hint: "Jour par jour : entrées, sorties, rappels et notes", icon: CalendarDots },
    {
      href: "/stats",
      label: "Statistiques",
      hint: "Répartition, prévisions",
      icon: ChartLineUp,
    },
    { href: "/categories", label: "Catégories", hint: "Ajouter, renommer, ordonner", icon: Tag },
  ] },
];

/** Menu tab: every page of the app (the bar's Dépenses and Dettes too). */
export default function MenuPage() {
  return (
    <>
      <PageHeader title="Menu" hideSettings />
      <main className="flex flex-col gap-5 px-4 py-4">
        {GROUPS.map(({ title, items }) => (
          <section key={title} className="flex flex-col gap-2">
            <h2 className="px-1 text-[13px] font-semibold text-slate-500 dark:text-slate-400">{title}</h2>
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {items.map(({ href, label, hint, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  prefetch
                  className="flex items-center gap-3.5 border-t border-slate-100 px-4 py-3.5 first:border-t-0 active:bg-slate-50 dark:border-slate-800 dark:active:bg-slate-800"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl gx-tile text-[var(--gx-tile-ink)]">
                    <Icon weight="duotone" className="h-[22px] w-[22px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-slate-900 dark:text-white">{label}</span>
                    <span className="block truncate text-[12.5px] text-slate-500 dark:text-slate-400">{hint}</span>
                  </span>
                  <CaretRight weight="bold" className="h-4 w-4 shrink-0 text-slate-300" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
