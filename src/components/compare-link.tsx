import Link from "next/link";
import { ArrowsLeftRight } from "@phosphor-icons/react/ssr";
import { addMonths, monthKey, type MonthId } from "@/lib/date";
import { getI18n } from "@/lib/i18n/server";

/** Opens « Comparer deux mois » on `month` and the one before (Bilan, Statistiques). */
export async function CompareLink({ month }: { month: MonthId }) {
  const { t } = await getI18n();
  return (
    <Link
      href={`/bilan/comparer?a=${monthKey(month)}&b=${monthKey(addMonths(month, -1))}`}
      className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 shadow-sm active:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
    >
      <ArrowsLeftRight weight="bold" className="h-4 w-4" />
      {t("Comparer deux mois")}
    </Link>
  );
}
