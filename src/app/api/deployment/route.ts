import { NextResponse } from "next/server";

import { getModelArtifact } from "@/features/sentinel/server/sentinel-store";

export function GET() {
  return NextResponse.json({ artifact: getModelArtifact() });
}
