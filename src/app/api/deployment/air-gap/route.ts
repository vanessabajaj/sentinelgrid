import { NextResponse } from "next/server";

import { deployModelToAirGap } from "@/features/sentinel/server/sentinel-store";

/** Activates the simulated import only after its real checksum matches. */
export function POST() {
  const result = deployModelToAirGap();
  return NextResponse.json(result);
}
