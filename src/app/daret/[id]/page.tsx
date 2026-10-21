import { getAllPayments, getDaretById, getSettings } from "@/lib/page-data";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { DaretForm } from "@/components/daret-form";
import { DeleteButton } from "@/components/delete-button";
import { MethodIcon } from "@/components/method-icon";
import { daretDelete } from "@/lib/delete-specs";
import { daretPayout } from "@/lib/daret";
import { parseMonthKey } from "@/lib/date";
import { monthLabel, whenLabel } from "@/lib/i18n/dates";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/utils";
import type { PaymentMethod } from "@/lib/types";

export const dynamic = "force-dynamic";

/** A daret: its form, and under it what happened in it, each with its date. */
export default async function EditDaretPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [settings, daret, payments, { lang, t }] = await Promise.all([getSettings(), getDaretById(id), getAllPayments(), getI18n()]);
  if (!daret) notFound();
  const money = (n: number) => formatMoney(n, settings.currency);
  const now = new Date();

  // Each contribution paid (its parts added up), the pot received, when it was added: the last on top.
  const events: { key: string; label: string; amount: string; method: PaymentMethod | null; at: string; tone: "in" | "out" | "none" }[] = [];
  const months = new Map<string, { amount: number; method: PaymentMethod | null; at: string }>();
  for (const p of payments) {
    if (p.expenseId !== daret.expenseId || !p.monthKey || p.amountPaid <= 0) continue;
    const m = months.get(p.monthKey) ?? { amount: 0, method: null, at: "" };
    m.amount += p.amountPaid;
    if (p.paidAt > m.at) Object.assign(m, { at: p.paidAt, method: p.method ?? m.method });
    months.set(p.monthKey, m);
  }
  for (const [key, m] of months) {
    events.push({
      key,
      label: `${t("Cotisation")} · ${monthLabel(parseMonthKey(key), lang)}`,
      amount: `−${money(m.amount)}`,
      method: m.method,
      at: m.at,
      tone: "out",
    });
  }
  if (daret.payoutMethod && daret.payoutReceivedAt) {
    events.push({ key: "payout", label: t("Daret reçue"), amount: `+${money(daretPayout(daret))}`, method: daret.payoutMethod, at: daret.payoutReceivedAt, tone: "in" });
  }
  events.sort((a, b) => b.at.localeCompare(a.at));
  events.push({ key: "created", label: t("Daret ajoutée"), amount: "", method: null, at: daret.createdAt, tone: "none" });

  return (
    <>
      <PageHeader
        title={`${t("Modifier")} · ${daret.expense.name}`}
        back
        info="daret-edit"
        action={<DeleteButton variant="icon" {...daretDelete(daret, t)} />}
      />
      <main className="px-4 py-5">
        <DaretForm
          currency={settings.currency}
          daret={daret}
          history={
            <section className="flex flex-col gap-2">
              <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("Historique")}</h2>
              <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {events.map((e) => (
                  <li key={e.key} className="flex items-center gap-2 border-t border-slate-100 px-3.5 py-2.5 text-sm first:border-t-0 dark:border-slate-800">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-800 first-letter:uppercase dark:text-slate-100">{e.label}</span>
                      <span className="block text-[11px] tabular-nums text-slate-400">
                        {whenLabel(e.at, lang, t, now)}
                        {e.method && (
                          <>
                            {" "}
                            · <MethodIcon method={e.method} />
                          </>
                        )}
                      </span>
                    </span>
                    {e.amount && (
                      <span className={e.tone === "in" ? "font-semibold tabular-nums text-emerald-600" : "font-semibold tabular-nums text-slate-700 dark:text-slate-200"}>
                        {e.amount}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          }
        />
      </main>
    </>
  );
}
