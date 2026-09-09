import { mockEnvironments } from "@/data/mock-sentinel-data";
import {
  classifyContent,
  hasClassificationConflict,
} from "@/features/sentinel/classification/classify-content";
import { generateIncidentAnalysis } from "@/features/sentinel/analysis/generate-incident-analysis";
import { evaluateRouting } from "@/features/sentinel/routing/evaluate-routing";
import { POLICY_VERSION } from "@/features/sentinel/routing/policy-config";
import type {
  AuditEntry,
  Environment,
  Incident,
  IncidentSubmission,
  WorkloadResult,
} from "@/features/sentinel/types";

/**
 * In-memory job orchestrator for the SentinelGrid demo. It holds the mutable
 * environment capacity state, the workload history, and the audit trail — a
 * shared "control plane" for every request within this server process.
 *
 * This is a demo-scale simulator, not a durable store: state resets when the
 * server process restarts. Persisting to a real database (per the system
 * architecture in the project README) is the natural next step.
 */

interface SentinelStoreState {
  environments: Environment[];
  workloads: WorkloadResult[];
  auditEntries: AuditEntry[];
  sequence: number;
}

function createInitialState(): SentinelStoreState {
  return {
    environments: mockEnvironments.map((environment) => ({
      ...environment,
      supportedIncidentTypes: [...environment.supportedIncidentTypes],
    })),
    workloads: [],
    auditEntries: [],
    sequence: 0,
  };
}

// Cached on `globalThis` so the store survives Next.js dev-server module
// reloads instead of silently resetting on every hot reload.
const globalForSentinel = globalThis as unknown as {
  __sentinelStore__?: SentinelStoreState;
};

function getState(): SentinelStoreState {
  if (!globalForSentinel.__sentinelStore__) {
    globalForSentinel.__sentinelStore__ = createInitialState();
  }

  return globalForSentinel.__sentinelStore__;
}

export function getEnvironments(): Environment[] {
  return getState().environments;
}

export function listWorkloads(): WorkloadResult[] {
  return getState().workloads;
}

export function listAuditEntries(): AuditEntry[] {
  return getState().auditEntries;
}

export function resetStore(): void {
  globalForSentinel.__sentinelStore__ = createInitialState();
}

function nextIncidentId(sequence: number): string {
  return `INC-${new Date().getUTCFullYear()}-${String(sequence).padStart(4, "0")}`;
}

function toAuditEntry(result: WorkloadResult): AuditEntry {
  return {
    decisionId:
      result.decision?.id ??
      `quarantine:${result.incident.id}:${POLICY_VERSION}`,
    timestamp: result.incident.submittedAt,
    incidentTitle: result.incident.title,
    classification: result.incident.classification,
    outcome: result.outcome,
    selectedEnvironment: result.decision?.selectedEnvironment ?? null,
    policyVersion: POLICY_VERSION,
  };
}

/**
 * Processes one incident submission end to end: classify, check for a
 * declared-vs-detected classification conflict (quarantining if found),
 * evaluate routing against live environment capacity, allocate capacity for
 * a routed job, and generate an analysis. Every outcome is recorded to the
 * audit trail.
 */
export function submitIncident(submission: IncidentSubmission): WorkloadResult {
  const state = getState();
  state.sequence += 1;

  const incident: Incident = {
    ...submission,
    id: nextIncidentId(state.sequence),
    submittedAt: new Date().toISOString(),
  };

  const classification = classifyContent(
    `${incident.title} ${incident.description} ${incident.sampleContent}`,
  );

  const conflict = hasClassificationConflict(
    incident.classification,
    classification.detectedClassification,
  );

  let result: WorkloadResult;

  if (conflict) {
    result = {
      incident,
      classification,
      outcome: "QUARANTINED",
      decision: null,
      analysis: null,
    };
  } else {
    // A detected requirement for external lookups (e.g. "search VirusTotal")
    // escalates the effective network requirement even if the analyst didn't
    // declare one, so the policy engine can block it where appropriate.
    const effectiveIncident: Incident = classification.requiresExternalNetwork
      ? { ...incident, requiredNetworkMode: "EXTERNAL" }
      : incident;

    const decision = evaluateRouting(effectiveIncident, state.environments);

    if (decision.status === "ROUTED" && decision.selectedEnvironment) {
      const environment = state.environments.find(
        (candidate) => candidate.id === decision.selectedEnvironment,
      );

      if (environment) {
        environment.usedCapacity += incident.estimatedWorkload;
      }
    }

    result = {
      incident,
      classification,
      outcome: decision.status,
      decision,
      analysis:
        decision.status === "ROUTED"
          ? generateIncidentAnalysis(incident)
          : null,
    };
  }

  state.workloads = [result, ...state.workloads];
  state.auditEntries = [toAuditEntry(result), ...state.auditEntries];

  return result;
}
