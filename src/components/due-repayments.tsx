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
          className="gx-glass flex items-center gap-3 rounded-3xl border px-3.5 py-3"
        >
          <Link href={`/prets/${d.loanId}`} className="flex min-w-0 flex-1 items-center gap-3">
            <span className="gx-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl">
              🤝
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                {d.name} · {formatMoney(d.expected - d.received, currency)}
              </span>
              {/* The title already says what's left: here, what came in. */}
              <span className="line-clamp-2 text-[11.5px] leading-snug text-amber-700 dark:text-amber-200">
                {d.received > 0
                  ? `${d.monthLabel} · ${formatMoney(d.received, currency)} déjà reçus`
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
