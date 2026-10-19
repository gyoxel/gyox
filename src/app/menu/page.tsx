import Link from "next/link";
import { Bank, CalendarDots, Cardholder, CaretRight, ChartLineUp, GearSix, HandCoins, Handshake, Money, PiggyBank, Receipt, Tag, Target, TrendUp, UserCircle, Wallet } from "@phosphor-icons/react/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { PageHeader } from "@/components/page-header";
import { msg } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";

const GROUPS: { title: string; items: { href: string; label: string; hint: string; icon: PhosphorIcon }[] }[] = [
  { title: msg("Mon compte"), items: [
    { href: "/profil", label: msg("Profil"), hint: msg("Ton compte Google, déconnexion"), icon: UserCircle },
    { href: "/settings", label: msg("Paramètres"), hint: msg("Thème, sauvegarde"), icon: GearSix },
  ] },
  { title: msg("Mon argent"), items: [
    { href: "/salary", label: msg("Salaire"), hint: msg("Montant, jour de paie, avances"), icon: Money },
    { href: "/incomes", label: msg("Revenus"), hint: msg("Prime, freelance, cadeau, vente…"), icon: TrendUp },
    { href: "/budget", label: msg("Dépenses"), hint: msg("Ce que tu paies ce mois-ci"), icon: Receipt },
    { href: "/credits", label: msg("Dettes"), hint: msg("Ce que tu rembourses chaque mois"), icon: Bank },
    { href: "/solde", label: msg("Solde"), hint: msg("Espèces et carte, transferts, historique"), icon: Wallet },
    { href: "/epargne", label: msg("Épargne"), hint: msg("Argent mis de côté, avec tes notes"), icon: PiggyBank },
  ] },
  { title: msg("Organiser"), items: [
    { href: "/budgets", label: msg("Budgets"), hint: msg("Transport, courses… : note ce que tu dépenses chaque jour"), icon: Cardholder },
    { href: "/daret", label: msg("Daret"), hint: msg("Tes darets et ton tour"), icon: Handshake },
    { href: "/prets", label: msg("Argent prêté"), hint: msg("L'argent que tu as prêté, et ce qu'on te rend"), icon: HandCoins },
    { href: "/goals", label: msg("Objectifs"), hint: msg("Voiture, maison, voyage…"), icon: Target },
    { href: "/calendar", label: msg("Calendrier"), hint: msg("Jour par jour : entrées, sorties, rappels et notes"), icon: CalendarDots },
    {
      href: "/stats",
      label: msg("Statistiques"),
      hint: msg("Répartition, prévisions"),
      icon: ChartLineUp,
    },
    { href: "/categories", label: msg("Catégories"), hint: msg("Ajouter, renommer, ordonner"), icon: Tag },
  ] },
];

/** Menu tab: every page of the app (the bar's Dépenses and Dettes too). */
export default async function MenuPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t("Menu")} info="menu" hideSettings />
      {/* Each page here opens as a section: back from it is Accueil. */}
      <main data-nav="section" className="flex flex-col gap-5 px-4 py-4">
        {GROUPS.map(({ title, items }) => (
          <section key={title} className="flex flex-col gap-2">
            <h2 className="px-1 text-[13px] font-semibold text-slate-500 dark:text-slate-400">{t(title)}</h2>
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
                    <span className="block text-[15px] font-semibold text-slate-900 dark:text-white">{t(label)}</span>
                    <span className="block truncate text-[12.5px] text-slate-500 dark:text-slate-400">{t(hint)}</span>
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
