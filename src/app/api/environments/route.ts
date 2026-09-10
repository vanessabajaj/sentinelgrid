import { NextResponse } from "next/server";

import {
  getEnvironments,
  refreshWorkerHealth,
} from "@/features/sentinel/server/sentinel-store";

export async function GET() {
  await refreshWorkerHealth();
  return NextResponse.json({ environments: getEnvironments() });
}
