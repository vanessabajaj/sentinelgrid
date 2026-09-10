import { beforeEach, describe, expect, it } from "vitest";

import { GET as getAudit } from "@/app/api/audit/route";
import { POST as deployToAirGap } from "@/app/api/deployment/air-gap/route";
import { GET as getDeployment } from "@/app/api/deployment/route";
import { GET as getEnvironments } from "@/app/api/environments/route";
import {
  GET as getIncidents,
  POST as postIncident,
} from "@/app/api/incidents/route";
import { POST as reset } from "@/app/api/reset/route";
import { mockIncidents } from "@/data/mock-sentinel-data";
import {
  createEmptyIncidentFormState,
  selectDemoScenario,
} from "@/features/sentinel/components/incident-form-state";
import { resetStore } from "@/features/sentinel/server/sentinel-store";
import type {
  AirGapDeploymentResult,
  AuditEntry,
  Environment,
  IncidentSubmission,
  ModelArtifact,
  WorkloadResult,
} from "@/features/sentinel/types";

function buildSubmission(
  overrides: Partial<IncidentSubmission> = {},
): IncidentSubmission {
  return {
    title: "Public CVE route-handler test",
    description: "Review a synthetic public vulnerability advisory.",
    incidentType: "CVE_ANALYSIS",
    classification: "PUBLIC",
    severity: "HIGH",
    requiredNetworkMode: "EXTERNAL",
    estimatedWorkload: 12,
    sampleContent:
      "SYNTHETIC: package demo-server 4.2.0 for CVE-2026-1234.",
    ...overrides,
  };
}

function createIncidentRequest(submission: IncidentSubmission): Request {
  return new Request("http://localhost/api/incidents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submission),
  });
}

async function submit(
  submission: IncidentSubmission,
): Promise<{ response: Response; result: WorkloadResult }> {
  const response = await postIncident(createIncidentRequest(submission));
  const payload = (await response.json()) as { result: WorkloadResult };

  return { response, result: payload.result };
}

function loadDemoSubmission(id: string): IncidentSubmission {
  return selectDemoScenario(
    createEmptyIncidentFormState(),
    mockIncidents,
    id,
  ).submission;
}

describe("SentinelGrid Route Handlers", () => {
  beforeEach(() => {
    resetStore();
  });

  it("POST /api/incidents returns a completed routed incident", async () => {
    const { response, result } = await submit(buildSubmission());

    expect(response.status).toBe(201);
    expect(result.outcome).toBe("ROUTED");
    expect(result.executionStatus).toBe("COMPLETED");
    expect(result.decision?.selectedEnvironment).toBe("CLOUD");
    expect(result.workerExecution).toMatchObject({
      environmentId: "CLOUD",
      workerName: "Sentinel Cloud Worker",
      executionMode: "EXTERNAL_CAPABLE",
    });
    expect(result.analysis).not.toBeNull();
  });

  it("POST /api/incidents returns a blocked result", async () => {
    const { response, result } = await submit(
      buildSubmission({
        title: "Secret external lookup",
        incidentType: "THREAT_INTELLIGENCE",
        classification: "SECRET",
        requiredNetworkMode: "EXTERNAL",
        sampleContent:
          "SYNTHETIC: SECRET indicator requires a VirusTotal lookup.",
      }),
    );

    expect(response.status).toBe(201);
    expect(result.outcome).toBe("BLOCKED");
    expect(result.executionStatus).toBeNull();
    expect(result.decision?.selectedEnvironment).toBeNull();
    expect(result.analysis).toBeNull();
  });

  it("POST /api/incidents quarantines an under-classified submission", async () => {
    const { response, result } = await submit(
      buildSubmission({
        title: "Mislabeled telemetry",
        classification: "PUBLIC",
        requiredNetworkMode: "NONE",
        sampleContent:
          "SYNTHETIC: SECRET telemetry from internal node 10.20.4.23.",
      }),
    );

    expect(response.status).toBe(201);
    expect(result.outcome).toBe("QUARANTINED");
    expect(result.executionStatus).toBeNull();
    expect(result.classification.detectedClassification).toBe("SECRET");
    expect(result.decision).toBeNull();
  });

  it("submits Public CVE correctly after Classified Telemetry", async () => {
    const classified = await submit(loadDemoSubmission("INC-DEMO-003"));
    const publicCve = await submit(loadDemoSubmission("INC-DEMO-001"));

    expect(classified.result.decision?.selectedEnvironment).toBe(
      "AIR_GAPPED",
    );
    expect(publicCve.response.status).toBe(201);
    expect(publicCve.result.incident).toMatchObject({
      title: "Public CVE exposure research",
      incidentType: "CVE_ANALYSIS",
      classification: "PUBLIC",
      requiredNetworkMode: "EXTERNAL",
    });
    expect(publicCve.result).toMatchObject({
      outcome: "ROUTED",
      executionStatus: "COMPLETED",
      workerExecution: {
        environmentId: "CLOUD",
        workerName: "Sentinel Cloud Worker",
      },
    });
    expect(publicCve.result.decision?.selectedEnvironment).toBe("CLOUD");
  });

  it("submits Classified Telemetry correctly after Public CVE", async () => {
    const publicCve = await submit(loadDemoSubmission("INC-DEMO-001"));
    const classified = await submit(loadDemoSubmission("INC-DEMO-003"));

    expect(publicCve.result.decision?.selectedEnvironment).toBe("CLOUD");
    expect(classified.response.status).toBe(201);
    expect(classified.result.incident).toMatchObject({
      title: "Classified enclave telemetry review",
      incidentType: "CLASSIFIED_TELEMETRY",
      classification: "CLASSIFIED",
      requiredNetworkMode: "NONE",
    });
    expect(classified.result).toMatchObject({
      outcome: "ROUTED",
      executionStatus: "COMPLETED",
      workerExecution: {
        environmentId: "AIR_GAPPED",
        workerName: "Sentinel Air-Gap Worker",
      },
    });
    expect(classified.result.decision?.selectedEnvironment).toBe(
      "AIR_GAPPED",
    );
  });

  it("GET /api/environments returns current released capacity", async () => {
    const beforePayload = (await (await getEnvironments()).json()) as {
      environments: Environment[];
    };
    const cloudBefore = beforePayload.environments.find(
      (environment) => environment.id === "CLOUD",
    );

    await submit(buildSubmission());

    const response = await getEnvironments();
    const payload = (await response.json()) as {
      environments: Environment[];
    };
    const cloudAfter = payload.environments.find(
      (environment) => environment.id === "CLOUD",
    );

    expect(response.status).toBe(200);
    expect(payload.environments).toHaveLength(3);
    expect(
      payload.environments.every(
        (environment) => environment.workerStatus === "ONLINE",
      ),
    ).toBe(true);
    expect(cloudAfter?.usedCapacity).toBe(cloudBefore?.usedCapacity);
  });

  it("GET /api/audit returns records created by incident submissions", async () => {
    await submit(buildSubmission());

    const response = getAudit();
    const payload = (await response.json()) as { entries: AuditEntry[] };

    expect(response.status).toBe(200);
    expect(payload.entries).toHaveLength(1);
    expect(payload.entries[0]).toMatchObject({
      outcome: "ROUTED",
      selectedEnvironment: "CLOUD",
    });
  });

  it("POST /api/reset restores the initial server state", async () => {
    await submit(buildSubmission());
    const beforeReset = (await (await getIncidents()).json()) as {
      workloads: WorkloadResult[];
    };

    const response = reset();
    const payload = (await response.json()) as { status: string };
    const afterReset = (await (await getIncidents()).json()) as {
      workloads: WorkloadResult[];
    };
    const auditAfterReset = (await (await getAudit()).json()) as {
      entries: AuditEntry[];
    };

    expect(beforeReset.workloads).toHaveLength(1);
    expect(response.status).toBe(200);
    expect(payload.status).toBe("reset");
    expect(afterReset.workloads).toHaveLength(0);
    expect(auditAfterReset.entries).toHaveLength(0);
  });

  it("POST /api/deployment/air-gap completes the simulated pipeline", async () => {
    const beforePayload = (await (await getDeployment()).json()) as {
      artifact: ModelArtifact;
    };
    const beforeAirGap = beforePayload.artifact.deployments.find(
      (deployment) => deployment.environmentId === "AIR_GAPPED",
    );

    const response = deployToAirGap();
    const result = (await response.json()) as AirGapDeploymentResult;
    const afterAirGap = result.artifact.deployments.find(
      (deployment) => deployment.environmentId === "AIR_GAPPED",
    );

    expect(beforeAirGap?.status).toBe("UPDATE_PENDING");
    expect(response.status).toBe(200);
    expect(afterAirGap?.status).toBe("ACTIVE");
    expect(afterAirGap?.version).toBe(result.artifact.latestVersion);
    expect(afterAirGap?.artifactSha256).toBe(result.artifact.sha256);
    expect(afterAirGap?.verificationStatus).toBe("VERIFIED");
    expect(result.verificationPassed).toBe(true);
    expect(result.steps.map((step) => step.name)).toContain(
      "Checksum Match",
    );
  });
});
