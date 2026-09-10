import { NextResponse } from "next/server";

import {
  getEnvironments,
  listWorkloads,
  submitIncident,
} from "@/features/sentinel/server/sentinel-store";
import type {
  Classification,
  IncidentSubmission,
  IncidentType,
  NetworkMode,
  Severity,
} from "@/features/sentinel/types";

const INCIDENT_TYPES: readonly IncidentType[] = [
  "FIREWALL_LOG",
  "AUTHENTICATION_LOG",
  "CVE_ANALYSIS",
  "THREAT_INTELLIGENCE",
  "CLASSIFIED_TELEMETRY",
];
const CLASSIFICATIONS: readonly Classification[] = [
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "SECRET",
  "CLASSIFIED",
];
const SEVERITIES: readonly Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const NETWORK_MODES: readonly NetworkMode[] = [
  "NONE",
  "CONTROLLED",
  "EXTERNAL",
];

export function GET() {
  return NextResponse.json({ workloads: listWorkloads() });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const validationError = validateSubmission(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const result = submitIncident(body as IncidentSubmission);

  return NextResponse.json(
    { result, environments: getEnvironments() },
    { status: 201 },
  );
}

function validateSubmission(body: unknown): string | null {
  if (typeof body !== "object" || body === null) {
    return "Request body must be an object.";
  }

  const record = body as Record<string, unknown>;

  if (
    typeof record.title !== "string" ||
    record.title.trim().length === 0
  ) {
    return 'Field "title" is required.';
  }
  if (
    typeof record.description !== "string" ||
    record.description.trim().length === 0
  ) {
    return 'Field "description" is required.';
  }
  if (
    typeof record.sampleContent !== "string" ||
    record.sampleContent.trim().length === 0
  ) {
    return 'Field "sampleContent" is required.';
  }
  if (!INCIDENT_TYPES.includes(record.incidentType as IncidentType)) {
    return `Field "incidentType" must be one of: ${INCIDENT_TYPES.join(", ")}.`;
  }
  if (!CLASSIFICATIONS.includes(record.classification as Classification)) {
    return `Field "classification" must be one of: ${CLASSIFICATIONS.join(", ")}.`;
  }
  if (!SEVERITIES.includes(record.severity as Severity)) {
    return `Field "severity" must be one of: ${SEVERITIES.join(", ")}.`;
  }
  if (!NETWORK_MODES.includes(record.requiredNetworkMode as NetworkMode)) {
    return `Field "requiredNetworkMode" must be one of: ${NETWORK_MODES.join(", ")}.`;
  }
  if (
    typeof record.estimatedWorkload !== "number" ||
    !Number.isFinite(record.estimatedWorkload) ||
    record.estimatedWorkload <= 0
  ) {
    return 'Field "estimatedWorkload" must be a positive number.';
  }

  return null;
}
