import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockIncidents } from "@/data/mock-sentinel-data";
import {
  getEnvironments,
  listAuditEntries,
  listWorkloads,
  refreshWorkerHealth,
  resetStore,
  submitIncident,
} from "@/features/sentinel/server/sentinel-store";
import type {
  EnvironmentId,
  Incident,
  IncidentSubmission,
} from "@/features/sentinel/types";
import { dispatchIncident } from "@/features/sentinel/workers/dispatch-incident";
import { executeLocalWorker } from "@/features/sentinel/workers/execute-local-worker";
import { getWorkerDescriptor } from "@/features/sentinel/workers/worker-config";

const WORKER_URLS: Record<EnvironmentId, string> = {
  CLOUD: "http://cloud.test:4101",
  ON_PREM: "http://onprem.test:4102",
  AIR_GAPPED: "http://airgap.test:4103",
};

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

function configureHttpMode() {
  vi.stubEnv("SENTINEL_WORKER_MODE", "http");
  vi.stubEnv("CLOUD_WORKER_URL", WORKER_URLS.CLOUD);
  vi.stubEnv("ONPREM_WORKER_URL", WORKER_URLS.ON_PREM);
  vi.stubEnv("AIRGAP_WORKER_URL", WORKER_URLS.AIR_GAPPED);
}

function mockSuccessfulWorker() {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const environmentId = (Object.entries(WORKER_URLS).find(([, baseUrl]) =>
      url.startsWith(baseUrl),
    )?.[0] ?? "UNKNOWN") as EnvironmentId;
    const incident = JSON.parse(String(init?.body)) as Incident;
    const result = await executeLocalWorker(
      incident,
      getWorkerDescriptor(environmentId),
    );

    return Response.json(result);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("HTTP worker dispatch", () => {
  beforeEach(() => {
    resetStore();
    configureHttpMode();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each([
    ["INC-DEMO-001", "CLOUD", "Sentinel Cloud Worker"],
    ["INC-DEMO-002", "ON_PREM", "Sentinel On-Prem Worker"],
    ["INC-DEMO-003", "AIR_GAPPED", "Sentinel Air-Gap Worker"],
  ] as const)(
    "%s dispatches only to the %s HTTP endpoint",
    async (incidentId, environmentId, workerName) => {
      const fetchMock = mockSuccessfulWorker();
      const result = await submitIncident(
        toSubmission(getDemoIncident(incidentId)),
      );

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock.mock.calls[0][0]).toBe(
        `${WORKER_URLS[environmentId]}/execute`,
      );
      expect(result.executionStatus).toBe("COMPLETED");
      expect(result.workerExecution).toMatchObject({
        environmentId,
        workerName,
      });
      expect(result.executionFailure).toBeNull();
    },
  );

  it("does not make a worker HTTP call for a blocked incident", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitIncident(
      toSubmission(getDemoIncident("INC-DEMO-004")),
    );

    expect(result.outcome).toBe("BLOCKED");
    expect(result.executionStatus).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not make a worker HTTP call for a quarantined incident", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitIncident(
      toSubmission(getDemoIncident("INC-DEMO-005")),
    );

    expect(result.outcome).toBe("QUARANTINED");
    expect(result.executionStatus).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("records an unreachable worker failure, releases capacity, and does not reroute", async () => {
    const before = getEnvironments().find(
      (environment) => environment.id === "ON_PREM",
    )?.usedCapacity;
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("ECONNREFUSED"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitIncident(
      toSubmission(getDemoIncident("INC-DEMO-002")),
    );
    const after = getEnvironments().find(
      (environment) => environment.id === "ON_PREM",
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(`${WORKER_URLS.ON_PREM}/execute`);
    expect(result.decision?.selectedEnvironment).toBe("ON_PREM");
    expect(result.executionStatus).toBe("FAILED");
    expect(result.workerExecution).toBeNull();
    expect(result.executionFailure).toMatchObject({
      environmentId: "ON_PREM",
      workerName: "Sentinel On-Prem Worker",
      reason: "Sentinel On-Prem Worker: Worker service is unreachable.",
    });
    expect(after?.usedCapacity).toBe(before);
    expect(after?.workerStatus).toBe("OFFLINE");
    expect(listWorkloads()[0]).toEqual(result);
    expect(listAuditEntries()[0]).toMatchObject({
      outcome: "ROUTED",
      selectedEnvironment: "ON_PREM",
    });
    expect(result.executionFailure?.failedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T/,
    );
  });

  it("records a worker timeout as failed", async () => {
    vi.stubEnv("WORKER_REQUEST_TIMEOUT_MS", "5");
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
      ),
    );

    const result = await submitIncident(
      toSubmission(getDemoIncident("INC-DEMO-001")),
    );

    expect(result.executionStatus).toBe("FAILED");
    expect(result.executionFailure?.reason).toContain("timed out after 5ms");
    expect(result.decision?.selectedEnvironment).toBe("CLOUD");
  });

  it("rejects a malformed worker response safely", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ environmentId: "CLOUD" })),
    );

    const result = await submitIncident(
      toSubmission(getDemoIncident("INC-DEMO-001")),
    );

    expect(result.executionStatus).toBe("FAILED");
    expect(result.executionFailure?.reason).toContain(
      "malformed execution response",
    );
    expect(result.workerExecution).toBeNull();
  });

  it("refreshes remote worker health without changing policy availability", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        const environmentId = Object.entries(WORKER_URLS).find(
          ([, baseUrl]) => url.startsWith(baseUrl),
        )?.[0] as EnvironmentId;

        if (environmentId === "ON_PREM") {
          throw new TypeError("ECONNREFUSED");
        }

        const descriptor = getWorkerDescriptor(environmentId);
        return Response.json({
          workerName: descriptor.workerName,
          environmentId: descriptor.environmentId,
          executionMode: descriptor.executionMode,
          status: "ONLINE",
        });
      }),
    );

    await refreshWorkerHealth();

    expect(
      getEnvironments().map(({ id, online, workerStatus }) => ({
        id,
        online,
        workerStatus,
      })),
    ).toEqual([
      { id: "CLOUD", online: true, workerStatus: "ONLINE" },
      { id: "ON_PREM", online: true, workerStatus: "OFFLINE" },
      { id: "AIR_GAPPED", online: true, workerStatus: "ONLINE" },
    ]);
  });

  it("fails safely for an invalid HTTP worker mapping", async () => {
    await expect(
      dispatchIncident(
        getDemoIncident("INC-DEMO-001"),
        "UNKNOWN" as EnvironmentId,
      ),
    ).rejects.toThrow(
      "No execution worker is registered for environment: UNKNOWN.",
    );
  });
});
