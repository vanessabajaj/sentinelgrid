import { NextResponse } from "next/server";

import { deployModelToAirGap } from "@/features/sentinel/server/sentinel-store";

/** Runs the simulated air-gap transfer pipeline and activates the artifact. */
export function POST() {
  const result = deployModelToAirGap();
  return NextResponse.json(result);
}
