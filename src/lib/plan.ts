// Repayment plans (a credit, a loan): installments of `monthly`, the last
// one taking what's left.

const round = (n: number) => Math.round(n * 100) / 100;

/** Number of installments and the last one, for `total` at `monthly`. */
export function planFor(total: number, monthly: number): { count: number; last: number } | null {
  if (!(total > 0) || !(monthly > 0)) return null;
  const count = Math.ceil(total / monthly - 1e-9);
  return { count, last: round(total - (count - 1) * monthly) };
}

/**
 * Monthly amount to repay `total` in exactly `months` installments, the
 * last one taking what's left: the roundest amount that fits — to the
 * hundred if possible (2000 in 3 → 700, last 600), else to 50, 10, 1
 * (2000 in 6 → 350, last 250) — keeping the last one at least half of it.
 */
export function monthlyFor(total: number, months: number): number {
  if (months <= 1) return round(total);
  const exact = total / months;
  const fits = (m: number) => m > 0 && m <= total && (months - 1) * m < total - 1e-9 && months * m >= total - 1e-9;
  let firstFit: number | null = null;
  for (const step of [100, 50, 10, 1]) {
    for (const m of [Math.round(exact / step) * step, Math.ceil(exact / step) * step]) {
      if (!fits(m)) continue;
      firstFit ??= m;
      if (total - (months - 1) * m >= m / 2) return m;
    }
  }
  return firstFit ?? Math.ceil(exact * 100) / 100;
}
