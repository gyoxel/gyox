import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import { ReceiveRepayment } from "@/components/loan-repayments";

export interface DueRepayment {
  loanId: string;
  name: string;
  slot: number;
  /** Expected that month in all. */
  expected: number;
  /** Already received that month. */
  received: number;
  /** "octobre 2026" */
  monthLabel: string;
}

/** Accueil: a loan's installment whose month has come — received? It stays
 *  here until it's confirmed (cash or card). */
export function DueRepayments({ items, currency }: { items: DueRepayment[]; currency: string }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      {items.map((d) => (
        <div
          key={`${d.loanId}-${d.slot}`}
          className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 dark:border-amber-900/60 dark:bg-amber-950/40"
        >
          <Link href={`/prets/${d.loanId}`} className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm dark:bg-amber-900/40">
              🤝
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                {d.name} · {formatMoney(d.expected - d.received, currency)}
              </span>
              <span className="block truncate text-[11px] text-amber-800 dark:text-amber-200">
                {d.received > 0
                  ? `${d.monthLabel} : reste ${formatMoney(d.expected - d.received, currency)} (${formatMoney(d.received, currency)} reçus)`
                  : `Remboursement · ${d.monthLabel} : reçu ?`}
              </span>
            </span>
          </Link>
          <ReceiveRepayment
            variant="compact"
            loanId={d.loanId}
            slot={d.slot}
            name={d.name}
            monthLabel={d.monthLabel}
            expected={d.expected}
            received={d.received}
          />
        </div>
      ))}
    </section>
  );
}
