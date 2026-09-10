import { describe, expect, it } from "vitest";

import { mockIncidents } from "@/data/mock-sentinel-data";
import type { Incident } from "@/features/sentinel/types";
import { handleWorkerRequest } from "@/features/sentinel/worker-service/worker-service";

function getDemoIncident(id: string): Incident {
  const incident = mockIncidents.find((candidate) => candidate.id === id);

  if (!incident) {
    throw new Error(`Missing demo incident: ${id}`);
  }

  return incident;
}

describe("worker service HTTP contract", () => {
  it("GET /health returns worker identity and status", async () => {
    const response = await handleWorkerRequest(
      new Request("http://worker.local/health"),
      "CLOUD",
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      workerName: "Sentinel Cloud Worker",
      environmentId: "CLOUD",
      executionMode: "EXTERNAL_CAPABLE",
      status: "ONLINE",
    });
  });

  it("POST /execute returns the shared deterministic analysis contract", async () => {
    const incident = getDemoIncident("INC-DEMO-003");
    const response = await handleWorkerRequest(
      new Request("http://worker.local/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(incident),
      }),
      "AIR_GAPPED",
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      environmentId: "AIR_GAPPED",
      workerName: "Sentinel Air-Gap Worker",
      executionMode: "OFFLINE",
      analysis: {
        suspectedAttackType: "Restricted Network Anomaly",
      },
    });
    expect(result.timeline).toEqual(result.analysis.timeline);
  });
});
