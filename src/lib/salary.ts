// Salary of a calendar month once advances are counted: an advance adds to
// the month it was taken in and comes off the salary it was taken on.
import type { SalaryAdvance } from "./types";

/** Advances taken on the salary of `month` ("YYYY-MM"). */
export function advancesOn(advances: SalaryAdvance[], month: string): number {
  return advances.filter((a) => a.period === month).reduce((s, a) => s + a.amount, 0);
}

/** Money of `month`: the salary, minus what was already taken in advance on
 *  it, plus advances received this month on a later salary. */
export function salaryForMonth(salary: number, advances: SalaryAdvance[], month: string): number {
  const takenEarlier = advancesOn(advances, month);
  const receivedNow = advances
    .filter((a) => a.date.slice(0, 7) === month && a.period !== month)
    .reduce((s, a) => s + a.amount, 0);
  return Math.round((salary - takenEarlier + receivedNow) * 100) / 100;
}
