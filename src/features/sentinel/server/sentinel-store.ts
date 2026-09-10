import { mockEnvironments } from "@/data/mock-sentinel-data";
import {
  classifyContent,
  hasClassificationConflict,
} from "@/features/sentinel/classification/classify-content";
import { evaluateRouting } from "@/features/sentinel/routing/evaluate-routing";
import { POLICY_VERSION } from "@/features/sentinel/routing/policy-config";
import { dispatchIncident } from "@/features/sentinel/workers/dispatch-incident";
import type {
  AirGapDeploymentResult,
  AuditEntry,
  DeploymentPipelineStep,
  Environment,
  Incident,
  IncidentSubmission,
  ModelArtifact,
  WorkerExecutionMetadata,
  WorkloadResult,
} from "@/features/sentinel/types";

/**
 * Synthetic demo artifact. The SHA256 below is illustrative, not a hash of
 * any real build output — it exists to show "one signed artifact, deployed
 * consistently everywhere" in the deployment management view.
 */
const MODEL_NAME = "SentinelAI";
const MODEL_LATEST_VERSION = "2.4.1";
const MODEL_SHA256 =
  // Synthetic, SHA-256-shaped demo value. No real artifact is verified yet.
  "91a7f3c2b8e4d16a5f0c9b3e7d2a1f4c6b8e0d3a5f7c9b1e3d5a7f9c1b3e20bf";

const AIR_GAP_PIPELINE_STEPS = [
  "Signed artifact staged",
  "Security verification",
  "Manual transfer",
  "Air-gap import",
  "Checksum verification",
  "Deployment",
] as const;

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
  modelArtifact: ModelArtifact;
  sequence: number;
}

const BASELINE_DEPLOYED_AT = "2026-09-01T00:00:00.000Z";

function createInitialState(): SentinelStoreState {
  return {
    environments: mockEnvironments.map((environment) => ({
      ...environment,
      supportedIncidentTypes: [...environment.supportedIncidentTypes],
    })),
    workloads: [],
    auditEntries: [],
    modelArtifact: {
      name: MODEL_NAME,
      latestVersion: MODEL_LATEST_VERSION,
      sha256: MODEL_SHA256,
      deployments: [
        {
          environmentId: "CLOUD",
          version: MODEL_LATEST_VERSION,
          status: "ACTIVE",
          deployedAt: BASELINE_DEPLOYED_AT,
        },
        {
          environmentId: "ON_PREM",
          version: MODEL_LATEST_VERSION,
          status: "ACTIVE",
          deployedAt: BASELINE_DEPLOYED_AT,
        },
        {
          environmentId: "AIR_GAPPED",
          // Air-gapped enclaves lag behind cloud/on-prem until an operator
          // manually carries a verified artifact across the boundary.
          version: "2.3.8",
          status: "UPDATE_PENDING",
          deployedAt: BASELINE_DEPLOYED_AT,
        },
      ],
    },
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

export function getModelArtifact(): ModelArtifact {
  return getState().modelArtifact;
}

export function resetStore(): void {
  globalForSentinel.__sentinelStore__ = createInitialState();
}

/**
 * Simulates carrying the signed model artifact across the air-gap boundary:
 * verify the signature, transfer, import, verify the checksum, then deploy.
 * Returns the full pipeline trail alongside the updated artifact so the UI
 * can show each step, matching the deployment flow in the project README.
 */
export function deployModelToAirGap(): AirGapDeploymentResult {
  const state = getState();
  const airGapDeployment = state.modelArtifact.deployments.find(
    (deployment) => deployment.environmentId === "AIR_GAPPED",
  );

  if (!airGapDeployment) {
    throw new Error("Air-gapped deployment record was not present.");
  }

  const now = new Date();
  const steps: DeploymentPipelineStep[] = AIR_GAP_PIPELINE_STEPS.map(
    (name, index) => ({
      name,
      // Offset each step by a second so the trail reads as a real sequence.
      completedAt: new Date(now.getTime() + index * 1000).toISOString(),
    }),
  );

  airGapDeployment.version = state.modelArtifact.latestVersion;
  airGapDeployment.status = "ACTIVE";
  airGapDeployment.deployedAt = steps[steps.length - 1].completedAt;

  return { artifact: state.modelArtifact, steps };
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

function allocateCapacity(environment: Environment, units: number): void {
  const nextUsedCapacity = environment.usedCapacity + units;

  if (nextUsedCapacity > environment.capacity) {
    throw new Error(
      `${environment.displayName} cannot allocate ${units} capacity units.`,
    );
  }

  environment.usedCapacity = Math.min(environment.capacity, nextUsedCapacity);
}

function releaseCapacity(environment: Environment, units: number): void {
  environment.usedCapacity = Math.max(0, environment.usedCapacity - units);
}

/**
 * Processes one incident submission end to end: classify, check for a
 * declared-vs-detected classification conflict (quarantining if found),
 * evaluate routing against live environment capacity, run a routed job through
 * its deterministic lifecycle on the selected environment worker, release its
 * capacity on completion, and retain the result. Every outcome is recorded to
 * the audit trail.
 */
export async function submitIncident(
  submission: IncidentSubmission,
): Promise<WorkloadResult> {
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
      executionStatus: null,
      workerExecution: null,
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

    let executionStatus: WorkloadResult["executionStatus"] = null;
    let workerExecution: WorkerExecutionMetadata | null = null;
    let analysis: WorkloadResult["analysis"] = null;

    if (decision.status === "ROUTED" && decision.selectedEnvironment) {
      const environment = state.environments.find(
        (candidate) => candidate.id === decision.selectedEnvironment,
      );

      if (!environment) {
        throw new Error("Selected environment was not present in the store.");
      }

      allocateCapacity(environment, incident.estimatedWorkload);
      executionStatus = "QUEUED";
      executionStatus = "RUNNING";

      try {
        const workerResult = await dispatchIncident(
          incident,
          decision.selectedEnvironment,
        );

        analysis = workerResult.analysis;
        workerExecution = {
          environmentId: workerResult.environmentId,
          startedAt: workerResult.startedAt,
          completedAt: workerResult.completedAt,
          executionMode: workerResult.executionMode,
          workerName: workerResult.workerName,
        };
      } finally {
        releaseCapacity(environment, incident.estimatedWorkload);
      }

      executionStatus = "COMPLETED";
    }

    result = {
      incident,
      classification,
      outcome: decision.status,
      executionStatus,
      workerExecution,
      decision,
      analysis,
    };
  }

  state.workloads = [result, ...state.workloads];
  state.auditEntries = [toAuditEntry(result), ...state.auditEntries];

  return result;
}
