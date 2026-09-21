import { NextResponse } from "next/server";
import { exportData } from "@/lib/repository";

export async function GET() {
  const data = exportData();
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="budget-backup-${data.exportedAt.slice(0, 10)}.json"`,
    },
  });
}
