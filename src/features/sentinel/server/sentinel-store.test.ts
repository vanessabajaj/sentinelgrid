import { beforeEach, describe, expect, it } from "vitest";

import {
  deployModelToAirGap,
  getEnvironments,
  getModelArtifact,
  listAuditEntries,
  listWorkloads,
  resetStore,
  submitIncident,
} from "@/features/sentinel/server/sentinel-store";
import type { IncidentSubmission } from "@/features/sentinel/types";

function buildSubmission(
  overrides: Partial<IncidentSubmission> = {},
): IncidentSubmission {
  return {
    title: "Synthetic incident",
    description: "Synthetic description for a demo workload.",
    incidentType: "FIREWALL_LOG",
    classification: "PUBLIC",
    severity: "MEDIUM",
    requiredNetworkMode: "NONE",
    estimatedWorkload: 10,
    sampleContent: "SYNTHETIC: src=198.51.100.4 dst=198.51.100.9 port=443",
    ...overrides,
  };
}

describe("sentinel-store", () => {
  beforeEach(() => {
    resetStore();
  });

  it("routes a low-sensitivity submission and records an audit entry", () => {
    const result = submitIncident(buildSubmission());

    expect(result.outcome).toBe("ROUTED");
    expect(result.decision?.selectedEnvironment).not.toBeNull();
    expect(result.analysis).not.toBeNull();

    const auditEntries = listAuditEntries();
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]).toMatchObject({
      incidentTitle: "Synthetic incident",
      outcome: "ROUTED",
    });

    expect(listWorkloads()).toHaveLength(1);
  });

  it("allocates capacity on the selected environment", () => {
    const before = getEnvironments().find(
      (environment) => environment.id === "ON_PREM",
    );
    const beforeUsed = before?.usedCapacity ?? 0;

    submitIncident(
      buildSubmission({
        incidentType: "AUTHENTICATION_LOG",
        classification: "CONFIDENTIAL",
        requiredNetworkMode: "CONTROLLED",
        estimatedWorkload: 15,
        sampleContent: "SYNTHETIC: user=demo.analyst attempts=5 source=203.0.113.5",
      }),
    );

    const after = getEnvironments().find(
      (environment) => environment.id === "ON_PREM",
    );

    expect(after?.usedCapacity).toBe(beforeUsed + 15);
  });

  it("quarantines a submission whose declared classification undersells detected content", () => {
    const result = submitIncident(
      buildSubmission({
        title: "Mislabeled telemetry",
        classification: "PUBLIC",
        sampleContent: "SYNTHETIC: SECRET network telemetry node=10.20.4.23 status=active",
      }),
    );

    expect(result.outcome).toBe("QUARANTINED");
    expect(result.decision).toBeNull();
    expect(result.analysis).toBeNull();
    expect(result.classification.detectedClassification).toBe("SECRET");

    expect(listAuditEntries()[0].outcome).toBe("QUARANTINED");
  });

  it("blocks a secret workload that requires external network access", () => {
    const result = submitIncident(
      buildSubmission({
        classification: "SECRET",
        incidentType: "THREAT_INTELLIGENCE",
        sampleContent:
          "SYNTHETIC: SECRET indicator requires VirusTotal lookup for confirmation.",
      }),
    );

    expect(result.outcome).toBe("BLOCKED");
    expect(result.decision?.selectedEnvironment).toBeNull();
    expect(result.analysis).toBeNull();
  });

  it("starts with the air-gapped environment behind the latest model version", () => {
    const artifact = getModelArtifact();
    const airGap = artifact.deployments.find(
      (deployment) => deployment.environmentId === "AIR_GAPPED",
    );
    const cloud = artifact.deployments.find(
      (deployment) => deployment.environmentId === "CLOUD",
    );

    expect(airGap?.status).toBe("UPDATE_PENDING");
    expect(airGap?.version).not.toBe(artifact.latestVersion);
    expect(cloud?.status).toBe("ACTIVE");
    expect(cloud?.version).toBe(artifact.latestVersion);
  });

  it("deploys the latest artifact to the air-gapped environment through the transfer pipeline", () => {
    const result = deployModelToAirGap();
    const airGap = result.artifact.deployments.find(
      (deployment) => deployment.environmentId === "AIR_GAPPED",
    );

    expect(airGap?.status).toBe("ACTIVE");
    expect(airGap?.version).toBe(result.artifact.latestVersion);
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.steps.map((step) => step.name)).toContain(
      "Checksum verification",
    );
  });

  it("resets to a clean baseline", () => {
    submitIncident(buildSubmission());
    expect(listWorkloads()).toHaveLength(1);

    resetStore();

    expect(listWorkloads()).toHaveLength(0);
    expect(listAuditEntries()).toHaveLength(0);
  });
});
