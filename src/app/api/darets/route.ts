import { NextRequest, NextResponse } from "next/server";
import { createDaret, getAllDarets } from "@/lib/repository";
import { daretDates, daretInputSchema } from "@/lib/daret-input";

export async function GET() {
  return NextResponse.json(await getAllDarets());
}

export async function POST(req: NextRequest) {
  const parsed = daretInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, amount, members, turnMonth } = parsed.data;
  const dates = daretDates(parsed.data);
  if (typeof dates === "string") {
    return NextResponse.json({ error: { formErrors: [dates], fieldErrors: {} } }, { status: 400 });
  }

  const daret = await createDaret({ name, amount, members, ...dates, turnMonth });
  return NextResponse.json(daret, { status: 201 });
}
