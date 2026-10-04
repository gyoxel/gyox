// Validation of a savings move (Épargne).
import { z } from "zod";

export const savingsSchema = z.object({
  amount: z.number().positive("Le montant doit être positif."),
  method: z.enum(["cash", "card"]),
  note: z
    .string()
    .trim()
    .max(80)
    .nullable()
    .default(null)
    .transform((n) => n || null),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
