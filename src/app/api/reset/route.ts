import { NextResponse } from "next/server";

import { resetStore } from "@/features/sentinel/server/sentinel-store";

/** Restores the demo control plane to its initial baseline. Demo/dev use only. */
export function POST() {
  resetStore();
  return NextResponse.json({ status: "reset" });
}
