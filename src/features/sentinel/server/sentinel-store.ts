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
import { createPersistence } from "@/features/sentinel/persistence/sentinel-persistence";
import type { SentinelPersistence } from "@/features/sentinel/persistence/sentinel-persistence";
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
  EnvironmentId,
  Incident,
  IncidentSubmission,
  ModelArtifact,
  ModelDeployment,
  WorkerExecutionFailure,
  WorkerExecutionMetadata,
  WorkerHealthStatus,
  WorkloadResult,
} from "@/features/sentinel/types";

const AIR_GAP_PIPELINE_STEPS = [
  "Artifact Prepared",
  "SHA-256 Computed",
  "Transfer Package Prepared",
  "Air-Gap Import",
  "SHA-256 Recomputed",
] as const;

const BASELINE_DEPLOYED_AT = "2026-09-01T00:00:00.000Z";

function cloneBaselineEnvironments(): Environment[] {
  return mockEnvironments.map((environment) => ({
    ...environment,
    supportedIncidentTypes: [...environment.supportedIncidentTypes],
  }));
}

function createBaselineDeployments(): ModelDeployment[] {
  const manifest = getArtifactManifest();

  return [
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
      version: "0.9.4",
      status: "UPDATE_PENDING",
      deployedAt: BASELINE_DEPLOYED_AT,
      artifactSha256: null,
      artifactSizeBytes: null,
      verificationStatus: "PENDING",
    },
  ];
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

/** SQLite-backed orchestration service. Worker health remains runtime-only. */
export class SentinelStore {
  private readonly workerHealth = new Map<
    EnvironmentId,
    WorkerHealthStatus
  >();

  constructor(private readonly persistence: SentinelPersistence) {
    this.recoverInterruptedExecutions();
  }

  getEnvironments(): Environment[] {
    return this.persistence.environments.list().map((environment) => ({
      ...environment,
      workerStatus: this.workerHealth.get(environment.id) ?? "UNKNOWN",
    }));
  }

  async refreshWorkerHealth(): Promise<void> {
    const environments = this.persistence.environments.list();
    let mode: ReturnType<typeof getWorkerDispatchMode>;

    try {
      mode = getWorkerDispatchMode();
    } catch {
      for (const environment of environments) {
        this.workerHealth.set(environment.id, "UNKNOWN");
      }
      return;
    }

    if (mode === "local") {
      for (const environment of environments) {
        this.workerHealth.set(environment.id, "ONLINE");
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
      this.workerHealth.set(environmentId, status);
    }
  }

  listWorkloads(): WorkloadResult[] {
    return this.persistence.workloads.list();
  }

  listAuditEntries(): AuditEntry[] {
    return this.persistence.audits.list();
  }

  getModelArtifact(): ModelArtifact {
    const manifest = getArtifactManifest();

    return {
      name: manifest.metadata.modelName,
      latestVersion: manifest.metadata.version,
      sha256: manifest.sha256,
      sizeBytes: manifest.sizeBytes,
      verified: manifest.verified,
      metadata: manifest.metadata,
      deployments: this.persistence.deployments.list(),
    };
  }

  reset(): void {
    this.persistence.reset();
    this.workerHealth.clear();
  }

  close(): void {
    this.persistence.close();
  }

  deployModelToAirGap(
    importedArtifactBytes?: Uint8Array,
  ): AirGapDeploymentResult {
    const artifact = this.getModelArtifact();
    const airGapDeployment = artifact.deployments.find(
      (deployment) => deployment.environmentId === "AIR_GAPPED",
    );

    if (!airGapDeployment) {
      throw new Error("Air-gapped deployment record was not present.");
    }

    const importedBytes =
      importedArtifactBytes ?? Buffer.from(readArtifactBytes());
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
      const failedDeployment: ModelDeployment = {
        ...airGapDeployment,
        status: "UPDATE_PENDING",
        verificationStatus: "FAILED",
      };
      this.persistence.deployments.save(failedDeployment);

      return {
        artifact: replaceDeployment(artifact, failedDeployment),
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

    const verifiedDeployment: ModelDeployment = {
      ...airGapDeployment,
      version: verification.sourceManifest.metadata.version,
      status: "ACTIVE",
      deployedAt: steps[steps.length - 1].completedAt,
      artifactSha256: verification.sourceManifest.sha256,
      artifactSizeBytes: verification.sourceManifest.sizeBytes,
      verificationStatus: "VERIFIED",
    };
    this.persistence.deployments.save(verifiedDeployment);

    return {
      artifact: replaceDeployment(artifact, verifiedDeployment),
      steps,
      verificationPassed: true,
      sourceSha256: verification.sourceManifest.sha256,
      importedSha256: verification.importedSha256,
      failureReason: null,
    };
  }

  async submitIncident(
    submission: IncidentSubmission,
  ): Promise<WorkloadResult> {
    const sequence = this.persistence.nextIncidentSequence();
    const incident: Incident = {
      ...submission,
      id: nextIncidentId(sequence),
      submittedAt: new Date().toISOString(),
    };

    const classification = classifyContent(
      `${incident.title} ${incident.description} ${incident.sampleContent}`,
    );
    const conflict = hasClassificationConflict(
      incident.classification,
      classification.detectedClassification,
    );

    if (conflict) {
      const quarantined: WorkloadResult = {
        incident,
        classification,
        outcome: "QUARANTINED",
        executionStatus: null,
        workerExecution: null,
        executionFailure: null,
        decision: null,
        analysis: null,
      };
      this.persistence.persistResultAndAudit(
        quarantined,
        toAuditEntry(quarantined),
      );
      return quarantined;
    }

    const effectiveIncident: Incident = classification.requiresExternalNetwork
      ? { ...incident, requiredNetworkMode: "EXTERNAL" }
      : incident;
    const decision = evaluateRouting(
      effectiveIncident,
      this.persistence.environments.list(),
    );

    if (decision.status === "BLOCKED" || !decision.selectedEnvironment) {
      const blocked: WorkloadResult = {
        incident,
        classification,
        outcome: "BLOCKED",
        executionStatus: null,
        workerExecution: null,
        executionFailure: null,
        decision,
        analysis: null,
      };
      this.persistence.persistResultAndAudit(blocked, toAuditEntry(blocked));
      return blocked;
    }

    const selectedEnvironment = decision.selectedEnvironment;
    const selected = this.persistence.environments
      .list()
      .find((environment) => environment.id === selectedEnvironment);
    if (!selected) {
      throw new Error("Selected environment was not present in the store.");
    }

    let result: WorkloadResult = {
      incident,
      classification,
      outcome: "ROUTED",
      executionStatus: "QUEUED",
      workerExecution: null,
      executionFailure: null,
      decision,
      analysis: null,
    };

    this.persistence.database.transaction(() => {
      this.persistence.environments.allocate(
        selectedEnvironment,
        incident.estimatedWorkload,
      );
      this.persistence.workloads.save(result);
    })();

    result = { ...result, executionStatus: "RUNNING" };
    this.persistence.workloads.save(result);

    try {
      const workerResult = await dispatchIncident(
        incident,
        selectedEnvironment,
      );
      const workerExecution: WorkerExecutionMetadata = {
        environmentId: workerResult.environmentId,
        startedAt: workerResult.startedAt,
        completedAt: workerResult.completedAt,
        executionMode: workerResult.executionMode,
        workerName: workerResult.workerName,
      };

      result = {
        ...result,
        executionStatus: "COMPLETED",
        workerExecution,
        analysis: workerResult.analysis,
      };
      this.workerHealth.set(selectedEnvironment, "ONLINE");
    } catch (error) {
      const descriptor = getWorkerDescriptor(selectedEnvironment);
      const reason =
        error instanceof Error
          ? error.message
          : `${descriptor.workerName} execution failed.`;
      const executionFailure: WorkerExecutionFailure = {
        environmentId: selectedEnvironment,
        workerName: descriptor.workerName,
        reason: reason.startsWith(descriptor.workerName)
          ? reason
          : `${descriptor.workerName}: ${reason}`,
        failedAt: new Date().toISOString(),
      };

      result = {
        ...result,
        executionStatus: "FAILED",
        executionFailure,
      };
      this.workerHealth.set(
        selectedEnvironment,
        error instanceof WorkerDispatchError ? error.workerStatus : "UNKNOWN",
      );
    } finally {
      const finalResult = result;
      this.persistence.database.transaction(() => {
        this.persistence.environments.release(
          selectedEnvironment,
          incident.estimatedWorkload,
        );
        this.persistence.workloads.save(finalResult);
        this.persistence.audits.save(finalResult, toAuditEntry(finalResult));
      })();
    }

    return result;
  }

  private recoverInterruptedExecutions(): void {
    const interrupted = this.persistence.workloads
      .list()
      .filter(
        (workload) =>
          workload.executionStatus === "QUEUED" ||
          workload.executionStatus === "RUNNING",
      );

    for (const workload of interrupted) {
      const selectedEnvironment = workload.decision?.selectedEnvironment;
      if (!selectedEnvironment) {
        continue;
      }
      const descriptor = getWorkerDescriptor(selectedEnvironment);
      const recovered: WorkloadResult = {
        ...workload,
        executionStatus: "FAILED",
        executionFailure: {
          environmentId: selectedEnvironment,
          workerName: descriptor.workerName,
          reason: `${descriptor.workerName}: control plane restarted before execution completed.`,
          failedAt: new Date().toISOString(),
        },
      };
      this.persistence.persistResultAndAudit(recovered, toAuditEntry(recovered));
    }
  }
}

function replaceDeployment(
  artifact: ModelArtifact,
  updated: ModelDeployment,
): ModelArtifact {
  return {
    ...artifact,
    deployments: artifact.deployments.map((deployment) =>
      deployment.environmentId === updated.environmentId
        ? updated
        : deployment,
    ),
  };
}

export function createSentinelStore(databasePath?: string): SentinelStore {
  return new SentinelStore(
    createPersistence(
      cloneBaselineEnvironments(),
      createBaselineDeployments(),
      databasePath,
    ),
  );
}

const globalForSentinel = globalThis as unknown as {
  __sentinelStoreService__?: SentinelStore;
};

function getDefaultStore(): SentinelStore {
  if (!globalForSentinel.__sentinelStoreService__) {
    globalForSentinel.__sentinelStoreService__ = createSentinelStore();
  }
  return globalForSentinel.__sentinelStoreService__;
}

export function getEnvironments(): Environment[] {
  return getDefaultStore().getEnvironments();
}

export async function refreshWorkerHealth(): Promise<void> {
  return getDefaultStore().refreshWorkerHealth();
}

export function listWorkloads(): WorkloadResult[] {
  return getDefaultStore().listWorkloads();
}

export function listAuditEntries(): AuditEntry[] {
  return getDefaultStore().listAuditEntries();
}

export function getModelArtifact(): ModelArtifact {
  return getDefaultStore().getModelArtifact();
}

export function resetStore(): void {
  getDefaultStore().reset();
}

export function deployModelToAirGap(
  importedArtifactBytes?: Uint8Array,
): AirGapDeploymentResult {
  return getDefaultStore().deployModelToAirGap(importedArtifactBytes);
}

export async function submitIncident(
  submission: IncidentSubmission,
): Promise<WorkloadResult> {
  return getDefaultStore().submitIncident(submission);
}
