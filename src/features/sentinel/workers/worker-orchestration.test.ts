import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  mockExpectedRoutingOutcomes,
  mockIncidents,
} from "@/data/mock-sentinel-data";
import {
  getEnvironments,
  resetStore,
  submitIncident,
} from "@/features/sentinel/server/sentinel-store";
import type {
  EnvironmentId,
  Incident,
  IncidentSubmission,
} from "@/features/sentinel/types";
import { airGapWorker } from "@/features/sentinel/workers/airgap-worker";
import { cloudWorker } from "@/features/sentinel/workers/cloud-worker";
import { dispatchIncident } from "@/features/sentinel/workers/dispatch-incident";
import { onPremWorker } from "@/features/sentinel/workers/onprem-worker";

function getDemoIncident(id: string): Incident {
  const incident = mockIncidents.find((candidate) => candidate.id === id);

  if (!incident) {
    throw new Error(`Missing demo incident: ${id}`);
  }

  return incident;
}

function toSubmission(incident: Incident): IncidentSubmission {
  return {
    title: incident.title,
    description: incident.description,
    incidentType: incident.incidentType,
    classification: incident.classification,
    severity: incident.severity,
    requiredNetworkMode: incident.requiredNetworkMode,
    estimatedWorkload: incident.estimatedWorkload,
    sampleContent: incident.sampleContent,
  };
}

function spyOnWorkers() {
  return {
    CLOUD: vi.spyOn(cloudWorker, "execute"),
    ON_PREM: vi.spyOn(onPremWorker, "execute"),
    AIR_GAPPED: vi.spyOn(airGapWorker, "execute"),
  };
}

describe("worker orchestration", () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([
    ["INC-DEMO-001", "CLOUD", "Sentinel Cloud Worker"],
    ["INC-DEMO-002", "ON_PREM", "Sentinel On-Prem Worker"],
    ["INC-DEMO-003", "AIR_GAPPED", "Sentinel Air-Gap Worker"],
  ] as const)(
    "%s executes only the %s worker",
    async (incidentId, expectedEnvironment, expectedWorkerName) => {
      const workerSpies = spyOnWorkers();
      const result = await submitIncident(
        toSubmission(getDemoIncident(incidentId)),
      );

      expect(result.outcome).toBe("ROUTED");
      expect(result.executionStatus).toBe("COMPLETED");
      expect(result.workerExecution).toMatchObject({
        environmentId: expectedEnvironment,
        workerName: expectedWorkerName,
      });
      expect(workerSpies[expectedEnvironment]).toHaveBeenCalledOnce();

      for (const environmentId of Object.keys(workerSpies) as EnvironmentId[]) {
        if (environmentId !== expectedEnvironment) {
          expect(workerSpies[environmentId]).not.toHaveBeenCalled();
        }
      }
    },
  );

  it("does not dispatch a blocked workload", async () => {
    const workerSpies = spyOnWorkers();
    const result = await submitIncident(
      toSubmission(getDemoIncident("INC-DEMO-004")),
    );

    expect(result.outcome).toBe("BLOCKED");
    expect(result.executionStatus).toBeNull();
    expect(result.workerExecution).toBeNull();
    expect(Object.values(workerSpies).every((spy) => spy.mock.calls.length === 0)).toBe(
      true,
    );
  });

  it("does not dispatch a quarantined workload", async () => {
    const workerSpies = spyOnWorkers();
    const capacityBefore = getEnvironments().map(
      ({ id, usedCapacity }) => ({ id, usedCapacity }),
    );
    const result = await submitIncident(
      toSubmission(getDemoIncident("INC-DEMO-005")),
    );
    const capacityAfter = getEnvironments().map(
      ({ id, usedCapacity }) => ({ id, usedCapacity }),
    );

    expect(result.outcome).toBe("QUARANTINED");
    expect(mockExpectedRoutingOutcomes["INC-DEMO-005"]).toBe("QUARANTINED");
    expect(result.classification.detectedClassification).toBe("CLASSIFIED");
    expect(result.executionStatus).toBeNull();
    expect(result.workerExecution).toBeNull();
    expect(result.decision).toBeNull();
    expect(capacityAfter).toEqual(capacityBefore);
    expect(Object.values(workerSpies).every((spy) => spy.mock.calls.length === 0)).toBe(
      true,
    );
  });

  it("returns deterministic worker execution metadata", async () => {
    const result = await submitIncident(
      toSubmission(getDemoIncident("INC-DEMO-001")),
    );

    expect(result.workerExecution).toEqual({
      environmentId: "CLOUD",
      workerName: "Sentinel Cloud Worker",
      executionMode: "EXTERNAL_CAPABLE",
      startedAt: result.incident.submittedAt,
      completedAt: new Date(
        new Date(result.incident.submittedAt).getTime() + 1,
      ).toISOString(),
    });
    expect(result.analysis?.timeline.length).toBeGreaterThan(0);
  });

  it("releases capacity after successful worker execution", async () => {
    const before = getEnvironments().find(
      (environment) => environment.id === "ON_PREM",
    )?.usedCapacity;

    await submitIncident(toSubmission(getDemoIncident("INC-DEMO-002")));

    const after = getEnvironments().find(
      (environment) => environment.id === "ON_PREM",
    )?.usedCapacity;

    expect(after).toBe(before);
  });

  it("releases capacity when worker execution throws", async () => {
    const before = getEnvironments().find(
      (environment) => environment.id === "ON_PREM",
    )?.usedCapacity;
    vi.spyOn(onPremWorker, "execute").mockRejectedValueOnce(
      new Error("Synthetic worker failure"),
    );

    const result = await submitIncident(
      toSubmission(getDemoIncident("INC-DEMO-002")),
    );

    const after = getEnvironments().find(
      (environment) => environment.id === "ON_PREM",
    )?.usedCapacity;
    expect(result.executionStatus).toBe("FAILED");
    expect(result.workerExecution).toBeNull();
    expect(result.executionFailure).toMatchObject({
      environmentId: "ON_PREM",
      workerName: "Sentinel On-Prem Worker",
      reason: "Sentinel On-Prem Worker: Synthetic worker failure",
    });
    expect(after).toBe(before);
  });

  it("fails safely for an invalid worker lookup", async () => {
    await expect(
      dispatchIncident(
        getDemoIncident("INC-DEMO-001"),
        "UNKNOWN" as EnvironmentId,
      ),
    ).rejects.toThrow(
      "No execution worker is registered for environment: UNKNOWN.",
    );
  });

  it("keeps air-gap execution offline", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await dispatchIncident(
      getDemoIncident("INC-DEMO-003"),
      "AIR_GAPPED",
    );

    expect(result.executionMode).toBe("OFFLINE");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
