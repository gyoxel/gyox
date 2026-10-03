// Validation of a daret's form (create and edit).
import { z } from "zod";
import { compareMonths, monthKey, parseMonthKey } from "./date";
import { daretEndMonth, lastDayOfMonth } from "./daret";

const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mois invalide.");

export const daretInputSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(80),
  amount: z.number().positive("La cotisation doit être positive."),
  members: z.number().int().min(2, "Au moins 2 membres.").max(60, "60 membres maximum."),
  startMonth: monthKeySchema,
  turnMonth: monthKeySchema,
});

/** Checks the turn falls within the daret and gives the backing expense's dates. */
export function daretDates(input: z.infer<typeof daretInputSchema>): { startDate: string; endDate: string } | string {
  const start = parseMonthKey(input.startMonth);
  const end = daretEndMonth(start, input.members);
  const turn = parseMonthKey(input.turnMonth);
  if (compareMonths(turn, start) < 0 || compareMonths(turn, end) > 0) {
    return "Ton tour doit tomber pendant la durée de la daret.";
  }
  return { startDate: `${monthKey(start)}-01`, endDate: lastDayOfMonth(end) };
}

