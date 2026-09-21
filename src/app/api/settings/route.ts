import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/repository";
import { settingsInputSchema } from "@/lib/validation";

export async function GET() {
  return NextResponse.json(await getSettings());
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const merged = { ...(await getSettings()), ...body };
  const parsed = settingsInputSchema.safeParse(merged);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const settings = await updateSettings(parsed.data);
  return NextResponse.json(settings);
}
