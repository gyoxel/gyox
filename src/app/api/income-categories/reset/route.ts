import { NextResponse } from "next/server";
import { resetIncomeCategories } from "@/lib/income-categories-repo";

/** POST: back to the default income categories. */
export async function POST() {
  return NextResponse.json(await resetIncomeCategories());
}
