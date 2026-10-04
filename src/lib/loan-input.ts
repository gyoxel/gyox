// Validation of a loan's form (create and edit).
import { z } from "zod";
import { planFor } from "./plan";
import type { LoanInput } from "./loans-repo";

export const loanInputSchema = z.object({
  name: z.string().trim().min(1, "Indique à qui tu as prêté.").max(60),
  amount: z.number().positive("Le montant doit être positif."),
  priorRepaid: z.number().nonnegative().nullable().default(null),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
  method: z.enum(["cash", "card"]).nullable(),
  monthly: z.number().positive("Indique le montant par mois."),
  startMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mois invalide."),
  note: z.string().trim().max(500).nullable().default(null),
});

/** The loan to save (installments counted from the monthly), or what's wrong. */
export function toLoanInput(data: z.infer<typeof loanInputSchema>): LoanInput | string {
  const priorRepaid = data.priorRepaid && data.priorRepaid > 0 ? data.priorRepaid : null;
  const toRepay = Math.round((data.amount - (priorRepaid ?? 0)) * 100) / 100;
  if (!(toRepay > 0)) return "Le montant déjà rendu doit être inférieur au montant prêté.";
  if (data.monthly > toRepay) return "Le montant par mois ne peut pas dépasser ce qu'il reste à rendre.";
  const plan = planFor(toRepay, data.monthly)!;
  if (plan.count > 600) return "Trop de mois : augmente le montant par mois.";
  return { ...data, priorRepaid, months: plan.count, note: data.note || null };
}
