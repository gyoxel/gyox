/**
 * For an expense's update: when its amount changed, the moment it did — an
 * edit dates the expense only then (not a new name, account or category).
 */
export const amountChange = (before: number | null | undefined, after: number | null | undefined, now: string) =>
  Math.abs((before ?? 0) - (after ?? 0)) > 0.005 ? { amountChangedAt: now } : {};
