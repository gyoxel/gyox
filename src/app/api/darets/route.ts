import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { compareMonths, monthKey, parseMonthKey } from "@/lib/date";
import { daretEndMonth, lastDayOfMonth } from "@/lib/daret";
import { createDaret, getAllDarets } from "@/lib/repository";

const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mois invalide.");

const daretInputSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(80),
  amount: z.number().positive("La cotisation doit être positive."),
  members: z.number().int().min(2, "Au moins 2 membres.").max(60, "60 membres maximum."),
  startMonth: monthKeySchema,
  turnMonth: monthKeySchema,
});

export async function GET() {
  return NextResponse.json(await getAllDarets());
}

export async function POST(req: NextRequest) {
  const parsed = daretInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, amount, members, startMonth, turnMonth } = parsed.data;
  const start = parseMonthKey(startMonth);
  const end = daretEndMonth(start, members);
  const turn = parseMonthKey(turnMonth);
  if (compareMonths(turn, start) < 0 || compareMonths(turn, end) > 0) {
    return NextResponse.json(
      { error: { formErrors: ["Ton tour doit tomber pendant la durée de la daret."], fieldErrors: {} } },
      { status: 400 },
    );
  }

  const daret = await createDaret({
    name,
    amount,
    members,
    startDate: `${monthKey(start)}-01`,
    endDate: lastDayOfMonth(end),
    turnMonth,
  });
  return NextResponse.json(daret, { status: 201 });
}
