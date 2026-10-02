import { NextResponse } from "next/server";
import { resetCategories } from "@/lib/repository";

/** POST: back to the original categories (names, emojis, order). */
export async function POST() {
  return NextResponse.json(await resetCategories());
}
