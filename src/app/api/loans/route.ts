import { NextResponse, type NextRequest } from "next/server";
import { createLoan, getAllLoans } from "@/lib/loans-repo";
import { loanInputSchema, toLoanInput } from "@/lib/loan-input";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getAllLoans());
}

export async function POST(req: NextRequest) {
  const parsed = loanInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = toLoanInput(parsed.data);
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  return NextResponse.json(await createLoan(input), { status: 201 });
}
