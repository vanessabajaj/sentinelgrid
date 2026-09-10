import { mockEnvironments } from "@/data/mock-sentinel-data";
import {
  getArtifactManifest,
  readArtifactBytes,
  verifyImportedArtifact,
} from "@/features/sentinel/artifacts/artifact-service";
import {
  classifyContent,
  hasClassificationConflict,
} from "@/features/sentinel/classification/classify-content";
import { evaluateRouting } from "@/features/sentinel/routing/evaluate-routing";
import { POLICY_VERSION } from "@/features/sentinel/routing/policy-config";
import { dispatchIncident } from "@/features/sentinel/workers/dispatch-incident";
import {
  checkWorkerHealth,
  WorkerDispatchError,
} from "@/features/sentinel/workers/http-worker-client";
import {
  getWorkerDescriptor,
  getWorkerDispatchMode,
} from "@/features/sentinel/workers/worker-config";
import type {
  AirGapDeploymentResult,
  AuditEntry,
  DeploymentPipelineStep,
  Environment,
  Incident,
  IncidentSubmission,
  ModelArtifact,
  WorkerExecutionMetadata,
  WorkerExecutionFailure,
  WorkloadResult,
} from "@/features/sentinel/types";

const AIR_GAP_PIPELINE_STEPS = [
  "Artifact Prepared",
  "SHA-256 Computed",
  "Transfer Package Prepared",
  "Air-Gap Import",
  "SHA-256 Recomputed",
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
  const manifest = getArtifactManifest();

  return {
    environments: mockEnvironments.map((environment) => ({
      ...environment,
      supportedIncidentTypes: [...environment.supportedIncidentTypes],
    })),
    workloads: [],
    auditEntries: [],
    modelArtifact: {
      name: manifest.metadata.modelName,
      latestVersion: manifest.metadata.version,
      sha256: manifest.sha256,
      sizeBytes: manifest.sizeBytes,
      verified: manifest.verified,
      metadata: manifest.metadata,
      deployments: [
        {
          environmentId: "CLOUD",
          version: manifest.metadata.version,
          status: "ACTIVE",
          deployedAt: BASELINE_DEPLOYED_AT,
          artifactSha256: manifest.sha256,
          artifactSizeBytes: manifest.sizeBytes,
          verificationStatus: "VERIFIED",
        },
        {
          environmentId: "ON_PREM",
          version: manifest.metadata.version,
          status: "ACTIVE",
          deployedAt: BASELINE_DEPLOYED_AT,
          artifactSha256: manifest.sha256,
          artifactSizeBytes: manifest.sizeBytes,
          verificationStatus: "VERIFIED",
        },
        {
          environmentId: "AIR_GAPPED",
          // Air-gapped enclaves lag behind cloud/on-prem until an operator
          // manually carries a verified artifact across the boundary.
          version: "0.9.4",
          status: "UPDATE_PENDING",
          deployedAt: BASELINE_DEPLOYED_AT,
          artifactSha256: null,
          artifactSizeBytes: null,
          verificationStatus: "PENDING",
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
  if (
    !globalForSentinel.__sentinelStore__ ||
    !("metadata" in globalForSentinel.__sentinelStore__.modelArtifact)
  ) {
    globalForSentinel.__sentinelStore__ = createInitialState();
  }

  return globalForSentinel.__sentinelStore__;
}

export function getEnvironments(): Environment[] {
  return getState().environments;
}

/** Refreshes informational worker health without changing routing availability. */
export async function refreshWorkerHealth(): Promise<void> {
  const environments = getState().environments;
  let mode: ReturnType<typeof getWorkerDispatchMode>;

  try {
    mode = getWorkerDispatchMode();
  } catch {
    for (const environment of environments) {
      environment.workerStatus = "UNKNOWN";
    }
    return;
  }

  if (mode === "local") {
    for (const environment of environments) {
      environment.workerStatus = "ONLINE";
    }
    return;
  }

  const statuses = await Promise.all(
    environments.map(async (environment) => ({
      environmentId: environment.id,
      status: await checkWorkerHealth(environment.id),
    })),
  );

  for (const { environmentId, status } of statuses) {
    const environment = environments.find(
      (candidate) => candidate.id === environmentId,
    );
    if (environment) {
      environment.workerStatus = status;
    }
  }
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
 * Simulates carrying the prepared artifact bytes across the air-gap boundary.
 * Source and imported SHA-256 values are independently computed and the new
 * version is activated only when they match.
 */
export function deployModelToAirGap(
  importedArtifactBytes?: Uint8Array,
): AirGapDeploymentResult {
  const state = getState();
  const airGapDeployment = state.modelArtifact.deployments.find(
    (deployment) => deployment.environmentId === "AIR_GAPPED",
  );

  if (!airGapDeployment) {
    throw new Error("Air-gapped deployment record was not present.");
  }

  const importedBytes = importedArtifactBytes ?? Buffer.from(readArtifactBytes());
  const verification = verifyImportedArtifact(importedBytes);
  const now = new Date();
  const steps: DeploymentPipelineStep[] = AIR_GAP_PIPELINE_STEPS.map(
    (name, index) => ({
      name,
      completedAt: new Date(now.getTime() + index * 1000).toISOString(),
      status: "COMPLETED",
    }),
  );

  steps.push({
    name: "Checksum Match",
    completedAt: new Date(now.getTime() + steps.length * 1000).toISOString(),
    status: verification.verified ? "COMPLETED" : "FAILED",
  });

  if (!verification.verified) {
    airGapDeployment.status = "UPDATE_PENDING";
    airGapDeployment.verificationStatus = "FAILED";

    return {
      artifact: state.modelArtifact,
      steps,
      verificationPassed: false,
      sourceSha256: verification.sourceManifest.sha256,
      importedSha256: verification.importedSha256,
      failureReason:
        "Imported artifact checksum does not match the prepared source artifact.",
    };
  }

  steps.push({
    name: "Deployment Verified",
    completedAt: new Date(now.getTime() + steps.length * 1000).toISOString(),
    status: "COMPLETED",
  });

  airGapDeployment.version = verification.sourceManifest.metadata.version;
  airGapDeployment.status = "ACTIVE";
  airGapDeployment.deployedAt = steps[steps.length - 1].completedAt;
  airGapDeployment.artifactSha256 = verification.sourceManifest.sha256;
  airGapDeployment.artifactSizeBytes = verification.sourceManifest.sizeBytes;
  airGapDeployment.verificationStatus = "VERIFIED";

  return {
    artifact: state.modelArtifact,
    steps,
    verificationPassed: true,
    sourceSha256: verification.sourceManifest.sha256,
    importedSha256: verification.importedSha256,
    failureReason: null,
  };
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
      executionFailure: null,
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
    let executionFailure: WorkerExecutionFailure | null = null;
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
        environment.workerStatus = "ONLINE";
        executionStatus = "COMPLETED";
      } catch (error) {
        const descriptor = getWorkerDescriptor(decision.selectedEnvironment);
        const reason =
          error instanceof Error
            ? error.message
            : `${descriptor.workerName} execution failed.`;

        executionStatus = "FAILED";
        executionFailure = {
          environmentId: decision.selectedEnvironment,
          workerName: descriptor.workerName,
          reason: reason.startsWith(descriptor.workerName)
            ? reason
            : `${descriptor.workerName}: ${reason}`,
          failedAt: new Date().toISOString(),
        };
        environment.workerStatus =
          error instanceof WorkerDispatchError
            ? error.workerStatus
            : "UNKNOWN";
      } finally {
        releaseCapacity(environment, incident.estimatedWorkload);
      }
    }

    result = {
      incident,
      classification,
      outcome: decision.status,
      executionStatus,
      workerExecution,
      executionFailure,
      decision,
      analysis,
    };
  }

  state.workloads = [result, ...state.workloads];
  state.auditEntries = [toAuditEntry(result), ...state.auditEntries];

  return result;
}
