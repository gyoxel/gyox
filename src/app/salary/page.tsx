import { getAllSalaryAdvances, getAllSalaryReceipts, getSettings } from "@/lib/repository";
import { monthLabelFr, parseMonthKey } from "@/lib/date";
import { METHOD_META } from "@/lib/payment-method";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { SalaryPanel } from "@/components/countdown-next-salary";

export const dynamic = "force-dynamic";

const TIME_ZONE = "Africa/Casablanca";
const RECEIVED = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, day: "numeric", month: "short" });

/** Days until the next pay day (the clamped `payDay` of this or next month). */
function nextPayDay(payDay: number): { date: Date; days: number } {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: TIME_ZONE }));
  const at = (y: number, m: number) => new Date(y, m, Math.min(payDay, new Date(y, m + 1, 0).getDate()));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let date = at(now.getFullYear(), now.getMonth());
  if (date <= today) date = at(now.getFullYear(), now.getMonth() + 1);
  return { date, days: Math.round((date.getTime() - today.getTime()) / 86_400_000) };
}

/**
 * Menu → Salaire: the salary on a hero card (amount, pay day, account,
 * next pay day), the same panel as tapping the Accueil countdown (received,
 * advances, settings) and the salaries received so far.
 */
export default async function SalaryPage() {
  const [settings, advances, receipts] = await Promise.all([getSettings(), getAllSalaryAdvances(), getAllSalaryReceipts()]);
  const money = (n: number) => formatMoney(n, settings.currency);
  const next = nextPayDay(settings.payDay);
  const nextLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(next.date);
  const method = METHOD_META[settings.salaryMethod];

  return (
    <>
      <PageHeader title="Salaire" back />
      <main className="flex flex-col gap-5 px-4 py-5">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-700 px-5 pb-4 pt-5 text-white shadow-lg shadow-teal-600/20 dark:shadow-none">
          <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
          <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">Salaire mensuel</p>
          <p className="relative mt-1 text-4xl font-bold tabular-nums">{money(settings.salary)}</p>
          <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/15 px-2 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/75">Jour</p>
              <p className="text-sm font-bold">Le {settings.payDay === 1 ? "1er" : settings.payDay}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-2 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/75">Reçu en</p>
              <p className="text-sm font-bold">
                {method.emoji} {method.label}
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 px-2 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/75">Prochain</p>
              <p className="text-sm font-bold">J-{next.days}</p>
            </div>
          </div>
          <p className="relative mt-2 text-xs text-white/85">{nextLabel.charAt(0).toUpperCase() + nextLabel.slice(1)}</p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <SalaryPanel settings={settings} advances={advances} />
        </section>

        {receipts.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Salaires reçus</h2>
            <ul className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {[...receipts].reverse().map((r) => (
                <li key={r.id} className="flex items-center gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0 dark:border-slate-800">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-base dark:bg-emerald-950/50">
                    💼
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium capitalize text-slate-800 dark:text-slate-100">
                      {monthLabelFr(parseMonthKey(r.period))}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      Reçu le {RECEIVED.format(new Date(r.createdAt))} · {METHOD_META[r.method].emoji} {METHOD_META[r.method].label}
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-emerald-600">+{money(r.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
