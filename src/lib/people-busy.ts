// Who can't come off the list (Personnes): someone with a debt not repaid
// yet, or a loan not all back yet (nor given up).
import type { Expense, Loan, Payment } from "./types";
import { getCreditRealState } from "./engine";
import { loanRemaining } from "./loans";
import { personKey, personOf } from "./person-groups";
import { todayMonth } from "./date";
import { getAllExpenses, getAllLoans, getAllPayments } from "./page-data";
import { getPeople } from "./people-repo";

/** personKey of everyone with a debt or a loan still going. */
export function busyPeople(expenses: Expense[], payments: Payment[], loans: Loan[]): Set<string> {
  const current = todayMonth();
  const busy = new Set<string>();
  for (const e of expenses) if (e.type === "credit" && getCreditRealState(e, payments, current).remaining > 0.005) busy.add(personKey(personOf(e)));
  for (const l of loans) if (!l.writtenOffAt && loanRemaining(l) > 0.005) busy.add(personKey(personOf(l)));
  return busy;
}

export interface PickerPerson {
  id: string;
  name: string;
  /** A debt or a loan still going: can't be removed. */
  busy: boolean;
}

/** The people for « De qui ? » / « À qui ? ». */
export async function getPickerPeople(): Promise<PickerPerson[]> {
  const [people, expenses, payments, loans] = await Promise.all([getPeople(), getAllExpenses(), getAllPayments(), getAllLoans()]);
  const busy = busyPeople(expenses, payments, loans);
  return people.map((p) => ({ id: p.id, name: p.name, busy: busy.has(personKey(p.name)) }));
}

/** Is the person `id` someone with a debt or a loan still going? */
export async function isPersonBusy(id: string): Promise<boolean> {
  const person = (await getPickerPeople()).find((p) => p.id === id);
  return person?.busy ?? false;
}
