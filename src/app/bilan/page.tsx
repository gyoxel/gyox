import Link from "next/link";
import { ArrowDown, ArrowUp, CaretRight } from "@phosphor-icons/react/ssr";
import { getAllCategories, getAllDarets, getAllExpenses, getAllGoals, getAllLoans, getAllPayments, getAllSavingsMoves, getSettings } from "@/lib/page-data";
import { addMonths, compareMonths, monthFromSearchParams, monthKey, todayMonth } from "@/lib/date";
import { budgetsById } from "@/lib/category-budgets";
import { categoryBreakdown } from "@/lib/category-stats";
import { buildMonthBilan } from "@/lib/month-bilan";
import { getWallet } from "@/lib/wallet-data";
import { monthLabel } from "@/lib/i18n/dates";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { MonthSwitcher } from "@/components/month-switcher";
import { CategoryBars } from "@/components/category-bars";
import { CompareLink } from "@/components/compare-link";

export const dynamic = "force-dynamic";

/**
 * Bilan du mois (Menu): any month's money in and out of cash and the card,
 * what's left, what was put aside, each against the month before, and where
 * it went by category. Opens on the current month (the first days of a
 * month, Accueil links to the one just over).
 */
export default async function BilanPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const [sp, settings, expenses, payments, categories, darets, savingsMoves, goals, loans, { lang, t }] = await Promise.all([
    searchParams,
    getSettings(),
    getAllExpenses(),
    getAllPayments(),
    getAllCategories(),
    getAllDarets(),
    getAllSavingsMoves(),
    getAllGoals(),
    getAllLoans(),
    getI18n(),
  ]);
  const current = todayMonth();
  const month = monthFromSearchParams(sp.month, current);
  const previous = addMonths(month, -1);
  const key = monthKey(month);
  const [wallet, previousWallet] = await Promise.all([getWallet(month), getWallet(previous)]);
  const slices = categoryBreakdown({ expenses, payments, categories, darets, savingsMoves, goals, loans }, month);
  const bilan = buildMonthBilan(wallet, slices, key, monthLabel(month, lang));
  const before = buildMonthBilan(previousWallet, [], monthKey(previous), "");
  const money = (n: number) => formatMoney(n, settings.currency);
  const label = monthLabel(month, lang);
  const previousLabel = monthLabel(previous, lang);
  const timing = compareMonths(month, current);
  const left = bilan ? Math.round((bilan.moneyIn - bilan.moneyOut) * 100) / 100 : 0;

  return (
    <>
      <PageHeader title={t("Bilan du mois")} back info="bilan" />
      <main className="flex flex-col gap-5 px-4 py-5">
        <MonthSwitcher month={month} basePath="/bilan" />
        {timing === 0 && <p className="-mt-2 px-1 text-xs text-slate-500 dark:text-slate-400">{t("Mois en cours : son bilan se complète jusqu'à la fin du mois.")}</p>}

        {!bilan ? (
          <p className="rounded-2xl border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
            {timing > 0 ? t("Ce mois n'a pas encore commencé.") : t("Rien d'enregistré pour ce mois.")}
          </p>
        ) : (
          <>
            {/* What's left, and what came in / went out against the month before */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-indigo-600 to-indigo-800 px-5 pb-4 pt-5 text-white shadow-lg shadow-indigo-600/20 dark:shadow-none">
              <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
              <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
                {t("Reste")} · {label}
              </p>
              <p className="relative mt-1 text-4xl font-bold tabular-nums">
                {left < 0 ? "−" : ""}
                {money(Math.abs(left))}
              </p>
              <p className="relative text-xs text-white/80">{t("Entrées moins sorties, en espèces et sur la carte.")}</p>
              <div className="relative mt-4 grid grid-cols-2 gap-2">
                <Flow label={t("Entrées")} value={`+${money(bilan.moneyIn)}`} now={bilan.moneyIn} before={before?.moneyIn ?? 0} vs={previousLabel} t={t} />
                <Flow label={t("Sorties")} value={`−${money(bilan.moneyOut)}`} now={bilan.moneyOut} before={before?.moneyOut ?? 0} vs={previousLabel} t={t} />
              </div>
              {bilan.putAside > 0 && (
                <p className="relative mt-2 text-xs text-white/85">🐷 {t("Dont {amount} mis de côté", { amount: money(bilan.putAside) })}</p>
              )}
            </div>

            {/* Where it went */}
            <section className="flex flex-col gap-2.5">
              <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("Où est allé ton argent")}</h2>
              <CategoryBars key={key} slices={slices} currency={settings.currency} budgets={budgetsById(categories)} />
              <CompareLink month={month} />
            </section>

            <Link
              href={`/stats?month=${key}`}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 shadow-sm active:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              {t("Statistiques de {month}", { month: label })}
              <CaretRight weight="bold" className="h-4 w-4" />
            </Link>
          </>
        )}
      </main>
    </>
  );
}

/** Entrées / Sorties on the hero card, with how it moved since the month before. */
function Flow({ label, value, now, before, vs, t }: { label: string; value: string; now: number; before: number; vs: string; t: (text: string, vars?: Record<string, string | number>) => string }) {
  const pct = before > 0 ? Math.round(((now - before) / before) * 100) : null;
  const Arrow = pct != null && pct < 0 ? ArrowDown : ArrowUp;
  return (
    <div className="rounded-2xl bg-white/15 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-white/75">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 flex items-center gap-0.5 text-[10.5px] text-white/75">
        {pct == null ? (
          t("rien en {month}", { month: vs })
        ) : pct === 0 ? (
          t("comme en {month}", { month: vs })
        ) : (
          <>
            <Arrow weight="bold" className="h-3 w-3" />
            {t("{pct}% par rapport à {month}", { pct: `${pct > 0 ? "+" : "−"}${Math.abs(pct)}`, month: vs })}
          </>
        )}
      </p>
    </div>
  );
}
