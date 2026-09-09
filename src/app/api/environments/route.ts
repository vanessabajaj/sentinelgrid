import { NextResponse } from "next/server";

import { getEnvironments } from "@/features/sentinel/server/sentinel-store";

export function GET() {
  return NextResponse.json({ environments: getEnvironments() });
}
