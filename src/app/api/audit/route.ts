import { NextResponse } from "next/server";

import { listAuditEntries } from "@/features/sentinel/server/sentinel-store";

export function GET() {
  return NextResponse.json({ entries: listAuditEntries() });
}
