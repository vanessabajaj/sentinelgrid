import type {
  Classification,
  Incident,
  IncidentAnalysis,
  IncidentType,
  NetworkMode,
  Severity,
  WorkerHealth,
} from "../types";
import type { WorkerExecutionResult } from "./types";
import type { WorkerDescriptor } from "./worker-config";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

export function isIncident(value: unknown): value is Incident {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    INCIDENT_TYPES.includes(value.incidentType as IncidentType) &&
    CLASSIFICATIONS.includes(value.classification as Classification) &&
    SEVERITIES.includes(value.severity as Severity) &&
    NETWORK_MODES.includes(value.requiredNetworkMode as NetworkMode) &&
    typeof value.estimatedWorkload === "number" &&
    Number.isFinite(value.estimatedWorkload) &&
    value.estimatedWorkload > 0 &&
    typeof value.sampleContent === "string" &&
    typeof value.submittedAt === "string"
  );
}

function isIncidentAnalysis(value: unknown): value is IncidentAnalysis {
  if (!isRecord(value) || !Array.isArray(value.timeline)) {
    return false;
  }

  return (
    SEVERITIES.includes(value.severity as Severity) &&
    typeof value.summary === "string" &&
    typeof value.suspectedAttackType === "string" &&
    isStringArray(value.indicators) &&
    isStringArray(value.recommendedActions) &&
    typeof value.confidence === "number" &&
    typeof value.generatedAt === "string" &&
    value.timeline.every(
      (event) =>
        isRecord(event) &&
        typeof event.timestamp === "string" &&
        typeof event.description === "string",
    )
  );
}

export function isWorkerExecutionResult(
  value: unknown,
  descriptor: WorkerDescriptor,
): value is WorkerExecutionResult {
  if (!isRecord(value) || !isIncidentAnalysis(value.analysis)) {
    return false;
  }

  return (
    value.environmentId === descriptor.environmentId &&
    value.workerName === descriptor.workerName &&
    value.executionMode === descriptor.executionMode &&
    typeof value.startedAt === "string" &&
    typeof value.completedAt === "string" &&
    Array.isArray(value.timeline) &&
    value.timeline.every(
      (event) =>
        isRecord(event) &&
        typeof event.timestamp === "string" &&
        typeof event.description === "string",
    )
  );
}

export function isWorkerHealth(
  value: unknown,
  descriptor: WorkerDescriptor,
): value is WorkerHealth {
  return (
    isRecord(value) &&
    value.environmentId === descriptor.environmentId &&
    value.workerName === descriptor.workerName &&
    value.executionMode === descriptor.executionMode &&
    value.status === "ONLINE"
  );
}
